import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, TrendingUp, TrendingDown, Target, Shield, AlertTriangle, Crosshair, Award, ThumbsDown, Star, Users } from "lucide-react";
import type { Match, Player, TeamSide, Group } from "@/types/football";

interface SeasonSummaryProps {
  matches: Match[];
  players: Player[];
  selectedYear: number;
  group: Group;
}

interface SummaryItem {
  label: string;
  playerName: string;
  value: string;
  icon: React.ElementType;
}

interface TeamColorStats {
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  aproveitamento: number;
  golsPro: number;
  golsContra: number;
}

export default function SeasonSummary({ matches, players, selectedYear, group }: SeasonSummaryProps) {
  const homeConfig = group.settings.sides.home;
  const awayConfig = group.settings.sides.away;
  // Team color stats
  const teamStats = useMemo((): Record<TeamSide, TeamColorStats> => {
    const stats: Record<TeamSide, TeamColorStats> = {
      azul: { jogos: 0, vitorias: 0, empates: 0, derrotas: 0, aproveitamento: 0, golsPro: 0, golsContra: 0 },
      vermelho: { jogos: 0, vitorias: 0, empates: 0, derrotas: 0, aproveitamento: 0, golsPro: 0, golsContra: 0 },
    };

    matches.forEach(match => {
      const hasEvents = match.events && match.events.length > 0;
      // Calculate score
      const golsAzul = hasEvents 
        ? match.events.filter(e => e.team === 'azul').length
        : (match.teams.azul || []).reduce((sum, p) => sum + (p.goals || 0), 0) + 
          (match.teams.vermelho || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);
      const golsVermelho = hasEvents
        ? match.events.filter(e => e.team === 'vermelho').length
        : (match.teams.vermelho || []).reduce((sum, p) => sum + (p.goals || 0), 0) + 
          (match.teams.azul || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);

      stats.azul.jogos++;
      stats.azul.golsPro += golsAzul;
      stats.azul.golsContra += golsVermelho;
      stats.vermelho.jogos++;
      stats.vermelho.golsPro += golsVermelho;
      stats.vermelho.golsContra += golsAzul;

      if (golsAzul > golsVermelho) {
        stats.azul.vitorias++;
        stats.vermelho.derrotas++;
      } else if (golsVermelho > golsAzul) {
        stats.vermelho.vitorias++;
        stats.azul.derrotas++;
      } else {
        stats.azul.empates++;
        stats.vermelho.empates++;
      }
    });

    // Calc aproveitamento
    for (const side of ["azul", "vermelho"] as TeamSide[]) {
      const s = stats[side];
      if (s.jogos > 0) {
        s.aproveitamento = ((s.vitorias * 3 + s.empates) / (s.jogos * 3)) * 100;
      }
    }

    return stats;
  }, [matches]);

  const summaryItems = useMemo((): SummaryItem[] => {
    const nameById = (id: string) => players.find((p) => p.id === id)?.name ?? "—";
    const isMensalista = (id: string) => players.find((p) => p.id === id)?.type === "mensalista";

    if (matches.length === 0) return [];

    // Build stats per player
    const stats = new Map<string, {
      jogos: number; vitorias: number; derrotas: number; empates: number;
      pontos: number; gols: number; assistencias: number; fieldGoals: number;
      ownGoals: number; participacoes: number;
    }>();

    const gkStats = new Map<string, { sofridos: number; jogos: number }>();

    const ensure = (id: string) => {
      if (!stats.has(id)) {
        stats.set(id, { jogos: 0, vitorias: 0, derrotas: 0, empates: 0, pontos: 0, gols: 0, assistencias: 0, fieldGoals: 0, ownGoals: 0, participacoes: 0 });
      }
      return stats.get(id)!;
    };

    matches.forEach(match => {
      const hasEvents = match.events && match.events.length > 0;
      // Calculate score
      const golsAzul = hasEvents 
        ? match.events.filter(e => e.team === 'azul').length
        : (match.teams.azul || []).reduce((sum, p) => sum + (p.goals || 0), 0) + 
          (match.teams.vermelho || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);
      const golsVermelho = hasEvents
        ? match.events.filter(e => e.team === 'vermelho').length
        : (match.teams.vermelho || []).reduce((sum, p) => sum + (p.goals || 0), 0) + 
          (match.teams.azul || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);

      let azulResult: "v" | "e" | "d" = "e";
      let vermelhoResult: "v" | "e" | "d" = "e";
      if (golsAzul > golsVermelho) { azulResult = "v"; vermelhoResult = "d"; }
      else if (golsVermelho > golsAzul) { vermelhoResult = "v"; azulResult = "d"; }

      const processTeam = (team: typeof match.teams.azul, result: "v" | "e" | "d", goalsAgainst: number) => {
        team.forEach(t => {
          if (!isMensalista(t.playerId)) return;
          const s = ensure(t.playerId);
          s.jogos++;
          s.fieldGoals += t.fieldGoals || 0;
          if (result === "v") { s.vitorias++; s.pontos += 3; }
          else if (result === "e") { s.empates++; s.pontos += 1; }
          else { s.derrotas++; }

          if (t.isGoalkeeper) {
            if (!gkStats.has(t.playerId)) gkStats.set(t.playerId, { sofridos: 0, jogos: 0 });
            const gk = gkStats.get(t.playerId)!;
            gk.jogos++;
            gk.sofridos += goalsAgainst;
          }
        });
      };

      processTeam(match.teams.azul, azulResult, golsVermelho);
      processTeam(match.teams.vermelho, vermelhoResult, golsAzul);

      // Count goals and assists
      if (hasEvents) {
        match.events.forEach(e => {
          if (!isMensalista(e.scorerId)) return;
          const s = ensure(e.scorerId);
          if (e.isOwnGoal) {
            s.ownGoals++;
          } else if (!e.isDummyGoal) {
            s.gols++;
            s.participacoes++;
          }
        });
        match.events.forEach(e => {
          if (e.assistId && isMensalista(e.assistId)) {
            const s = ensure(e.assistId);
            s.assistencias++;
            s.participacoes++;
          }
          if (e.extraAssistIds && e.extraAssistIds.length > 0) {
            e.extraAssistIds.forEach(id => {
              if (isMensalista(id)) {
                const s = ensure(id);
                s.assistencias++;
                s.participacoes++;
              }
            });
          }
        });
      } else {
        match.teams.azul.forEach(p => {
          if (!isMensalista(p.playerId)) return;
          const s = ensure(p.playerId);
          s.gols += p.goals || 0;
          s.assistencias += p.assists || 0;
          s.ownGoals += p.ownGoals || 0;
          s.participacoes += (p.goals || 0) + (p.assists || 0);
        });
        match.teams.vermelho.forEach(p => {
          if (!isMensalista(p.playerId)) return;
          const s = ensure(p.playerId);
          s.gols += p.goals || 0;
          s.assistencias += p.assists || 0;
          s.ownGoals += p.ownGoals || 0;
          s.participacoes += (p.goals || 0) + (p.assists || 0);
        });
      }
    });

    const entries = Array.from(stats.entries()).filter(([, s]) => s.jogos > 0);
    if (entries.length === 0) return [];

    const items: SummaryItem[] = [];

    const maisVitorias = entries.sort((a, b) => b[1].vitorias - a[1].vitorias)[0];
    items.push({ label: "Mais Vitórias", playerName: nameById(maisVitorias[0]), value: `${maisVitorias[1].vitorias}`, icon: Trophy });

    const maisDerrotas = entries.sort((a, b) => b[1].derrotas - a[1].derrotas)[0];
    items.push({ label: "Mais Derrotas", playerName: nameById(maisDerrotas[0]), value: `${maisDerrotas[1].derrotas}`, icon: ThumbsDown });

    const melhorAprov = entries.sort((a, b) => {
      const aAprov = a[1].pontos / (a[1].jogos * 3) * 100;
      const bAprov = b[1].pontos / (b[1].jogos * 3) * 100;
      return bAprov - aAprov;
    })[0];
    const melhorAprovVal = (melhorAprov[1].pontos / (melhorAprov[1].jogos * 3) * 100).toFixed(1);
    items.push({ label: "Melhor Aproveitamento", playerName: nameById(melhorAprov[0]), value: `${melhorAprovVal}%`, icon: TrendingUp });

    const piorAprov = entries.sort((a, b) => {
      const aAprov = a[1].pontos / (a[1].jogos * 3) * 100;
      const bAprov = b[1].pontos / (b[1].jogos * 3) * 100;
      return aAprov - bAprov;
    })[0];
    const piorAprovVal = (piorAprov[1].pontos / (piorAprov[1].jogos * 3) * 100).toFixed(1);
    items.push({ label: "Pior Aproveitamento", playerName: nameById(piorAprov[0]), value: `${piorAprovVal}%`, icon: TrendingDown });

    const liderPontos = entries.sort((a, b) => b[1].pontos - a[1].pontos)[0];
    items.push({ label: "Líder em Pontos", playerName: nameById(liderPontos[0]), value: `${liderPontos[1].pontos} pts`, icon: Star });

    const artilheiro = entries.filter(([, s]) => s.gols > 0).sort((a, b) => b[1].gols - a[1].gols)[0];
    if (artilheiro) {
      items.push({ label: "Artilheiro", playerName: nameById(artilheiro[0]), value: `${artilheiro[1].gols} gols`, icon: Target });
    }

    const liderAssist = entries.filter(([, s]) => s.assistencias > 0).sort((a, b) => b[1].assistencias - a[1].assistencias)[0];
    if (liderAssist) {
      items.push({ label: "Líder de Assistências", playerName: nameById(liderAssist[0]), value: `${liderAssist[1].assistencias}`, icon: Award });
    }

    const liderParticipacoes = entries.filter(([, s]) => s.participacoes > 0).sort((a, b) => b[1].participacoes - a[1].participacoes)[0];
    if (liderParticipacoes) {
      items.push({ label: "Mais Participações em Gols", playerName: nameById(liderParticipacoes[0]), value: `${liderParticipacoes[1].participacoes}`, icon: Users });
    }

    const liderFG = entries.filter(([, s]) => s.fieldGoals > 0).sort((a, b) => b[1].fieldGoals - a[1].fieldGoals)[0];
    if (liderFG) {
      items.push({ label: "Mais Field Goals", playerName: nameById(liderFG[0]), value: `${liderFG[1].fieldGoals}`, icon: Crosshair });
    }

    const gkEntries = Array.from(gkStats.entries());
    if (gkEntries.length > 0) {
      const melhorGK = gkEntries.sort((a, b) => {
        const aMedia = a[1].sofridos / a[1].jogos;
        const bMedia = b[1].sofridos / b[1].jogos;
        return aMedia - bMedia;
      })[0];
      const media = (melhorGK[1].sofridos / melhorGK[1].jogos).toFixed(2);
      items.push({ label: "Goleiro Menos Vazado", playerName: nameById(melhorGK[0]), value: `${media}/jogo`, icon: Shield });
    }

    const liderOG = entries.filter(([, s]) => s.ownGoals > 0).sort((a, b) => b[1].ownGoals - a[1].ownGoals)[0];
    if (liderOG) {
      items.push({ label: "Líder em Gols Contra", playerName: nameById(liderOG[0]), value: `${liderOG[1].ownGoals}`, icon: AlertTriangle });
    }

    return items;
  }, [matches, players]);

  if (summaryItems.length === 0 && matches.length === 0) {
    return null;
  }

  // TeamColorCard removed — replaced by inline bar below

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-foreground">📊 Resumo da Temporada {selectedYear}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {summaryItems.map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center p-4 rounded-2xl bg-muted/30 border border-muted hover:bg-muted/50 transition-all group">
                <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-2">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</span>
                <span className="text-sm font-black text-foreground truncate w-full">{item.playerName}</span>
                <span className="text-xs text-primary font-bold mt-1">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Team color bar */}
          {teamStats.azul.jogos > 0 && (() => {
            const total = teamStats.azul.jogos;
            const blueWins = teamStats.azul.vitorias;
            const redWins = teamStats.vermelho.vitorias;
            const draws = teamStats.azul.empates;
            const bluePct = Math.round((blueWins / total) * 100);
            const redPct = Math.round((redWins / total) * 100);
            const drawPct = 100 - bluePct - redPct;
            return (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-full cursor-pointer rounded-2xl p-5 bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all shadow-md group relative overflow-hidden border border-slate-200">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                      <Trophy className="h-16 w-16 text-slate-900" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-end mb-4">
                        <div className="text-left">
                          <h4 className="text-lg font-black italic">Performance por Time</h4>
                        </div>
                        <div className="text-right text-xs font-bold text-slate-500">
                          {total} Partidas Disputadas
                        </div>
                      </div>

                      <div className="flex justify-between text-xs font-black mb-2 px-1">
                        <span style={{ color: homeConfig.color }}>{homeConfig.name.toUpperCase()} {bluePct}%</span>
                        {draws > 0 && <span className="text-slate-500">EMPATES {drawPct}%</span>}
                        <span style={{ color: awayConfig.color }}>{awayConfig.name.toUpperCase()} {redPct}%</span>
                      </div>
                      
                      <div className="flex h-3 rounded-full overflow-hidden bg-slate-300">
                        <div className="transition-all duration-500 ease-out" style={{ width: `${bluePct}%`, backgroundColor: homeConfig.color }} />
                        {draws > 0 && <div className="bg-slate-400 transition-all duration-500 ease-out" style={{ width: `${drawPct}%` }} />}
                        <div className="transition-all duration-500 ease-out" style={{ width: `${redPct}%`, backgroundColor: awayConfig.color }} />
                      </div>
                      
                      <div className="flex justify-between text-[10px] mt-3 font-bold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: homeConfig.color }} />
                          {blueWins}V {teamStats.azul.empates}E {teamStats.azul.derrotas}D
                        </span>
                        <span className="flex items-center gap-1.5">
                          {redWins}V {teamStats.vermelho.empates}E {teamStats.vermelho.derrotas}D
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: awayConfig.color }} />
                        </span>
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg w-full">
                  <DialogHeader>
                    <DialogTitle>Desempenho por Cor</DialogTitle>
                  </DialogHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-center">V</TableHead>
                        <TableHead className="text-center">E</TableHead>
                        <TableHead className="text-center">D</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-center">GP</TableHead>
                        <TableHead className="text-center">GC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(["azul", "vermelho"] as TeamSide[]).map(ts => {
                        const t = teamStats[ts];
                        const config = ts === "azul" ? homeConfig : awayConfig;
                        return (
                          <TableRow key={ts}>
                            <TableCell className="font-medium">
                              <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: config.color }} />
                              {config.name}
                            </TableCell>
                            <TableCell className="text-center">{t.vitorias}</TableCell>
                            <TableCell className="text-center">{t.empates}</TableCell>
                            <TableCell className="text-center">{t.derrotas}</TableCell>
                            <TableCell className="text-center font-bold">{Math.round(t.aproveitamento)}%</TableCell>
                            <TableCell className="text-center">{t.golsPro}</TableCell>
                            <TableCell className="text-center">{t.golsContra}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </DialogContent>
              </Dialog>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}
