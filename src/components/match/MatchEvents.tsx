import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2 } from "lucide-react";
import type { MatchEvent, Player, Teams, TeamSide, Group } from "@/types/football";

interface MatchEventsProps {
  players: Player[];
  teams: Teams;
  events: MatchEvent[];
  onEventsChange: (e: MatchEvent[]) => void;
  group: Group;
}

export default function MatchEvents({ players, teams, events, onEventsChange, group }: MatchEventsProps) {
  const homeConfig = group.settings.sides.home;
  const awayConfig = group.settings.sides.away;
  const [team, setTeam] = useState<TeamSide>("azul");
  const [scorer, setScorer] = useState<string>("");
  const [assist, setAssist] = useState<string | undefined>(undefined);
  const [minute, setMinute] = useState<string>("");
  const [isOwnGoal, setIsOwnGoal] = useState<boolean>(false);
  
  // Estados para edição
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);
  const [editTeam, setEditTeam] = useState<TeamSide>("azul");
  const [editScorer, setEditScorer] = useState<string>("");
  const [editAssist, setEditAssist] = useState<string | undefined>(undefined);
  const [editMinute, setEditMinute] = useState<string>("");
  const [editIsOwnGoal, setEditIsOwnGoal] = useState<boolean>(false);
  
  // Estados para exclusão
  const [deletingEvent, setDeletingEvent] = useState<MatchEvent | null>(null);

  const teamPlayerIds = useMemo(
    () => (team === "azul" ? teams.azul : teams.vermelho).map((i) => i.playerId),
    [team, teams]
  );

  const oppositeTeamPlayerIds = useMemo(
    () => (team === "azul" ? teams.vermelho : teams.azul).map((i) => i.playerId),
    [team, teams]
  );

  const teamPlayers = players.filter((p) => teamPlayerIds.includes(p.id));
  const oppositeTeamPlayers = players.filter((p) => oppositeTeamPlayerIds.includes(p.id));

  const goals = useMemo(() => {
    const azul = events.filter((e) => e.team === "azul").length;
    const vermelho = events.filter((e) => e.team === "vermelho").length;
    return { azul, vermelho };
  }, [events]);

  const addEvent = () => {
    if (!scorer) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const m = minute ? parseInt(minute) : undefined;
    onEventsChange([...events, { 
      id, 
      team, 
      scorerId: scorer, 
      assistId: assist || undefined, 
      minute: m,
      isOwnGoal 
    }]);
    setScorer("");
    setAssist(undefined);
    setMinute("");
    setIsOwnGoal(false);
  };

  const startEdit = (event: MatchEvent) => {
    setEditingEvent(event);
    setEditTeam(event.team);
    setEditScorer(event.scorerId);
    setEditAssist(event.assistId);
    setEditMinute(event.minute?.toString() || "");
    setEditIsOwnGoal(event.isOwnGoal || false);
  };

  const saveEdit = () => {
    if (!editingEvent || !editScorer) return;
    const m = editMinute ? parseInt(editMinute) : undefined;
    const updatedEvent = {
      ...editingEvent,
      team: editTeam,
      scorerId: editScorer,
      assistId: editAssist || undefined,
      minute: m,
      isOwnGoal: editIsOwnGoal
    };
    const updatedEvents = events.map(e => e.id === editingEvent.id ? updatedEvent : e);
    onEventsChange(updatedEvents);
    setEditingEvent(null);
  };

  const deleteEvent = () => {
    if (!deletingEvent) return;
    const updatedEvents = events.filter(e => e.id !== deletingEvent.id);
    onEventsChange(updatedEvents);
    setDeletingEvent(null);
  };

  const editTeamPlayerIds = useMemo(
    () => (editTeam === "azul" ? teams.azul : teams.vermelho).map((i) => i.playerId),
    [editTeam, teams]
  );

  const editOppositeTeamPlayerIds = useMemo(
    () => (editTeam === "azul" ? teams.vermelho : teams.azul).map((i) => i.playerId),
    [editTeam, teams]
  );

  const editTeamPlayers = players.filter((p) => editTeamPlayerIds.includes(p.id));
  const editOppositeTeamPlayers = players.filter((p) => editOppositeTeamPlayerIds.includes(p.id));

  const nameById = (id?: string) => (id ? players.find((p) => p.id === id)?.name ?? "" : "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de Gols</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="grid gap-2">
            <label className="text-sm">Time</label>
            <Select value={team} onValueChange={(v) => setTeam(v as TeamSide)}>
              <SelectTrigger>
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="azul">{homeConfig.name}</SelectItem>
                <SelectItem value="vermelho">{awayConfig.name}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Autor do gol</label>
            <Select value={scorer} onValueChange={(v) => setScorer(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Jogador" />
              </SelectTrigger>
              <SelectContent>
                {(isOwnGoal ? oppositeTeamPlayers : teamPlayers).length === 0 && (
                  <div className="px-2 py-1 text-sm text-muted-foreground">Sem jogadores</div>
                )}
                {(isOwnGoal ? oppositeTeamPlayers : teamPlayers).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Assistência (opcional)</label>
            <Select value={assist ?? "none"} onValueChange={(v) => setAssist(v === "none" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Jogador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem assistência</SelectItem>
                {teamPlayers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Minuto</label>
            <Input type="number" min={0} max={120} value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="Ex: 12" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Gol contra</label>
            <div className="flex items-center space-x-2 h-10">
              <Checkbox 
                id="own-goal" 
                checked={isOwnGoal} 
                onCheckedChange={(checked) => {
                  setIsOwnGoal(checked as boolean);
                  setScorer(""); // Reset scorer when changing type
                  setAssist(undefined); // Reset assist when changing type
                }} 
              />
              <label htmlFor="own-goal" className="text-sm font-medium">
                É gol contra?
              </label>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={addEvent}>Adicionar Gol</Button>
          <div className="text-sm text-muted-foreground">
            Placar: <span style={{ color: homeConfig.color }}>{homeConfig.name} {goals.azul}</span> x <span style={{ color: awayConfig.color }}>{goals.vermelho} {awayConfig.name}</span>
          </div>
        </div>
        <Separator />
        <div>
          <div className="font-medium mb-2">Eventos {events.length > 0 && `(${events.length})`}</div>
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum gol registrado. Adicione um gol para ver os botões de editar e excluir.</p>
          )}
          <ul className="space-y-2">
            {events.map((e) => (
              !e.isDummyGoal && (
                <li key={e.id} className="rounded-md border p-2 text-sm flex justify-between items-center">
                  <div>
                    {e.isOwnGoal ? (
                      <>
                        <span className="font-medium text-destructive">Gol contra</span> de <span className="font-medium">{nameById(e.scorerId)}</span> para <span className="font-medium">{e.team === "azul" ? homeConfig.name : awayConfig.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{nameById(e.scorerId)}</span> marcou para <span className="font-medium">{e.team === "azul" ? homeConfig.name : awayConfig.name}</span>
                      </>
                    )}
                    {e.assistId && !e.isOwnGoal ? (
                      <> com assistência de <span className="font-medium">{nameById(e.assistId)}</span></>
                    ) : null}
                    {e.extraAssistIds && e.extraAssistIds.length > 0 && !e.isOwnGoal ? (
                      <> e <span className="font-medium">{e.extraAssistIds.map(id => nameById(id)).join(", ")}</span></>
                    ) : null}
                    {typeof e.minute === "number" ? <> aos {e.minute}'</> : null}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(e)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingEvent(e)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              )
            ))}
          </ul>
        </div>

        {/* Diálogo de Edição */}
        <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Gol</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm">Time</label>
                <Select value={editTeam} onValueChange={(v) => setEditTeam(v as TeamSide)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="azul">{homeConfig.name}</SelectItem>
                    <SelectItem value="vermelho">{awayConfig.name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Gol contra</label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-own-goal" 
                    checked={editIsOwnGoal} 
                    onCheckedChange={(checked) => {
                      setEditIsOwnGoal(checked as boolean);
                      setEditScorer(""); // Reset scorer when changing type
                      setEditAssist(undefined); // Reset assist when changing type
                    }} 
                  />
                  <label htmlFor="edit-own-goal" className="text-sm font-medium">
                    É gol contra?
                  </label>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Autor do gol</label>
                <Select value={editScorer} onValueChange={(v) => setEditScorer(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Jogador" />
                  </SelectTrigger>
                  <SelectContent>
                    {(editIsOwnGoal ? editOppositeTeamPlayers : editTeamPlayers).length === 0 && (
                      <div className="px-2 py-1 text-sm text-muted-foreground">Sem jogadores</div>
                    )}
                    {(editIsOwnGoal ? editOppositeTeamPlayers : editTeamPlayers).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Assistência (opcional)</label>
                <Select 
                  value={editAssist ?? "none"} 
                  onValueChange={(v) => setEditAssist(v === "none" ? undefined : v)}
                  disabled={editIsOwnGoal}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Jogador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem assistência</SelectItem>
                    {editTeamPlayers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Minuto</label>
                <Input type="number" min={0} max={120} value={editMinute} onChange={(e) => setEditMinute(e.target.value)} placeholder="Ex: 12" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingEvent(null)}>Cancelar</Button>
                <Button onClick={saveEdit}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Confirmação de Exclusão */}
        <AlertDialog open={!!deletingEvent} onOpenChange={() => setDeletingEvent(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Gol</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este gol? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
