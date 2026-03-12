import { useEffect } from "react";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, UserCheck, Shield, DollarSign, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PendingMembersProps {
  groupId: string;
}

const PendingMembers = ({ groupId }: PendingMembersProps) => {
  const { pendingUsers, fetchPendingUsers, approveUser, rejectUser } = useUserRole(groupId);

  useEffect(() => {
    fetchPendingUsers();
  }, [groupId, fetchPendingUsers]);

  const handleApprove = async (userId: string, role: AppRole) => {
    await approveUser(userId, role);
  };

  if (pendingUsers.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="font-medium">Nenhum usuário pendente de aprovação</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingUsers.map((pendingUser) => (
        <div 
          key={pendingUser.id} 
          className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/50 transition-all hover:bg-slate-50"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{pendingUser.name || pendingUser.email}</span>
              <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 font-bold">
                <Clock className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
            </div>
            <p className="text-sm text-slate-500 font-medium">{pendingUser.email}</p>
            {pendingUser.claimed_player_name && (
              <p className="text-xs text-primary font-bold mt-1">
                Solicitou vincular-se a: <span className="underline">{pendingUser.claimed_player_name}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aprovar como...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => handleApprove(pendingUser.user_id, 'atleta')} className="gap-2 font-bold">
                  <User className="h-4 w-4" />
                  Atleta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleApprove(pendingUser.user_id, 'financeiro')} className="gap-2 font-bold">
                  <DollarSign className="h-4 w-4" />
                  Financeiro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleApprove(pendingUser.user_id, 'admin')} className="gap-2 font-bold">
                  <Shield className="h-4 w-4" />
                  Admin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl font-bold"
              onClick={() => rejectUser(pendingUser.user_id)}
            >
              <X className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PendingMembers;
