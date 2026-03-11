import { useEffect, useState } from "react";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { usePlayers } from "@/hooks/usePlayers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Shield, DollarSign, User, MoreVertical, Trash2, Link as LinkIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface GroupMembersProps {
  groupId: string;
  ownerId: string;
}

const GroupMembers = ({ groupId, ownerId }: GroupMembersProps) => {
  const { groupMembers, fetchGroupMembers, updateUserRole, rejectUser } = useUserRole(groupId);
  const { players, linkPlayerToUser } = usePlayers(groupId);
  const [linkingMember, setLinkingMember] = useState<GroupMember | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    fetchGroupMembers();
  }, [groupId, fetchGroupMembers]);

  const handleLinkPlayer = async () => {
    if (!linkingMember || !selectedPlayerId) return;
    
    setIsLinking(true);
    try {
      const result = await linkPlayerToUser(selectedPlayerId, linkingMember.user_id);
      if (result.success) {
        setLinkingMember(null);
        setSelectedPlayerId("");
        fetchGroupMembers();
      }
    } finally {
      setIsLinking(false);
    }
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary hover:bg-primary font-bold gap-1"><Shield className="h-3 w-3" /> Admin</Badge>;
      case 'financeiro':
        return <Badge className="bg-blue-600 hover:bg-blue-600 font-bold gap-1"><DollarSign className="h-3 w-3" /> Financeiro</Badge>;
      case 'atleta':
        return <Badge className="bg-emerald-600 hover:bg-emerald-600 font-bold gap-1"><User className="h-3 w-3" /> Atleta</Badge>;
      default:
        return <Badge variant="secondary" className="font-bold">Membro</Badge>;
    }
  };

  if (groupMembers.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="font-medium">Nenhum membro encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupMembers.map((member) => (
        <div 
          key={member.user_id} 
          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white transition-all hover:shadow-sm gap-4"
        >
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">{member.name || member.email}</span>
              {getRoleBadge(member.role)}
              {member.user_id === ownerId && (
                <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold">Dono</Badge>
              )}
              {member.player_id && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold gap-1">
                  <User className="h-3 w-3" />
                  Vinculado: {member.player_name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium">{member.email}</p>
          </div>
          
          <div className="flex items-center gap-2 justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setLinkingMember(member);
                setSelectedPlayerId(member.player_id || "");
              }}
              className={cn(
                "rounded-xl font-bold h-9 transition-all",
                member.player_id 
                  ? "border-slate-200 text-slate-500 hover:bg-slate-50" 
                  : "border-primary/20 text-primary hover:bg-primary/5"
              )}
            >
              <LinkIcon className="h-3.5 w-3.5 mr-2" />
              {member.player_id ? 'Alterar Vínculo' : 'Vincular Jogador'}
            </Button>

            {member.user_id !== ownerId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <div className="px-2 py-1.5 text-xs font-black text-slate-400 uppercase tracking-widest">Alterar Cargo</div>
                  <DropdownMenuItem onClick={() => updateUserRole(member.user_id, 'atleta')} className="gap-2 font-bold">
                    <User className="h-4 w-4" />
                    Atleta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateUserRole(member.user_id, 'financeiro')} className="gap-2 font-bold">
                    <DollarSign className="h-4 w-4" />
                    Financeiro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateUserRole(member.user_id, 'admin')} className="gap-2 font-bold">
                    <Shield className="h-4 w-4" />
                    Admin
                  </DropdownMenuItem>
                  <div className="h-px bg-slate-100 my-1" />
                  <DropdownMenuItem 
                    onClick={() => {
                      setLinkingMember(member);
                      setSelectedPlayerId(member.player_id || "");
                    }} 
                    className="gap-2 font-bold text-primary focus:text-primary focus:bg-primary/5"
                  >
                    <LinkIcon className="h-4 w-4" />
                    {member.player_id ? 'Alterar Vínculo' : 'Vincular a Jogador'}
                  </DropdownMenuItem>
                  {member.player_id && (
                    <DropdownMenuItem 
                      onClick={async () => {
                        if (confirm(`Deseja remover o vínculo de ${member.name || member.email} com o jogador ${member.player_name}?`)) {
                          await linkPlayerToUser("", member.user_id);
                          fetchGroupMembers();
                        }
                      }} 
                      className="gap-2 font-bold text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                    >
                      <LinkIcon className="h-4 w-4 rotate-45" />
                      Remover Vínculo
                    </DropdownMenuItem>
                  )}
                  <div className="h-px bg-slate-100 my-1" />
                  <DropdownMenuItem 
                    onClick={() => rejectUser(member.user_id)} 
                    className="gap-2 font-bold text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover do Grupo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      ))}

      <Dialog open={!!linkingMember} onOpenChange={(open) => !open && setLinkingMember(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Vincular Membro a Jogador</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500 font-medium">
              Selecione um perfil de jogador existente para vincular a este membro. Isso permitirá que o membro veja seu histórico e estatísticas.
            </p>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="rounded-xl border-slate-200 h-12 font-bold">
                <SelectValue placeholder="Selecione um jogador..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id} className="font-bold">
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => setLinkingMember(null)}
              className="rounded-xl font-bold"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleLinkPlayer}
              disabled={!selectedPlayerId || isLinking}
              className="rounded-xl font-bold bg-primary hover:bg-primary/90"
            >
              {isLinking ? "Vinculando..." : "Confirmar Vínculo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupMembers;
