import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TeamAssignment from "./TeamAssignment";
import FileUpload from "./FileUpload";
import type { Match, Player, Teams, Group } from "@/types/football";
import { createTeamEvents } from "@/lib/matchEvents";

interface EditMatchDialogProps {
  match: Match;
  players: Player[];
  onMatchUpdate: (matchId: string, updatedMatch: Omit<Match, 'id'>) => Promise<void>;
  group: Group;
}

export default function EditMatchDialog({ match, players, onMatchUpdate, group }: EditMatchDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(match.date);
  const [teams, setTeams] = useState<Teams>(match.teams);
  const [reportFilePath, setReportFilePath] = useState<string | null>(match.reportFilePath || null);
  const [observations, setObservations] = useState<string>(match.observations || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const events = [
        ...createTeamEvents(teams.azul, "azul"),
        ...createTeamEvents(teams.vermelho, "vermelho"),
      ];

      await onMatchUpdate(match.id, {
        date,
        teams,
        events,
        reportFilePath: reportFilePath || undefined,
        observations: observations || undefined,
      });
      toast({
        title: "Sucesso",
        description: "Partida atualizada com sucesso"
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a partida",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const canSave = teams.azul.length > 0 && teams.vermelho.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <Edit className="h-4 w-4" />
        Editar
      </Button>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Partida</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <TeamAssignment 
            players={players} 
            teams={teams} 
            onTeamsChange={setTeams} 
            date={date} 
            onDateChange={setDate} 
            group={group}
          />
          
          <FileUpload 
            onFileUpload={setReportFilePath} 
            existingFilePath={reportFilePath || undefined} 
          />
          
          <div className="space-y-2">
            <label htmlFor="edit-observations" className="text-sm font-medium">Observações</label>
            <textarea
              id="edit-observations"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Anotações sobre a partida..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}