import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, FileImage, Calendar, Trash2, Download } from "lucide-react";
import { toPng } from "html-to-image";
import EditMatchDialog from "./EditMatchDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";
import type { Match, Player, MatchEvent, Group } from "@/types/football";

interface MatchHistoryProps {
  matches: Match[];
  players: Player[];
  onMatchUpdate?: (matchId: string, updatedMatch: Omit<Match, 'id'>) => Promise<void>;
  onMatchDelete?: (matchId: string) => Promise<void>;
  group: Group;
}

export default function MatchHistory({ matches, players, onMatchUpdate, onMatchDelete, group }: MatchHistoryProps) {
  const homeConfig = group.settings.sides.home;
  const awayConfig = group.settings.sides.away;
  const { isAuthenticated } = useAuth();
  const { isAdmin } = useUserRole(group.id);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Extrair anos disponíveis das partidas
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    matches.forEach(m => {
      const year = new Date(m.date).getFullYear();
      years.add(year);
    });
    // Sempre incluir o ano atual
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [matches, currentYear]);

  // Filtrar partidas pelo ano selecionado
  const filteredMatches = useMemo(() => {
    return matches.filter(m => new Date(m.date).getFullYear() === selectedYear);
  }, [matches, selectedYear]);

  const getPlayerName = (id: string) => 
    players.find(p => p.id === id)?.name || "Jogador não encontrado";

  const getPlayerPhoto = (id: string) => 
    players.find(p => p.id === id)?.photoUrl;

  const getMatchStats = (match: Match) => {
    let goals = 0;
    let assists = 0;

    if (match.events && match.events.length > 0) {
      match.events.forEach(e => {
        if (!e.isOwnGoal && !e.isDummyGoal) {
          goals++;
        }
        if (e.assistId) assists++;
        if (e.extraAssistIds) assists += e.extraAssistIds.length;
      });
    } else {
      // Fallback to team assignments if events are missing
      match.teams.azul.forEach(p => {
        goals += (p.goals || 0);
        assists += (p.assists || 0);
      });
      match.teams.vermelho.forEach(p => {
        goals += (p.goals || 0);
        assists += (p.assists || 0);
      });
    }
    return { goals, assists };
  };

  const getMatchResult = (match: Match) => {
    const hasEvents = match.events && match.events.length > 0;
    if (hasEvents) {
      const azulGoals = match.events.filter(e => e.team === "azul" && !e.isOwnGoal && !e.isDummyGoal).length;
      const vermelhoGoals = match.events.filter(e => e.team === "vermelho" && !e.isOwnGoal && !e.isDummyGoal).length;
      return { azul: azulGoals, vermelho: vermelhoGoals };
    }
    const azul = (match.teams.azul || []).reduce((sum, p) => sum + (p.goals || 0), 0) + 
                 (match.teams.vermelho || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);
    const vermelho = (match.teams.vermelho || []).reduce((sum, p) => sum + (p.goals || 0), 0) + 
                     (match.teams.azul || []).reduce((sum, p) => sum + (p.ownGoals || 0), 0);
    return { azul, vermelho };
  };

  const handleViewReport = async (reportPath: string) => {
    try {
      const { data } = await supabase.storage
        .from('match-reports')
        .createSignedUrl(reportPath, 3600); // URL válida por 1 hora
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Erro ao visualizar súmula:', error);
    }
  };

  const handleDeleteClick = (match: Match) => {
    setMatchToDelete(match);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!matchToDelete || !onMatchDelete) return;
    
    setDeleting(true);
    try {
      await onMatchDelete(matchToDelete.id);
      toast({
        title: "Sucesso",
        description: "Partida excluída com sucesso"
      });
      setDeleteDialogOpen(false);
      setMatchToDelete(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a partida",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportImage = useCallback(async (node: HTMLElement | null, matchDate: Date) => {
    if (!node) return;
    try {
      // Show the hidden date element for export
      const dateEl = node.querySelector('[data-export-date]') as HTMLElement;
      if (dateEl) dateEl.classList.remove('hidden');

      const style = getComputedStyle(document.documentElement);
      const bg = style.getPropertyValue('--background').trim();
      const dataUrl = await toPng(node, { 
        backgroundColor: bg ? `hsl(${bg})` : '#ffffff',
        pixelRatio: 2,
        quality: 0.95,
        filter: (node) => {
          if (node instanceof HTMLElement && node.hasAttribute('data-no-export')) return false;
          return true;
        }
      });

      // Hide it again
      if (dateEl) dateEl.classList.add('hidden');

      const link = document.createElement('a');
      link.download = `partida-${format(matchDate, "yyyy-MM-dd")}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Sucesso", description: "Imagem exportada com sucesso!" });
    } catch (error) {
      console.error('Erro ao exportar imagem:', error);
      // Restore hidden state on error
      const dateEl = node.querySelector('[data-export-date]') as HTMLElement;
      if (dateEl) dateEl.classList.add('hidden');
      toast({ title: "Erro", description: "Não foi possível exportar a imagem", variant: "destructive" });
    }
  }, []);

  const MatchDetails = ({ match }: { match: Match }) => {
    const result = getMatchResult(match);
    
    // Agrupar estatísticas a partir dos dados de teams (fonte correta)
    const getTeamStats = (team: typeof match.teams.azul, stat: 'goals' | 'assists' | 'ownGoals'): [string, number][] => {
      const grouped: Record<string, number> = {};
      const hasEvents = match.events && match.events.length > 0;

      if (hasEvents) {
        match.events.forEach(e => {
          if (stat === 'goals' && !e.isOwnGoal) {
            grouped[e.scorerId] = (grouped[e.scorerId] || 0) + 1;
          } else if (stat === 'assists' && e.assistId) {
            grouped[e.assistId] = (grouped[e.assistId] || 0) + 1;
          } else if (stat === 'ownGoals' && e.isOwnGoal) {
            grouped[e.scorerId] = (grouped[e.scorerId] || 0) + 1;
          }
        });
        // Filter only players that are in the requested team
        const teamPlayerIds = new Set(team.map(t => t.playerId));
        const filteredGrouped: Record<string, number> = {};
        Object.entries(grouped).forEach(([pid, val]) => {
          if (teamPlayerIds.has(pid)) {
            filteredGrouped[pid] = val;
          }
        });
        return Object.entries(filteredGrouped).sort((a, b) => b[1] - a[1]);
      }

      team.forEach(t => {
        const value = t[stat] || 0;
        if (value > 0) {
          grouped[t.playerId] = (grouped[t.playerId] || 0) + value;
        }
      });
      return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    };

    const azulGoals = getTeamStats(match.teams.azul, 'goals');
    const vermelhoGoals = getTeamStats(match.teams.vermelho, 'goals');
    const azulAssists = getTeamStats(match.teams.azul, 'assists');
    const vermelhoAssists = getTeamStats(match.teams.vermelho, 'assists');
    const azulOwnGoals = getTeamStats(match.teams.azul, 'ownGoals');
    const vermelhoOwnGoals = getTeamStats(match.teams.vermelho, 'ownGoals');
    const ownGoals = [...azulOwnGoals, ...vermelhoOwnGoals].sort((a, b) => b[1] - a[1]);

    // Field Goals from team assignments
    const getFieldGoals = (team: typeof match.teams.azul): [string, number][] => {
      return team
        .filter(p => (p.fieldGoals || 0) > 0)
        .map(p => [p.playerId, p.fieldGoals!] as [string, number])
        .sort((a, b) => b[1] - a[1]);
    };
    const azulFieldGoals = getFieldGoals(match.teams.azul);
    const vermelhoFieldGoals = getFieldGoals(match.teams.vermelho);
    
    const StatList = ({ items, colorClass }: { items: [string, number][], colorClass: string }) => (
      <div className="space-y-1">
        {items.map(([playerId, count]) => (
          <div key={playerId} className={`text-sm flex items-center justify-between ${colorClass}`}>
            <span>{getPlayerName(playerId)}</span>
            <Badge variant="secondary" className="ml-2 text-xs">{count}</Badge>
          </div>
        ))}
      </div>
    );
    
    return (
      <div className="space-y-4">
        <div className="flex justify-center items-center gap-4 mb-6">
          <Badge variant="secondary" className="text-lg px-4 py-2" style={{ color: homeConfig.color, backgroundColor: `${homeConfig.color}15` }}>
            {homeConfig.name} {result.azul}
          </Badge>
          <span className="text-xl">×</span>
          <Badge variant="secondary" className="text-lg px-4 py-2" style={{ color: awayConfig.color, backgroundColor: `${awayConfig.color}15` }}>
            {result.vermelho} {awayConfig.name}
          </Badge>
        </div>

        {/* Súmula - visível para todos */}
        {match.reportFilePath && (
          <div className="mb-4 p-3 bg-muted rounded-lg" data-no-export>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Súmula anexada</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleViewReport(match.reportFilePath!)}
                className="flex items-center gap-1"
              >
                <FileImage className="h-4 w-4" />
                Visualizar
              </Button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Time Azul */}
          <div>
            <h4 className="font-bold mb-3 uppercase tracking-wider text-xs" style={{ color: homeConfig.color }}>{homeConfig.name}</h4>
            <div className="space-y-2">
              {match.teams.azul.map((assignment) => (
                <div key={assignment.playerId} className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={getPlayerPhoto(assignment.playerId)} />
                    <AvatarFallback>
                      {getPlayerName(assignment.playerId).split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{getPlayerName(assignment.playerId)}</span>
                  {assignment.isGoalkeeper && (
                    <Badge variant="outline" className="text-xs">🧤</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time Vermelho */}
          <div>
            <h4 className="font-bold mb-3 uppercase tracking-wider text-xs" style={{ color: awayConfig.color }}>{awayConfig.name}</h4>
            <div className="space-y-2">
              {match.teams.vermelho.map((assignment) => (
                <div key={assignment.playerId} className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={getPlayerPhoto(assignment.playerId)} />
                    <AvatarFallback>
                      {getPlayerName(assignment.playerId).split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{getPlayerName(assignment.playerId)}</span>
                  {assignment.isGoalkeeper && (
                    <Badge variant="outline" className="text-xs">🧤</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gols e Assistências por Time */}
        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="space-y-4">
            <h4 className="font-bold uppercase tracking-wider text-xs" style={{ color: homeConfig.color }}>{homeConfig.name} - Estatísticas</h4>
            
            {azulGoals.length > 0 && (
              <div className="rounded-lg p-3" style={{ backgroundColor: `${homeConfig.color}10` }}>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  ⚽ Gols
                </h5>
                <StatList items={azulGoals} colorClass="" />
              </div>
            )}
            
            {azulAssists.length > 0 && (
              <div className="rounded-lg p-3" style={{ backgroundColor: `${homeConfig.color}10` }}>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  👟 Assistências
                </h5>
                <StatList items={azulAssists} colorClass="" />
              </div>
            )}

            {azulFieldGoals.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  🥅 Field Goals
                </h5>
                <StatList items={azulFieldGoals} colorClass="text-blue-700 dark:text-blue-400" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-bold uppercase tracking-wider text-xs" style={{ color: awayConfig.color }}>{awayConfig.name} - Estatísticas</h4>
            
            {vermelhoGoals.length > 0 && (
              <div className="rounded-lg p-3" style={{ backgroundColor: `${awayConfig.color}10` }}>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  ⚽ Gols
                </h5>
                <StatList items={vermelhoGoals} colorClass="" />
              </div>
            )}
            
            {vermelhoAssists.length > 0 && (
              <div className="rounded-lg p-3" style={{ backgroundColor: `${awayConfig.color}10` }}>
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  👟 Assistências
                </h5>
                <StatList items={vermelhoAssists} colorClass="" />
              </div>
            )}

            {vermelhoFieldGoals.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                  🥅 Field Goals
                </h5>
                <StatList items={vermelhoFieldGoals} colorClass="text-red-700 dark:text-red-400" />
              </div>
            )}
          </div>
        </div>

        {/* Observações */}
        {match.observations && (
          <div className="pt-4 border-t">
            <div className="bg-muted rounded-lg p-3">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                📝 Observações
              </h4>
              <p className="text-sm whitespace-pre-wrap">{match.observations}</p>
            </div>
          </div>
        )}

        {/* Gols Contra */}
        {ownGoals.length > 0 && (
          <div className="pt-4 border-t">
            <div className="bg-destructive/10 rounded-lg p-3">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                🔴 Gols Contra
              </h4>
              <StatList items={ownGoals} colorClass="text-destructive" />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Partidas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhuma partida registrada ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">Histórico de Partidas</h2>
        
        {/* Seletor de Ano */}
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Temporada:</span>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-32 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            ({filteredMatches.length} partida{filteredMatches.length !== 1 ? 's' : ''})
          </span>
        </div>
      </div>

      {filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-center">
              Nenhuma partida registrada em {selectedYear}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredMatches.map((match) => {
            const result = getMatchResult(match);
            return (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">
                        {format(match.date, "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" style={{ color: homeConfig.color, backgroundColor: `${homeConfig.color}15` }}>
                          {homeConfig.name} {result.azul}
                        </Badge>
                        <span>×</span>
                        <Badge variant="secondary" style={{ color: awayConfig.color, backgroundColor: `${awayConfig.color}15` }}>
                          {result.vermelho} {awayConfig.name}
                        </Badge>
                        {getMatchStats(match).assists > getMatchStats(match).goals && (
                          <Badge variant="destructive" className="ml-2">
                            ⚠️ Mais assistências que gols
                          </Badge>
                        )}
                      </div>
                      {match.observations && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 italic">
                          📝 {match.observations}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {isAdmin && onMatchDelete && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(match)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {isAdmin && onMatchUpdate && isAuthenticated && (
                        <EditMatchDialog 
                          match={match} 
                          players={players} 
                          onMatchUpdate={onMatchUpdate} 
                          group={group}
                        />
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                              <span>Partida - {format(match.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 ml-4"
                                onClick={(e) => {
                                  const container = (e.target as HTMLElement).closest('[role="dialog"]')?.querySelector('[data-export-area]') as HTMLElement;
                                  handleExportImage(container, match.date);
                                }}
                              >
                                <Download className="h-4 w-4" />
                                Exportar
                              </Button>
                            </DialogTitle>
                          </DialogHeader>
                          <div data-export-area>
                            <p className="text-sm text-muted-foreground mb-4 hidden" data-export-date>
                              📅 {format(match.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                            <MatchDetails match={match} />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Partida</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a partida de{" "}
              {matchToDelete && format(matchToDelete.date, "dd/MM/yyyy", { locale: ptBR })}? 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}