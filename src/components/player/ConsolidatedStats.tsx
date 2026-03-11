import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Trophy, Target, Award, Star, Users, RefreshCw, Calendar } from "lucide-react";
import type { Match, Player, Group } from "@/types/football";

interface GroupStats {
  groupId: string;
  groupName: string;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols: number;
  assistencias: number;
  aproveitamento: number;
  playerNames: string[];
}

export default function ConsolidatedStats({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GroupStats[]>([]);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);

  const fetchAllStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Fetch all groups where the user is a member or owner
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, settings, owner_id');
      
      if (groupsError) throw groupsError;

      // Filter groups where user has a role or is owner
      const userGroups = (groupsData || []).filter(g => {
        const settings = g.settings as { roles?: Record<string, string>; playerLinks?: Record<string, string | string[]> };
        const roles = settings?.roles || {};
        return roles[userId] || g.owner_id === userId;
      });

      if (userGroups.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      const groupIds = Array.from(new Set(userGroups.map(g => g.id)));
      const groupNames = new Map(userGroups.map(g => [g.id, g.name]));

      // 2. Determine the linked player ID for each group
      const playerIdsByGroup = new Map<string, string[]>();
      const playerNamesByGroup = new Map<string, string[]>();

      // Fetch all players in these groups to get their names and check user_id
      const { data: playersInGroups, error: playersError } = await supabase
        .from('players')
        .select('id, name, group_id, user_id')
        .in('group_id', groupIds);

      if (playersError) throw playersError;

      const playersMap = new Map<string, any[]>();
      playersInGroups?.forEach(p => {
        const groupPlayers = playersMap.get(p.group_id) || [];
        groupPlayers.push(p);
        playersMap.set(p.group_id, groupPlayers);
      });

      // For each group, determine the correct linked player(s)
      userGroups.forEach(group => {
        const settings = group.settings as { roles?: Record<string, string>; playerLinks?: Record<string, string | string[]> } | null;
        const playerLinks = settings?.playerLinks || {};
        const linkedIdFromSettings = playerLinks[userId];
        
        let finalPlayerIds: string[] = [];
        const groupPlayers = playersMap.get(group.id) || [];

        if (linkedIdFromSettings) {
          // If settings has a link, it's the source of truth (Master Link)
          if (Array.isArray(linkedIdFromSettings)) {
            finalPlayerIds = linkedIdFromSettings;
          } else if (typeof linkedIdFromSettings === 'string') {
            finalPlayerIds = [linkedIdFromSettings];
          }
        } else {
          // Fallback to players table user_id
          finalPlayerIds = groupPlayers
            .filter(p => p.user_id === userId)
            .map(p => p.id);
        }

        if (finalPlayerIds.length > 0) {
          playerIdsByGroup.set(group.id, finalPlayerIds);
          const names = groupPlayers
            .filter(p => finalPlayerIds.includes(p.id))
            .map(p => p.name);
          playerNamesByGroup.set(group.id, names);
        }
      });

      // 3. Fetch matches for all these groups
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .in('group_id', groupIds);
      
      if (matchesError) throw matchesError;

      // Update available years based on all matches found
      const years = new Set<number>();
      years.add(currentYear);
      matchesData?.forEach(m => {
        years.add(new Date(m.date).getFullYear());
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));

      // 4. Calculate stats per group
      const consolidated: GroupStats[] = Array.from(playerIdsByGroup.entries()).map(([groupId, playerIds]) => {
        // Filter matches by group AND year
        const groupMatches = (matchesData || [])
          .filter(m => m.group_id === groupId && new Date(m.date).getFullYear() === selectedYear) as unknown as Match[];
        
        let jogos = 0, vitorias = 0, empates = 0, derrotas = 0, gols = 0, assistencias = 0;
        const processedMatchIds = new Set<string>();

        groupMatches.forEach(match => {
          if (processedMatchIds.has(match.id)) return;
          processedMatchIds.add(match.id);

          const azulGoals = match.events.filter(e => e.team === "azul").length;
          const vermelhoGoals = match.events.filter(e => e.team === "vermelho").length;

          // Find all instances of the user's linked players in this match
          const playerInAzul = match.teams.azul.filter(t => playerIds.includes(t.playerId));
          const playerInVermelho = match.teams.vermelho.filter(t => playerIds.includes(t.playerId));

          if (playerInAzul.length > 0 || playerInVermelho.length > 0) {
            jogos++;
            
            // Sum goals and assists from ALL matching entries for this user in this match
            playerInAzul.forEach(p => {
              gols += p.goals || 0;
              assistencias += p.assists || 0;
            });
            playerInVermelho.forEach(p => {
              gols += p.goals || 0;
              assistencias += p.assists || 0;
            });

            // Determine result
            const wonAzul = azulGoals > vermelhoGoals;
            const wonVermelho = vermelhoGoals > azulGoals;
            const isDraw = azulGoals === vermelhoGoals;

            if ((playerInAzul.length > 0 && wonAzul) || (playerInVermelho.length > 0 && wonVermelho)) {
              vitorias++;
            } else if (isDraw) {
              empates++;
            } else {
              derrotas++;
            }
          }
        });

        const aproveitamento = jogos > 0 ? ((vitorias * 3 + empates) / (jogos * 3)) * 100 : 0;

        return {
          groupId,
          groupName: groupNames.get(groupId) || "Grupo Desconhecido",
          jogos,
          vitorias,
          empates,
          derrotas,
          gols,
          assistencias,
          aproveitamento,
          playerNames: playerNamesByGroup.get(groupId) || []
        };
      });

      setStats(consolidated.filter(s => s.jogos > 0));
    } catch (error) {
      console.error('Error fetching consolidated stats:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedYear, currentYear]);

  useEffect(() => {
    fetchAllStats();
  }, [fetchAllStats]);

  const totals = useMemo(() => {
    return stats.reduce((acc, curr) => ({
      jogos: acc.jogos + curr.jogos,
      vitorias: acc.vitorias + curr.vitorias,
      empates: acc.empates + curr.empates,
      derrotas: acc.derrotas + curr.derrotas,
      gols: acc.gols + curr.gols,
      assistencias: acc.assistencias + curr.assistencias,
    }), { jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols: 0, assistencias: 0 });
  }, [stats]);

  const totalAproveitamento = totals.jogos > 0 
    ? ((totals.vitorias * 3 + totals.empates) / (totals.jogos * 3)) * 100 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Minhas Estatísticas
          </h1>
          <p className="text-slate-500 font-medium mt-1">Consolidado de todos os seus grupos</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-2xl px-4 py-2 border border-slate-200 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400 mr-3" />
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer pr-2"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <Button 
            variant="outline" 
            size="icon"
            onClick={() => fetchAllStats()}
            className="rounded-2xl h-10 w-10 border-slate-200 shadow-sm"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-600", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {stats.length === 0 ? (
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-10 w-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Nenhum dado em {selectedYear}</h3>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">
              Você ainda não disputou partidas nos grupos vinculados durante este ano.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Star className="h-32 w-32 rotate-12" />
              </div>
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 block mb-6">Performance Geral</span>
                <div className="flex items-baseline gap-4 mb-8">
                  <span className="text-7xl font-black italic tracking-tighter">{(totals.gols + totals.assistencias)}</span>
                  <div className="flex flex-col">
                    <span className="text-xl font-black uppercase italic leading-none">Participações</span>
                    <span className="text-sm font-bold text-slate-400 uppercase italic">em gols</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Gols Marcados</span>
                    <span className="text-2xl font-black">{totals.gols}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Assistências</span>
                    <span className="text-2xl font-black">{totals.assistencias}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 block mb-6">Aproveitamento</span>
                <div className="text-6xl font-black italic tracking-tighter mb-2">{totalAproveitamento.toFixed(0)}%</div>
                <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Taxa de Vitórias</p>
              </div>
              <div className="space-y-2 mt-8">
                <div className="flex justify-between text-xs font-bold">
                  <span>{totals.vitorias} Vitórias</span>
                  <span className="text-white/50">{totals.jogos} Jogos</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-1000" style={{ width: `${totalAproveitamento}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center">
              <Users className="h-5 w-5 text-slate-400 mx-auto mb-3" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Partidas</span>
              <span className="text-2xl font-black text-slate-900">{totals.jogos}</span>
            </div>
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center">
              <Target className="h-5 w-5 text-emerald-500 mx-auto mb-3" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Média Gols</span>
              <span className="text-2xl font-black text-slate-900">{(totals.gols / (totals.jogos || 1)).toFixed(2)}</span>
            </div>
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center">
              <Award className="h-5 w-5 text-blue-500 mx-auto mb-3" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Média Assist</span>
              <span className="text-2xl font-black text-slate-900">{(totals.assistencias / (totals.jogos || 1)).toFixed(2)}</span>
            </div>
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center">
              <RefreshCw className="h-5 w-5 text-primary mx-auto mb-3" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Empates</span>
              <span className="text-2xl font-black text-slate-900">{totals.empates}</span>
            </div>
          </div>

          {/* Group Table */}
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Desempenho por Grupo
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="px-8 font-black text-slate-900 uppercase text-[10px] tracking-widest">Grupo</TableHead>
                    <TableHead className="text-center font-black text-slate-900 uppercase text-[10px] tracking-widest">Jogos</TableHead>
                    <TableHead className="text-center font-black text-slate-900 uppercase text-[10px] tracking-widest">Gols</TableHead>
                    <TableHead className="text-center font-black text-slate-900 uppercase text-[10px] tracking-widest">Assists</TableHead>
                    <TableHead className="text-center font-black text-slate-900 uppercase text-[10px] tracking-widest">V/E/D</TableHead>
                    <TableHead className="px-8 text-right font-black text-slate-900 uppercase text-[10px] tracking-widest">Aprov.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((s) => (
                    <TableRow key={s.groupId} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-8 py-4">
                        <div className="font-bold text-slate-900">{s.groupName}</div>
                        <div className="text-[10px] text-primary font-black uppercase tracking-tight">
                          {s.playerNames.join(', ')}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                          ID: {s.groupId.substring(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-600">{s.jogos}</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{s.gols}</TableCell>
                      <TableCell className="text-center font-black text-blue-600">{s.assistencias}</TableCell>
                      <TableCell className="text-center font-bold text-slate-400 text-[10px]">
                        {s.vitorias}V / {s.empates}E / {s.derrotas}D
                      </TableCell>
                      <TableCell className="px-8 text-right">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-black text-xs">
                          {s.aproveitamento.toFixed(0)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
