import { useEffect, useState } from "react";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { usePlayers } from "@/hooks/usePlayers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Shield, DollarSign, User, MoreVertical, Trash2, Link as LinkIcon, Loader2, RefreshCw } from "lucide-react";
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
  console.log('GroupMembers: Rendering', { groupId });
  const { groupMembers, fetchGroupMembers, fetchPendingUsers, updateUserRole, removeMember, blockMember, unblockMember, refreshingMembers } = useUserRole(groupId);
  const { players, linkPlayerToUser } = usePlayers(groupId);
  
  const [version, setVersion] = useState(0);
  useEffect(() => {
    setVersion(v => v + 1);
  }, [groupMembers]);

  const [linkingMember, setLinkingMember] = useState<GroupMember | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    variant: 'danger' | 'warning';
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
    variant: 'warning'
  });

  const handleRefresh = async () => {
    await Promise.all([fetchGroupMembers(), fetchPendingUsers()]);
    toast({
      title: "Atualizado",
      description: "Lista de membros atualizada com sucesso."
    });
  };

  useEffect(() => {
    fetchGroupMembers();
  }, [groupId, fetchGroupMembers]);

  const handleRemoveMember = async (userId: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: "Remover Membro",
      description: `Deseja realmente remover ${name} do grupo? Esta ação não pode ser desfeita.`,
      variant: 'danger',
      action: async () => {
        setProcessingId(userId);
        try {
          const result = await removeMember(userId);
          if (result.success) {
            toast({
              title: "Membro removido",
              description: `${name} foi removido do grupo com sucesso.`
            });
            await fetchGroupMembers();
          }
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const handleBlockMember = async (userId: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: "Bloquear Membro",
      description: `Deseja bloquear ${name}? O usuário não poderá mais solicitar acesso ao grupo.`,
      variant: 'danger',
      action: async () => {
        setProcessingId(userId);
        try {
          const result = await blockMember(userId);
          if (result.success) {
            toast({
              title: "Membro bloqueado",
              description: `${name} foi bloqueado do grupo.`
            });
            await fetchGroupMembers();
          }
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const handleUnblockMember = async (userId: string, name: string) => {
    setProcessingId(userId);
    try {
      const result = await unblockMember(userId);
      if (result.success) {
        toast({
          title: "Membro desbloqueado",
          description: `${name} foi desbloqueado.`
        });
        await fetchGroupMembers();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnlinkPlayer = async (member: GroupMember) => {
    setConfirmDialog({
      open: true,
      title: "Remover Vínculo",
      description: `Deseja remover o vínculo de ${member.name || member.email} com o jogador ${member.player_name}?`,
      variant: 'warning',
      action: async () => {
        setProcessingId(member.user_id);
        try {
          console.log('handleUnlinkPlayer: Removing link for user', member.user_id);
          const result = await linkPlayerToUser("", member.user_id);
          if (result.success) {
            await fetchGroupMembers();
          }
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const handleUpdateRole = async (userId: string, role: AppRole) => {
    setProcessingId(userId);
    try {
      const result = await updateUserRole(userId, role);
      if (result.success) {
        toast({
          title: "Cargo atualizado",
          description: "O cargo do membro foi alterado com sucesso."
        });
        await fetchGroupMembers();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleLinkPlayer = async () => {
    if (!linkingMember || !selectedPlayerId) return;
    
    setIsLinking(true);
    try {
      const result = await linkPlayerToUser(selectedPlayerId, linkingMember.user_id);
      if (result.success) {
        setLinkingMember(null);
        setSelectedPlayerId("");
        await fetchGroupMembers();
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

  const activeMembers = groupMembers.filter(m => m.role !== 'rejected');
  const blockedMembers = groupMembers.filter(m => m.role === 'rejected');

  if (groupMembers.length === 0 && !refreshingMembers) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="font-medium">Nenhum membro encontrado</p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => fetchGroupMembers()} 
          className="mt-2 rounded-xl font-bold"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Membros Ativos</h3>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-xl font-bold">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        {activeMembers.map((member) => (
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
                    <DropdownMenuItem onClick={() => handleUpdateRole(member.user_id, 'atleta')} className="gap-2 font-bold">
                      <User className="h-4 w-4" />
                      Atleta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateRole(member.user_id, 'financeiro')} className="gap-2 font-bold">
                      <DollarSign className="h-4 w-4" />
                      Financeiro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateRole(member.user_id, 'admin')} className="gap-2 font-bold">
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
                        onClick={() => handleUnlinkPlayer(member)} 
                        className="gap-2 font-bold text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                      >
                        <LinkIcon className="h-4 w-4 rotate-45" />
                        Remover Vínculo
                      </DropdownMenuItem>
                    )}
                    <div className="h-px bg-slate-100 my-1" />
                    <DropdownMenuItem 
                      disabled={!!processingId}
                      onClick={() => handleBlockMember(member.user_id, member.name || member.email)} 
                      className="gap-2 font-bold text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                    >
                      <Shield className="h-4 w-4" />
                      Bloquear Membro
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      disabled={!!processingId}
                      onClick={() => handleRemoveMember(member.user_id, member.name || member.email)} 
                      className="gap-2 font-bold text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      {processingId === member.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Remover do Grupo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </div>

      {blockedMembers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900">Membros Bloqueados</h3>
          {blockedMembers.map((member) => (
            <div 
              key={member.user_id} 
              className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50 transition-all gap-4"
            >
              <div className="flex-1">
                <span className="font-bold text-slate-900">{member.name || member.email}</span>
                <p className="text-sm text-slate-500 font-medium">{member.email}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleUnblockMember(member.user_id, member.name || member.email)}
                className="rounded-xl font-bold h-9 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Desbloquear
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">{confirmDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500 font-medium">
              {confirmDialog.description}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
              className="rounded-xl font-bold"
            >
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                await confirmDialog.action();
              }}
              className={cn(
                "rounded-xl font-bold",
                confirmDialog.variant === 'danger' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-primary hover:bg-primary/90"
              )}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
