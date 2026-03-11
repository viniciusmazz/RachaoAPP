import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hand, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Player, Teams, TeamSide, Group } from "@/types/football";

interface TeamAssignmentProps {
  players: Player[];
  teams: Teams;
  onTeamsChange: (t: Teams) => void;
  date: Date;
  onDateChange: (d: Date) => void;
  group: Group;
}

export default function TeamAssignment({ players, teams, onTeamsChange, date, onDateChange, group }: TeamAssignmentProps) {
  const homeConfig = group.settings.sides.home;
  const awayConfig = group.settings.sides.away;
  const assignedIds = new Set([
    ...teams.azul.map((t) => t.playerId),
    ...teams.vermelho.map((t) => t.playerId),
  ]);

  const unassigned = players.filter((p) => !assignedIds.has(p.id));

  // Calculate real-time score
  const score = useMemo(() => {
    const azulGoals = teams.azul.reduce((sum, player) => sum + (player.goals || 0), 0);
    const vermelhoGoals = teams.vermelho.reduce((sum, player) => sum + (player.goals || 0), 0);
    const azulOwnGoals = teams.azul.reduce((sum, player) => sum + (player.ownGoals || 0), 0);
    const vermelhoOwnGoals = teams.vermelho.reduce((sum, player) => sum + (player.ownGoals || 0), 0);
    
    return {
      azul: azulGoals + vermelhoOwnGoals,
      vermelho: vermelhoGoals + azulOwnGoals,
    };
  }, [teams]);

  const addToTeam = (team: TeamSide, playerId: string) => {
    const withoutPlayer = {
      azul: teams.azul.filter((i) => i.playerId !== playerId),
      vermelho: teams.vermelho.filter((i) => i.playerId !== playerId),
    };
    onTeamsChange({
      ...withoutPlayer,
      [team]: [...withoutPlayer[team], { playerId }],
    });
  };

  const removeFromTeams = (playerId: string) => {
    onTeamsChange({
      azul: teams.azul.filter((i) => i.playerId !== playerId),
      vermelho: teams.vermelho.filter((i) => i.playerId !== playerId),
    });
  };

  const setGoalkeeper = (team: TeamSide, playerId: string) => {
    const updatedTeams = { ...teams };
    const teamAssignments = updatedTeams[team];
    
    const currentGK = teamAssignments.find(t => t.playerId === playerId);
    if (currentGK?.isGoalkeeper) {
      updatedTeams[team] = teamAssignments.map(i => 
        i.playerId === playerId ? { ...i, isGoalkeeper: false } : i
      );
    } else {
      updatedTeams[team] = teamAssignments.map(i => ({ 
        ...i, 
        isGoalkeeper: i.playerId === playerId 
      }));
    }
    
    onTeamsChange(updatedTeams);
  };

  const updatePlayerStats = (team: TeamSide, playerId: string, field: 'goals' | 'assists' | 'ownGoals' | 'fieldGoals', value: number) => {
    const updatedTeams = { ...teams };
    updatedTeams[team] = updatedTeams[team].map(i => 
      i.playerId === playerId ? { ...i, [field]: value } : i
    );
    onTeamsChange(updatedTeams);
  };

  const nameById = (id: string) => players.find((p) => p.id === id)?.name ?? "";

  return (
    <div className="space-y-6">
      {/* Score Header with Date */}
      <Card className="overflow-hidden">
        <div 
          className="flex items-center justify-between p-4"
          style={{ 
            background: `linear-gradient(to right, ${homeConfig.color}, #f1f5f9, ${awayConfig.color})` 
          }}
        >
          <div className="flex-1 text-center">
            <div className="text-5xl font-bold text-white drop-shadow-lg">{score.azul}</div>
            <div className="text-sm font-medium text-white/80 uppercase tracking-wider">{homeConfig.name}</div>
          </div>
          
          <div className="flex flex-col items-center gap-2 px-6">
            <span className="text-slate-900 font-bold text-lg">×</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/90 hover:bg-white text-foreground shadow-sm"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && onDateChange(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex-1 text-center">
            <div className="text-5xl font-bold text-white drop-shadow-lg">{score.vermelho}</div>
            <div className="text-sm font-medium text-white/80 uppercase tracking-wider">{awayConfig.name}</div>
          </div>
        </div>
      </Card>

      {/* Teams Grid - Full Width */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Available Players */}
        <Card>
          <CardContent className="p-4">
            <div className="font-medium mb-3">Disponíveis ({unassigned.length})</div>
            <div className="space-y-2 max-h-[500px] overflow-auto">
              {unassigned.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum jogador disponível.</p>
              )}
              {unassigned.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-2 gap-2">
                  <span className="truncate flex-1 text-sm">{p.name}</span>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 px-2 text-xs" 
                      style={{ backgroundColor: `${homeConfig.color}10`, borderColor: `${homeConfig.color}40`, color: homeConfig.color }}
                      onClick={() => addToTeam("azul", p.id)}
                    >
                      {homeConfig.name}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 px-2 text-xs" 
                      style={{ backgroundColor: `${awayConfig.color}10`, borderColor: `${awayConfig.color}40`, color: awayConfig.color }}
                      onClick={() => addToTeam("vermelho", p.id)}
                    >
                      {awayConfig.name}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blue Team */}
        <Card style={{ borderColor: `${homeConfig.color}40`, backgroundColor: `${homeConfig.color}05` }}>
          <CardContent className="p-4">
            <div className="font-bold mb-3 uppercase tracking-wider text-xs" style={{ color: homeConfig.color }}>
              {homeConfig.name} ({teams.azul.length})
            </div>
            <div className="space-y-3 max-h-[500px] overflow-auto">
              {teams.azul.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem jogadores.</p>
              )}
              {teams.azul.map((i) => (
                <div key={i.playerId} className="rounded-md border bg-white p-3 space-y-2" style={{ borderColor: `${homeConfig.color}20` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className={cn(
                          "w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors",
                          i.isGoalkeeper ? 'text-white' : 'border-slate-200 hover:border-slate-400'
                        )}
                        style={i.isGoalkeeper ? { backgroundColor: homeConfig.color, borderColor: homeConfig.color } : {}}
                        onClick={() => setGoalkeeper("azul", i.playerId)}
                        title="Definir como goleiro"
                      >
                        {i.isGoalkeeper && <Hand className="w-4 h-4" />}
                      </div>
                      <span className="font-medium truncate" title={nameById(i.playerId)}>{nameById(i.playerId)}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => removeFromTeams(i.playerId)}>×</Button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Gols</Label>
                      <Input
                        type="number"
                        min="0"
                        value={i.goals || 0}
                        onChange={(e) => updatePlayerStats("azul", i.playerId, "goals", parseInt(e.target.value) || 0)}
                        className="h-7 text-center text-sm px-1"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Assist.</Label>
                      <Input
                        type="number"
                        min="0"
                        value={i.assists || 0}
                        onChange={(e) => updatePlayerStats("azul", i.playerId, "assists", parseInt(e.target.value) || 0)}
                        className="h-7 text-center text-sm px-1"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">G.C.</Label>
                      <Input
                        type="number"
                        min="0"
                        value={i.ownGoals || 0}
                        onChange={(e) => updatePlayerStats("azul", i.playerId, "ownGoals", parseInt(e.target.value) || 0)}
                        className="h-7 text-center text-sm px-1"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">FG</Label>
                      <Input
                        type="number"
                        min="0"
                        value={i.fieldGoals || 0}
                        onChange={(e) => updatePlayerStats("azul", i.playerId, "fieldGoals", parseInt(e.target.value) || 0)}
                        className="h-7 text-center text-sm px-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Red Team */}
        <Card style={{ borderColor: `${awayConfig.color}40`, backgroundColor: `${awayConfig.color}05` }}>
          <CardContent className="p-4">
            <div className="font-bold mb-3 uppercase tracking-wider text-xs" style={{ color: awayConfig.color }}>
              {awayConfig.name} ({teams.vermelho.length})
            </div>
            <div className="space-y-3 max-h-[500px] overflow-auto">
              {teams.vermelho.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem jogadores.</p>
              )}
              {teams.vermelho.map((i) => (
                <div key={i.playerId} className="rounded-md border bg-white p-3 space-y-2" style={{ borderColor: `${awayConfig.color}20` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className={cn(
                          "w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors",
                          i.isGoalkeeper ? 'text-white' : 'border-slate-200 hover:border-slate-400'
                        )}
                        style={i.isGoalkeeper ? { backgroundColor: awayConfig.color, borderColor: awayConfig.color } : {}}
                        onClick={() => setGoalkeeper("vermelho", i.playerId)}
                        title="Definir como goleiro"
                      >
                        {i.isGoalkeeper && <Hand className="w-4 h-4" />}
                      </div>
                      <span className="font-medium truncate" title={nameById(i.playerId)}>{nameById(i.playerId)}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => removeFromTeams(i.playerId)}>×</Button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Gols</Label>
                      <Input
                        type="number"
                        min="0"
                        value={i.goals || 0}
                        onChange={(e) => updatePlayerStats("vermelho", i.playerId, "goals", parseInt(e.target.value) || 0)}
                        className="h-7 text-center text-sm px-1"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">Assist.</Label>
                      <Input
                        type="number"
                        min="0"
                        value={i.assists || 0}
                        onChange={(e) => updatePlayerStats("vermelho", i.playerId, "assists", parseInt(e.target.value) || 0)}
                        className="h-7 text-center text-sm px-1"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">G.C.</Label>
                      <Input
                        type="number"
                        min="0"
                        value={i.ownGoals || 0}
                        onChange={(e) => updatePlayerStats("vermelho", i.playerId, "ownGoals", parseInt(e.target.value) || 0)}
                        className="h-7 text-center text-sm px-1"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] text-muted-foreground">FG</Label>
                      <Input
                        type="number"
                        min="0"
                        value={i.fieldGoals || 0}
                        onChange={(e) => updatePlayerStats("vermelho", i.playerId, "fieldGoals", parseInt(e.target.value) || 0)}
                        className="h-7 text-center text-sm px-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground text-center">Dica: clique no ícone de luva para definir o goleiro de cada time.</p>
    </div>
  );
}