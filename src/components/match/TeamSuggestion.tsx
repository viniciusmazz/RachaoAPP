import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shuffle, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player, Match, Teams, PlayerPosition, Group } from "@/types/football";

const POSITION_LABELS: Record<PlayerPosition, string> = {
  goleiro: "GOL",
  zagueiro: "ZAG",
  lateral: "LAT",
  volante: "VOL",
  meia: "MEI",
  atacante: "ATA",
};
const POSITION_ORDER: PlayerPosition[] = ["goleiro", "lateral", "zagueiro", "volante", "meia", "atacante"];

const IDEAL_SLOTS: { position: PlayerPosition; count: number }[] = [
  { position: "goleiro", count: 1 },
  { position: "lateral", count: 2 },
  { position: "zagueiro", count: 1 },
  { position: "volante", count: 1 },
  { position: "meia", count: 2 },
  { position: "atacante", count: 1 },
];

const STARTERS_PER_TEAM = IDEAL_SLOTS.reduce((s, sl) => s + sl.count, 0); // 8

interface PlayerScore {
  player: Player;
  pontos: number;
  jogos: number;
  vitorias: number;
  derrotas: number;
  aproveitamento: number;
  bestPosition: PlayerPosition | null;
  bestSkill: number;
  totalSkill: number;
}

interface TeamSuggestionProps {
  players: Player[];
  matches: Match[];
  onApply: (teams: Teams) => void;
  group: Group;
}

function calculateScores(players: Player[], matches: Match[]): PlayerScore[] {
  const currentYear = new Date().getFullYear();
  const yearMatches = matches.filter(m => new Date(m.date).getFullYear() === currentYear);

  return players.map(player => {
    let pontos = 0, jogos = 0, vitorias = 0, derrotas = 0;

    yearMatches.forEach(match => {
      const inAzul = match.teams.azul.some(t => t.playerId === player.id);
      const inVermelho = match.teams.vermelho.some(t => t.playerId === player.id);
      if (!inAzul && !inVermelho) return;

      const golsAzul = match.events.filter(e => e.team === "azul").length;
      const golsVermelho = match.events.filter(e => e.team === "vermelho").length;

      let pts = 0;
      let won = false, lost = false;
      if (inAzul) {
        if (golsAzul > golsVermelho) { pts = 3; won = true; }
        else if (golsAzul === golsVermelho) { pts = 1; }
        else { lost = true; }
      } else {
        if (golsVermelho > golsAzul) { pts = 3; won = true; }
        else if (golsVermelho === golsAzul) { pts = 1; }
        else { lost = true; }
      }
      pontos += pts;
      jogos++;
      if (won) vitorias++;
      if (lost) derrotas++;
    });

    const aproveitamento = jogos > 0 ? Math.round((pontos / (jogos * 3)) * 100) : 0;

    const posSkills = player.positions || [];
    let bestPosition: PlayerPosition | null = null;
    let bestSkill = 0;
    let totalSkill = 0;
    posSkills.forEach(ps => {
      totalSkill += ps.skill;
      if (ps.skill > bestSkill) {
        bestSkill = ps.skill;
        bestPosition = ps.position;
      }
    });

    return { player, pontos, jogos, vitorias, derrotas, aproveitamento, bestPosition, bestSkill, totalSkill };
  });
}

function canPlay(player: Player, position: PlayerPosition): number {
  const ps = player.positions?.find(p => p.position === position);
  return ps ? ps.skill : 0;
}

function isGoalkeeper(player: Player): boolean {
  const gkSkill = canPlay(player, "goleiro");
  if (gkSkill === 0) return false;
  // Consider a goalkeeper if it's their best or only position
  const positions = player.positions || [];
  const bestSkill = Math.max(...positions.map(p => p.skill), 0);
  return gkSkill >= bestSkill && gkSkill > 0;
}

interface TeamEntry {
  player: Player;
  position: PlayerPosition | null;
  isStarter: boolean;
}

function suggestTeams(scores: PlayerScore[]): { azul: TeamEntry[]; vermelho: TeamEntry[] } {
  if (scores.length < 2) {
    return {
      azul: scores.map(s => ({ player: s.player, position: s.bestPosition, isStarter: true })),
      vermelho: [],
    };
  }

  // Separate goalkeepers from field players
  const goalkeepers = scores.filter(s => isGoalkeeper(s.player));
  const fieldPlayers = scores.filter(s => !isGoalkeeper(s.player));

  // Add controlled variability so "Regerar" creates new balanced combinations
  const randomizedFieldPlayers = [...fieldPlayers].sort(() => Math.random() - 0.5);

  // Sort field players by composite score (points + skill weighting)
  const sorted = randomizedFieldPlayers.sort((a, b) => {
    const scoreA = a.pontos * 2 + a.totalSkill + a.bestSkill;
    const scoreB = b.pontos * 2 + b.totalSkill + b.bestSkill;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return Math.random() - 0.5;
  });

  // Distribute goalkeepers: alternate between teams
  const gkA: PlayerScore[] = [];
  const gkB: PlayerScore[] = [];
  // Sort GKs by skill descending (with tie-break variation)
  goalkeepers.sort((a, b) => {
    const diff = canPlay(b.player, "goleiro") - canPlay(a.player, "goleiro");
    if (diff !== 0) return diff;
    return Math.random() - 0.5;
  });
  goalkeepers.forEach((gk, i) => {
    if (i % 2 === 0) gkA.push(gk);
    else gkB.push(gk);
  });

  // Serpentine distribution of field players for balance
  const teamAScores: PlayerScore[] = [];
  const teamBScores: PlayerScore[] = [];

  // Top 4 serpentine with random side start: 1st/4th vs 2nd/3rd (mirrored)
  const top4 = sorted.slice(0, Math.min(4, sorted.length));
  const rest = sorted.slice(Math.min(4, sorted.length));
  const startWithAzul = Math.random() < 0.5;

  if (startWithAzul) {
    if (top4.length >= 1) teamAScores.push(top4[0]);
    if (top4.length >= 2) teamBScores.push(top4[1]);
    if (top4.length >= 3) teamBScores.push(top4[2]);
    if (top4.length >= 4) teamAScores.push(top4[3]);
  } else {
    if (top4.length >= 1) teamBScores.push(top4[0]);
    if (top4.length >= 2) teamAScores.push(top4[1]);
    if (top4.length >= 3) teamAScores.push(top4[2]);
    if (top4.length >= 4) teamBScores.push(top4[3]);
  }

  // Remaining: greedy balance by composite score
  rest.forEach((ps) => {
    const totalA = teamAScores.reduce((s, p) => s + p.pontos * 2 + p.totalSkill, 0);
    const totalB = teamBScores.reduce((s, p) => s + p.pontos * 2 + p.totalSkill, 0);
    if (totalA <= totalB) {
      teamAScores.push(ps);
    } else {
      teamBScores.push(ps);
    }
  });

  const assignPositions = (team: PlayerScore[], teamGks: PlayerScore[]): TeamEntry[] => {
    const entries: TeamEntry[] = [];
    const assigned = new Set<string>();
    const filledSlots: Record<string, number> = {};

    // Init slot counts
    IDEAL_SLOTS.forEach(s => { filledSlots[s.position] = 0; });

    // First, assign GKs
    teamGks.forEach((gk, idx) => {
      entries.push({
        player: gk.player,
        position: "goleiro" as PlayerPosition,
        isStarter: idx === 0,
      });
      assigned.add(gk.player.id);
      filledSlots["goleiro"] = (filledSlots["goleiro"] || 0) + 1;
    });

    // Sort remaining field players by best skill descending so strongest get priority
    const fieldPlayers = team
      .filter(ps => !assigned.has(ps.player.id))
      .sort((a, b) => b.bestSkill - a.bestSkill);

    // Pass 1: assign each player to their best available position
    const unplaced: PlayerScore[] = [];
    for (const ps of fieldPlayers) {
      const sortedPositions = (ps.player.positions || [])
        .filter(p => p.position !== "goleiro")
        .sort((a, b) => b.skill - a.skill);

      let placed = false;
      for (const posSkill of sortedPositions) {
        const slotDef = IDEAL_SLOTS.find(s => s.position === posSkill.position);
        const max = slotDef ? slotDef.count : 0;
        if ((filledSlots[posSkill.position] || 0) < max) {
          entries.push({ player: ps.player, position: posSkill.position, isStarter: true });
          assigned.add(ps.player.id);
          filledSlots[posSkill.position] = (filledSlots[posSkill.position] || 0) + 1;
          placed = true;
          break;
        }
      }
      if (!placed) unplaced.push(ps);
    }

    // Pass 2: place remaining in open formation slots first, then as extras
    for (const ps of unplaced) {
      // Try to find an open slot the player can play (any skill > 0)
      let placed = false;
      const openSlots = IDEAL_SLOTS.filter(s => s.position !== "goleiro" && (filledSlots[s.position] || 0) < s.count);
      // Sort open slots by the player's skill in that position (descending)
      const rankedOpenSlots = openSlots
        .map(s => ({ position: s.position, skill: canPlay(ps.player, s.position) }))
        .sort((a, b) => b.skill - a.skill);

      for (const slot of rankedOpenSlots) {
        entries.push({ player: ps.player, position: slot.position, isStarter: true });
        assigned.add(ps.player.id);
        filledSlots[slot.position] = (filledSlots[slot.position] || 0) + 1;
        placed = true;
        break;
      }

      if (!placed) {
        // All formation slots full — assign best position as extra
        const bestPos = (ps.player.positions || [])
          .filter(p => p.position !== "goleiro")
          .sort((a, b) => b.skill - a.skill)[0];
        entries.push({
          player: ps.player,
          position: bestPos ? bestPos.position : ps.bestPosition,
          isStarter: true,
        });
        assigned.add(ps.player.id);
      }
    }

    // Sort by position order (and by skill inside same position)
    const sortedEntries = entries.sort((a, b) => {
      const idxA = a.position ? POSITION_ORDER.indexOf(a.position) : 99;
      const idxB = b.position ? POSITION_ORDER.indexOf(b.position) : 99;
      if (idxA !== idxB) return idxA - idxB;
      if (a.position && b.position && a.position === b.position) {
        return canPlay(b.player, b.position) - canPlay(a.player, a.position);
      }
      return a.player.name.localeCompare(b.player.name);
    });

    // Mark starters by formation quotas (prevents 3 LTs and missing ST among titulares)
    const starterIndices = new Set<number>();

    for (const slot of IDEAL_SLOTS) {
      const candidates = sortedEntries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry, index }) => entry.position === slot.position && !starterIndices.has(index))
        .sort((a, b) => canPlay(b.entry.player, slot.position) - canPlay(a.entry.player, slot.position));

      candidates.slice(0, slot.count).forEach(({ index }) => starterIndices.add(index));
    }

    const desiredStarters = Math.min(STARTERS_PER_TEAM, sortedEntries.length);
    if (starterIndices.size < desiredStarters) {
      const remaining = sortedEntries
        .map((entry, index) => ({
          entry,
          index,
          best: Math.max(...(entry.player.positions || []).map(p => p.skill), 0),
        }))
        .filter(({ index }) => !starterIndices.has(index))
        .sort((a, b) => b.best - a.best);

      for (const item of remaining) {
        if (starterIndices.size >= desiredStarters) break;
        starterIndices.add(item.index);
      }
    }

    return sortedEntries.map((entry, index) => ({
      ...entry,
      isStarter: starterIndices.has(index),
    }));
  };

  return {
    azul: assignPositions(teamAScores, gkA),
    vermelho: assignPositions(teamBScores, gkB),
  };
}

export default function TeamSuggestion({ players, matches, onApply, group }: TeamSuggestionProps) {
  const homeConfig = group.settings.sides.home;
  const awayConfig = group.settings.sides.away;
  const mensalistas = useMemo(() => players.filter(p => p.type === "mensalista"), [players]);
  
  const storageKey = `football:presence:${group.id}`;
  
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out IDs that might no longer exist in mensalistas
        const validIds = parsed.filter((id: string) => mensalistas.some(p => p.id === id));
        setPresentIds(validIds);
      } catch (e) {
        console.error("Error parsing presence data", e);
      }
    }
  }, [storageKey, mensalistas]);

  // Save to localStorage when presentIds changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(presentIds));
  }, [presentIds, storageKey]);

  const togglePresence = (id: string) => {
    setPresentIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(pId => pId !== id);
      } else {
        return [...prev, id];
      }
    });
    setGenerated(false);
  };

  const selectAll = () => {
    setPresentIds(mensalistas.map(p => p.id));
    setGenerated(false);
  };

  const selectNone = () => {
    setPresentIds([]);
    setGenerated(false);
  };

  const [suggestion, setSuggestion] = useState<{ azul: TeamEntry[]; vermelho: TeamEntry[] }>({ azul: [], vermelho: [] });

  const displayPlayers = useMemo(() => {
    const present = presentIds
      .map(id => mensalistas.find(p => p.id === id))
      .filter(Boolean) as Player[];
    
    const absent = mensalistas
      .filter(p => !presentIds.includes(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
      
    return [...present, ...absent];
  }, [presentIds, mensalistas]);

  const handleGenerate = () => {
    const presentPlayers = presentIds.map(id => mensalistas.find(p => p.id === id)).filter(Boolean) as Player[];
    const currentScores = calculateScores(presentPlayers, matches);
    setSuggestion(suggestTeams(currentScores));
    setGenerated(true);
  };

  const handleApply = () => {
    const teams: Teams = {
      azul: suggestion.azul.map(s => ({
        playerId: s.player.id,
        isGoalkeeper: s.position === "goleiro",
      })),
      vermelho: suggestion.vermelho.map(s => ({
        playerId: s.player.id,
        isGoalkeeper: s.position === "goleiro",
      })),
    };
    onApply(teams);
  };

  if (mensalistas.length < 4) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          É necessário pelo menos 4 mensalistas cadastrados para sugerir escalação.
        </CardContent>
      </Card>
    );
  }

  const renderPlayerPositions = (player: Player) => {
    const positions = player.positions || [];
    if (positions.length === 0) return null;
    return (
      <div className="flex gap-1 flex-wrap">
        {positions
          .sort((a, b) => b.skill - a.skill)
          .map(ps => (
            <Badge key={ps.position} variant="outline" className="text-[10px] px-1 py-0 leading-tight">
              {POSITION_LABELS[ps.position]}
            </Badge>
          ))}
      </div>
    );
  };

  const renderTeamList = (team: TeamEntry[], colorClass: string, label: string) => {
    const starters = team.filter(e => e.isStarter);
    const reserves = team.filter(e => !e.isStarter);

    return (
      <Card className={`border-l-4 ${colorClass}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{label} ({team.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Titulares ({starters.length})</p>
            {starters.map((entry, idx) => (
              <div key={entry.player.id} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5">#{idx + 1}</span>
                  <span className="text-sm font-medium">{entry.player.name}</span>
                </div>
                {entry.position && (
                  <Badge variant="outline" className="text-xs">{POSITION_LABELS[entry.position]}</Badge>
                )}
              </div>
            ))}
          </div>
          {reserves.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reservas ({reserves.length})</p>
              {reserves.map((entry) => (
                <div key={entry.player.id} className="flex items-center justify-between rounded-md border border-dashed p-2 opacity-75">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">R</span>
                    <span className="text-sm">{entry.player.name}</span>
                  </div>
                  {entry.position && (
                    <Badge variant="secondary" className="text-xs">{POSITION_LABELS[entry.position]}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Attendance confirmation */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Confirmar Presença ({presentIds.length}/{mensalistas.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>Todos</Button>
              <Button variant="ghost" size="sm" onClick={selectNone}>Nenhum</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {displayPlayers.map(p => {
              const arrivalIndex = presentIds.indexOf(p.id);
              const isPresent = arrivalIndex !== -1;
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent/50 transition-all",
                    isPresent ? "border-primary/50 bg-primary/5 shadow-sm" : "border-slate-100"
                  )}
                >
                  <Checkbox
                    checked={isPresent}
                    onCheckedChange={() => togglePresence(p.id)}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate font-medium">{p.name}</span>
                      {isPresent && (
                        <span className="text-[10px] bg-primary text-white px-1.5 rounded-full font-bold">
                          {arrivalIndex + 1}º
                        </span>
                      )}
                    </div>
                    {renderPlayerPositions(p)}
                  </div>
                </label>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-4 italic">
            * A ordem numérica indica a ordem de chegada (importante para critérios de desempate no sorteio).
          </p>
        </CardContent>
      </Card>

      {/* Generate / Apply */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Sugestão de Escalação</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                variant="outline"
                className="flex items-center gap-2"
                disabled={presentIds.length < 4}
              >
                <Shuffle className="h-4 w-4" />
                {generated ? "Regerar" : "Gerar Escalação"}
              </Button>
              {generated && (
                <Button onClick={handleApply} className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Aplicar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {!generated && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {presentIds.length < 4
                ? "Selecione pelo menos 4 jogadores presentes para gerar a escalação."
                : "Gera escalação equilibrada com os jogadores presentes, considerando pontuação, aproveitamento e habilidade por posição. Goleiros são distribuídos entre os times. Formação ideal: 1 GOL, 2 LAT, 1 ZAG, 1 VOL, 2 MEI, 1 ATA."}
            </p>
          </CardContent>
        )}
      </Card>

      {generated && (
        <div className="grid gap-4 md:grid-cols-2">
          {renderTeamList(suggestion.azul, `border-l-[${homeConfig.color}]`, homeConfig.name)}
          {renderTeamList(suggestion.vermelho, `border-l-[${awayConfig.color}]`, awayConfig.name)}
        </div>
      )}
    </div>
  );
}
