import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import type { Player } from "@/types/football";

interface JoinGroupDialogProps {
  players: Player[];
  onRequestAccess: (playerId?: string) => Promise<{ success: boolean }>;
  isPending: boolean;
}

export default function JoinGroupDialog({ players, onRequestAccess, isPending }: JoinGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("none");
  const [loading, setLoading] = useState(false);

  // Filter players that are NOT linked to a user (this is a bit tricky since we don't have user_id in the Player type here, but we can check if they are already linked in the group settings if we had them)
  // For now, let's assume all players in the list are candidates, or we can just let the user pick.
  // Actually, the Player type in types/football.ts doesn't have user_id, but the DB does.
  // The players passed here come from usePlayers, which fetches from DB.
  
  const handleRequest = async () => {
    setLoading(true);
    const playerId = selectedPlayerId === "none" ? undefined : selectedPlayerId;
    const result = await onRequestAccess(playerId);
    setLoading(false);
    if (result.success) {
      setOpen(false);
    }
  };

  if (isPending) {
    return (
      <Button disabled className="rounded-xl font-bold opacity-70">
        Solicitação Pendente
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
          <UserPlus className="h-4 w-4 mr-2" />
          Vincular-se ao Grupo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">Vincular-se ao Grupo</DialogTitle>
          <DialogDescription className="font-medium">
            Solicite acesso ao grupo e vincule seu perfil a um jogador existente para acompanhar suas estatísticas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="player" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              Quem é você neste grupo?
            </Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger id="player" className="rounded-xl border-slate-200 h-12">
                <SelectValue placeholder="Selecione seu nome" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">Apenas entrar no grupo (sem vincular)</SelectItem>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400 font-medium px-1">
              Se você já joga neste grupo, selecione seu nome acima. Caso contrário, selecione "Apenas entrar".
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleRequest} 
            disabled={loading}
            className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
