import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X, Users, Clock, Shield, UserCheck, Settings, Upload, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface AllUser {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  email: string;
  name: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    role, 
    loading: roleLoading, 
    isAdmin, 
    isSuperAdmin,
    pendingUsers, 
    fetchPendingUsers,
    approveUser,
    rejectUser 
  } = useUserRole();

  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { appLogo: currentLogo, loading: settingsLoading } = useAppSettings();
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);

  useEffect(() => {
    if (currentLogo) {
      setAppLogo(currentLogo);
    }
  }, [currentLogo]);

  console.log('Admin Page - User:', user?.email, 'isSuperAdmin:', isSuperAdmin, 'role:', role);

  const isSuperAdminCheck = user?.email?.toLowerCase().trim() === 'viniciusmazz@gmail.com';

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      console.log('Admin Access Check:', {
        userEmail: user?.email,
        isSuperAdminFromHook: isSuperAdmin,
        isSuperAdminFromLocal: isSuperAdminCheck,
        roleLoading,
        authLoading
      });

      if (!user) {
        navigate('/auth');
      } else if (!isSuperAdmin && !isSuperAdminCheck) {
        navigate('/');
        toast({
          title: "Acesso negado",
          description: `Apenas o administrador geral pode acessar esta página. Logado como: ${user.email}`,
          variant: "destructive"
        });
      }
    }
  }, [user, authLoading, roleLoading, isSuperAdmin, isSuperAdminCheck, navigate]);

  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .order('created_at', { ascending: false });

      if (rolesError) {
        console.error('Error fetching users:', rolesError);
        return;
      }

      if (!rolesData || rolesData.length === 0) {
        setAllUsers([]);
        return;
      }

      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const users: AllUser[] = rolesData.map(r => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role as AppRole,
        created_at: r.created_at,
        email: profilesMap.get(r.user_id)?.email || 'Email não encontrado',
        name: profilesMap.get(r.user_id)?.name || null
      }));

      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchAppSettings = useCallback(async () => {
    try {
      console.log('Fetching app settings from groups table...');
      const { data, error } = await supabase
        .from('groups')
        .select('settings')
        .eq('slug', 'app-settings')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching app settings:', error);
        return;
      }
      
      if (data && data.settings && typeof data.settings === 'object') {
        const settings = data.settings as Record<string, unknown>;
        if (settings.appLogo && typeof settings.appLogo === 'string') {
          console.log('App logo found in database');
          setAppLogo(settings.appLogo);
        } else {
          console.log('App logo not found in database');
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching app settings:', error);
    }
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O logo deve ter no máximo 2MB",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setAppLogo(base64String);
    };
    reader.readAsDataURL(file);
  };

  const saveAppLogo = async () => {
    if (!user) return;
    console.log('Saving app logo to groups table. Length:', appLogo?.length || 0);
    setSavingLogo(true);
    try {
      // First, try to find if the settings group exists
      const { data: existingGroup } = await supabase
        .from('groups')
        .select('id, settings')
        .eq('slug', 'app-settings')
        .maybeSingle();

      if (existingGroup) {
        // Update existing
        const settings = (existingGroup.settings as Record<string, unknown>) || {};
        const { error } = await supabase
          .from('groups')
          .update({ 
            settings: { 
              ...settings, 
              appLogo: appLogo 
            } 
          })
          .eq('id', existingGroup.id);
        
        if (error) throw error;
      } else {
        // Create new system group for settings
        const { error } = await supabase
          .from('groups')
          .insert({
            slug: 'app-settings',
            name: 'Configurações do Sistema',
            owner_id: user.id,
            settings: { appLogo: appLogo }
          });
        
        if (error) throw error;
      }

      toast({
        title: "Configurações salvas",
        description: "O logo do aplicativo foi atualizado com sucesso no banco de dados."
      });
      
      // Force a small delay then reload to ensure all components see the change
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error saving app logo:', err);
      toast({
        title: "Erro ao salvar logo",
        description: err.message || "Não foi possível salvar o logo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSavingLogo(false);
    }
  };

  const handleApprove = async (userRoleId: string, email: string, newRole: AppRole = 'approved') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', userRoleId);

      if (error) throw error;

      toast({
        title: "Usuário aprovado",
        description: `${email} foi aprovado como ${newRole === 'admin' ? 'Administrador' : 'Usuário Aprovado'}`
      });
      
      await fetchPendingUsers();
      await fetchAllUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o usuário",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (userRoleId: string, email: string) => {
    const result = await rejectUser(userRoleId);
    if (result.success) {
      toast({
        title: "Usuário rejeitado",
        description: `${email} foi rejeitado`
      });
      await fetchAllUsers();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar o usuário",
        variant: "destructive"
      });
    }
  };

  const handleChangeRole = async (userRoleId: string, newRole: AppRole, email: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', userRoleId);

      if (error) throw error;

      toast({
        title: "Nível de acesso alterado",
        description: `${email} agora é ${getRoleName(newRole)}`
      });
      
      await fetchAllUsers();
      await fetchPendingUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o nível de acesso",
        variant: "destructive"
      });
    }
  };

  const getRoleName = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'default';
      case 'approved': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  // Show loading while auth or role is being determined
  if (authLoading || roleLoading || (user && role === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Only show null if we CONFIRMED user is not super admin
  if (!user || (role !== null && !isSuperAdmin)) {
    return null;
  }

  const approvedUsers = allUsers.filter(u => u.role !== 'pending');

  return (
    <div className="container py-10 max-w-4xl">
      <header className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Administração</h1>
        <p className="text-muted-foreground mt-2">Gerencie aprovações e níveis de acesso dos usuários</p>
      </header>

      <main className="space-y-6 pb-20">
        {/* Global Settings Card */}
        <Card className="border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>Configurações do Aplicativo</CardTitle>
            </div>
            <CardDescription>
              Personalize a aparência global do RachãoApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700">Logo do Aplicativo (Landing e Login)</label>
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-32 h-32 bg-white rounded-2xl shadow-inner border flex items-center justify-center overflow-hidden shrink-0">
                  {appLogo ? (
                    <img src={appLogo} alt="App Logo Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-slate-300 text-xs text-center p-2">Sem logo personalizado</div>
                  )}
                </div>
                <div className="flex-1 space-y-3 w-full">
                  <p className="text-xs text-slate-500">
                    Este logo aparecerá na página inicial e na tela de login. 
                    Recomendamos uma imagem PNG transparente de pelo menos 512x512px.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="relative overflow-hidden"
                      asChild
                    >
                      <label className="cursor-pointer flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Selecionar Imagem
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                        />
                      </label>
                    </Button>
                    {appLogo && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setAppLogo(null)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      className="ml-auto"
                      onClick={saveAppLogo}
                      disabled={savingLogo}
                    >
                      {savingLogo ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Users Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <CardTitle>Usuários Pendentes</CardTitle>
            </div>
            <CardDescription>
              Usuários aguardando aprovação para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário pendente de aprovação</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((pendingUser) => (
                  <div 
                    key={pendingUser.id} 
                    className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pendingUser.name || pendingUser.email}</span>
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Pendente
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cadastrado em: {new Date(pendingUser.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(value) => handleApprove(pendingUser.id, pendingUser.email, value as AppRole)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Aprovar como..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4" />
                              Usuário Aprovado
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Administrador
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleReject(pendingUser.id, pendingUser.email)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Users Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Todos os Usuários</CardTitle>
            </div>
            <CardDescription>
              Gerencie o nível de acesso de todos os usuários cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Carregando usuários...</p>
              </div>
            ) : approvedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvedUsers.map((appUser) => (
                  <div 
                    key={appUser.id} 
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{appUser.name || appUser.email}</span>
                        <Badge variant={getRoleBadgeVariant(appUser.role)}>
                          {appUser.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                          {getRoleName(appUser.role)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{appUser.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {appUser.user_id !== user?.id && (
                        <Select
                          value={appUser.role}
                          onValueChange={(value) => handleChangeRole(appUser.id, value as AppRole, appUser.email)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved">
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4" />
                                Aprovado
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Administrador
                              </div>
                            </SelectItem>
                            <SelectItem value="pending">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Pendente
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {appUser.user_id === user?.id && (
                        <span className="text-sm text-muted-foreground italic">Você</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
