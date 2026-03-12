import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import PlayerForm from "@/components/players/PlayerForm";
import TeamAssignment from "@/components/match/TeamAssignment";
import Reports from "@/components/reports/Reports";
import FileUpload from "@/components/match/FileUpload";
import TeamSuggestion from "@/components/match/TeamSuggestion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Shield, Settings, DollarSign, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { usePlayers } from "@/hooks/usePlayers";
import { useMatches } from "@/hooks/useMatches";
import MatchHistory from "@/components/match/MatchHistory";
import PendingApprovalBanner from "@/components/PendingApprovalBanner";
import GroupSettingsComponent from "@/components/group/GroupSettings";
import FinancialModule from "@/components/financial/FinancialModule";
import PendingMembers from "@/components/group/PendingMembers";
import GroupMembers from "@/components/group/GroupMembers";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useUserGroups } from "@/hooks/useGroup";
import type { Teams, Group, MatchEvent } from "@/types/football";

interface IndexProps {
  group: Group;
  refreshGroup?: () => Promise<void>;
}

const Index = ({ group, refreshGroup }: IndexProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { 
    role, 
    loading: roleLoading, 
    isAdmin, 
    isFinanceiro,
    isApproved, 
    isPending: isGlobalPending,
    requestAccess
  } = useUserRole(group.id);
  const { players, loading: playersLoading, addPlayer, removePlayer, editPlayer, loadUserPlayers } = usePlayers(group.id);
  const { matches, loading: matchesLoading, saveMatch, updateMatch, deleteMatch } = useMatches(group.id);
  const { updateGroup } = useUserGroups();
  const [date, setDate] = useState<Date>(new Date());
  const [teams, setTeams] = useState<Teams>({ azul: [], vermelho: [] });
  const [reportFilePath, setReportFilePath] = useState<string | null>(null);
  const [observations, setObservations] = useState<string>("");
  const [requestingAccess, setRequestingAccess] = useState(false);
  
  const isOwner = user?.id === group.ownerId;
  const isPending = isGlobalPending && !isOwner;
  const isPrivate = group.settings.visibility === 'private';
  const hasAccess = !isPrivate || isApproved || isOwner;

  const handleRequestAccess = async () => {
    setRequestingAccess(true);
    const result = await requestAccess();
    if (result.success) {
      toast({
        title: "Solicitação enviada",
        description: "Aguarde a aprovação do administrador do grupo."
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação",
        variant: "destructive"
      });
    }
    setRequestingAccess(false);
  };

  // Navigation helper for protected actions
  const handleProtectedAction = () => {
    if (!user) {
      navigate('/auth');
      return false;
    }
    return true;
  };

  // Carregar estado da partida atual do localStorage apenas quando autenticado
  useEffect(() => {
    if (!user) return;
    
    try {
      const savedCurrentMatch = localStorage.getItem('football:currentMatch')
      if (savedCurrentMatch) {
        const parsed = JSON.parse(savedCurrentMatch)
        setDate(new Date(parsed.date))
        setTeams(parsed.teams || { azul: [], vermelho: [] })
        setReportFilePath(parsed.reportFilePath || null)
        setObservations(parsed.observations || "")
      }
    } catch (error) {
      console.error('Erro ao carregar partida atual:', error)
    }
  }, [user])

  // Salvar estado da partida atual no localStorage sempre que houver mudanças
  useEffect(() => {
    if (!user) return;
    
    const currentMatch = {
      date: date.toISOString(),
      teams,
      reportFilePath,
      observations
    }
    localStorage.setItem('football:currentMatch', JSON.stringify(currentMatch))
  }, [date, teams, reportFilePath, observations, user])


  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };


  const canSave = teams.azul.length > 0 && teams.vermelho.length > 0;

  const handleSaveMatch = async () => {
    if (!canSave) return;
    try {
      // Converte os dados para o formato legado de events para manter compatibilidade
      const createTeamEvents = (teamPlayers: typeof teams.azul, teamColor: "azul" | "vermelho") => {
        const goalEvents: MatchEvent[] = [];
        const otherEvents: MatchEvent[] = [];
        
        // Build flat queue of assists to distribute
        const assistQueue: string[] = [];
        for (const player of teamPlayers) {
          for (let i = 0; i < (player.assists || 0); i++) {
            assistQueue.push(player.playerId);
          }
        }
        
        // Create goal events
        for (const player of teamPlayers) {
          for (let i = 0; i < (player.goals || 0); i++) {
            goalEvents.push({
              id: `${player.playerId}-goal-${i}`,
              team: teamColor,
              scorerId: player.playerId,
            });
          }
          
          // Own goals
          for (let i = 0; i < (player.ownGoals || 0); i++) {
            otherEvents.push({
              id: `${player.playerId}-owngoal-${i}`,
              team: teamColor === "azul" ? "vermelho" : "azul",
              scorerId: player.playerId,
              isOwnGoal: true,
            });
          }
        }
        
        // Distribute assists to goals, preferring non-self-assists
        for (const goal of goalEvents) {
          if (assistQueue.length === 0) break;
          
          const nonSelfIdx = assistQueue.findIndex(id => id !== goal.scorerId);
          if (nonSelfIdx !== -1) {
            goal.assistId = assistQueue[nonSelfIdx];
            assistQueue.splice(nonSelfIdx, 1);
          } else {
            // Only self-assists remain, assign anyway
            goal.assistId = assistQueue.shift();
          }
        }
        
        return [...goalEvents, ...otherEvents];
      };
      
      const events = [
        ...createTeamEvents(teams.azul, "azul"),
        ...createTeamEvents(teams.vermelho, "vermelho"),
      ];
      
      await saveMatch({
        date,
        teams,
        events,
        reportFilePath: reportFilePath || undefined,
        observations: observations || undefined,
      });

      // Limpar formulário após salvar com sucesso
      setDate(new Date());
      setTeams({ azul: [], vermelho: [] });
      setReportFilePath(null);
      setObservations("");
      localStorage.removeItem('football:currentMatch');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a partida",
        variant: "destructive"
      })
    }
  };

  const handleNewMatch = () => {
    setDate(new Date())
    setTeams({ azul: [], vermelho: [] })
    setReportFilePath(null)
    setObservations("")
    localStorage.removeItem('football:currentMatch')
    toast({
      title: "Nova Partida",
      description: "Partida resetada para começar um novo jogo"
    })
  };

  // Show loading while checking auth (only for players/matches data)
  if (authLoading || roleLoading || playersLoading || matchesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 animate-spin">
              <span className="text-white font-black text-xl">F</span>
            </div>
          </div>
          <p className="text-slate-500 font-bold animate-pulse">Preparando o campo...</p>
        </div>
      </div>
    );
  }

  // Check if user can access protected features (must be owner or approved)
  const canAccessProtectedFeatures = user && (isOwner || isApproved);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="container py-10 max-w-6xl">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-slate-100 shrink-0 overflow-hidden">
              {group.settings.logoUrl ? (
                <img 
                  src={group.settings.logoUrl} 
                  alt={group.name} 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    console.error('Group Logo Error:', group.name);
                    (e.target as HTMLImageElement).style.display = 'none';
                    // Show fallback
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = "w-full h-full bg-primary/5 flex items-center justify-center text-primary font-black text-2xl";
                      fallback.innerText = group.name.substring(0, 1).toUpperCase();
                      parent.appendChild(fallback);
                    }
                  }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary font-black text-2xl">
                  {group.name.substring(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">{group.name}</h1>
              <p className="text-slate-500 font-medium mt-1">
                {canAccessProtectedFeatures ? 'Gerencie jogadores e partidas, visualize estatísticas.' : 'Visualize estatísticas das partidas.'}
              </p>
              {user && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logado como: {user.email}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isApproved && !isPending && user && (
              <Button 
                onClick={handleRequestAccess} 
                disabled={requestingAccess}
                className="rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
              >
                {requestingAccess ? "Solicitando..." : "Solicitar Acesso"}
              </Button>
            )}
            {user && (
              <Button variant="outline" onClick={() => navigate('/')} className="rounded-xl border-slate-200 font-bold hover:bg-slate-100 transition-all">
                Meus Grupos
              </Button>
            )}
            {user ? (
              <Button variant="ghost" onClick={handleSignOut} className="rounded-xl font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth')} className="rounded-xl font-bold shadow-lg shadow-primary/20">
                Fazer Login
              </Button>
            )}
          </div>
        </header>

        {user && isPending && <PendingApprovalBanner />}

        {!hasAccess ? (
          <main className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-10 border border-slate-100 text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="h-10 w-10 text-slate-400" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Grupo Privado</h2>
              <p className="text-slate-500 font-medium">Este grupo é privado. Você precisa solicitar acesso para visualizar as informações.</p>
            </div>
            {!user ? (
              <Button onClick={() => navigate('/auth')} className="rounded-xl font-bold h-12 px-8">Fazer Login para Solicitar</Button>
            ) : (
              <Button 
                onClick={handleRequestAccess} 
                disabled={requestingAccess}
                className="rounded-xl font-bold h-12 px-8 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
              >
                {requestingAccess ? "Solicitando..." : "Solicitar Acesso"}
              </Button>
            )}
          </main>
        ) : (
          <main className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-6 md:p-10 border border-slate-100">
            <Tabs defaultValue="relatorios" className="space-y-8">
            <TabsList className="flex flex-wrap h-auto p-1 bg-slate-100/50 rounded-2xl gap-1">
              <TabsTrigger value="relatorios" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Estatísticas</TabsTrigger>
              <TabsTrigger value="historico" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Histórico</TabsTrigger>
              {canAccessProtectedFeatures && (
                <>
                  <TabsTrigger value="cadastro" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Jogadores</TabsTrigger>
                  <TabsTrigger value="escalacao" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Escalação</TabsTrigger>
                  <TabsTrigger value="partida" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Partida</TabsTrigger>
                </>
              )}
              {isFinanceiro && (
                <TabsTrigger value="financeiro" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financeiro
                </TabsTrigger>
              )}
            {isAdmin && (
              <TabsTrigger value="configuracoes" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Settings className="h-4 w-4" />
                Config
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="membros" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Users className="h-4 w-4" />
                Membros
              </TabsTrigger>
            )}
          </TabsList>
            
            <div className="mt-8">
              <TabsContent value="relatorios" className="mt-0 focus-visible:ring-0">
                <section aria-labelledby="relatorios-title" className="space-y-6">
                  <h2 id="relatorios-title" className="sr-only">Estatísticas</h2>
                  <Reports matches={matches} players={players} group={group} />
                </section>
              </TabsContent>
              
              <TabsContent value="historico" className="mt-0 focus-visible:ring-0">
                <section aria-labelledby="historico-title" className="space-y-6">
                  <h2 id="historico-title" className="sr-only">Histórico de Partidas</h2>
                  <MatchHistory matches={matches} players={players} onMatchUpdate={updateMatch} onMatchDelete={deleteMatch} group={group} />
                </section>
              </TabsContent>

              {canAccessProtectedFeatures && (
                <>
                  <TabsContent value="cadastro" className="mt-0 focus-visible:ring-0">
                    <section aria-labelledby="cadastro-title" className="space-y-6">
                      <h2 id="cadastro-title" className="sr-only">Cadastro de Jogadores</h2>
                      <PlayerForm 
                        players={players} 
                        onAdd={addPlayer} 
                        onRemove={removePlayer} 
                        onEdit={editPlayer}
                        onLoadUserPlayers={loadUserPlayers}
                        isAuthenticated={!!user}
                      />
                    </section>
                  </TabsContent>

                  <TabsContent value="escalacao" className="mt-0 focus-visible:ring-0">
                    <section aria-labelledby="escalacao-title" className="space-y-6">
                      <h2 id="escalacao-title" className="sr-only">Sugestão de Escalação</h2>
                      <TeamSuggestion players={players} matches={matches} onApply={setTeams} group={group} />
                    </section>
                  </TabsContent>
                  
                  <TabsContent value="partida" className="mt-0 focus-visible:ring-0">
                    <section aria-labelledby="partida-title" className="space-y-8">
                      <h2 id="partida-title" className="sr-only">Configurar Partida</h2>
                      <div className="grid gap-8">
                        <TeamAssignment players={players} teams={teams} onTeamsChange={setTeams} date={date} onDateChange={(d) => setDate(d)} group={group} />
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                          <FileUpload onFileUpload={setReportFilePath} existingFilePath={reportFilePath || undefined} />
                          <div className="space-y-3">
                            <label htmlFor="observations" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Observações da Partida</label>
                            <textarea
                              id="observations"
                              className="flex min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                              placeholder="Anotações sobre a partida, destaques, etc..."
                              value={observations}
                              onChange={(e) => setObservations(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-100">
                        <Button 
                          onClick={handleNewMatch}
                          variant="outline"
                          className="h-12 px-8 rounded-xl font-bold border-slate-200"
                        >
                          Nova Partida
                        </Button>
                        <Button 
                          onClick={handleSaveMatch} 
                          disabled={!canSave}
                          className="h-12 px-10 rounded-xl font-bold shadow-lg shadow-primary/20"
                        >
                          Salvar Partida
                        </Button>
                      </div>
                    </section>
                  </TabsContent>
                </>
              )}

              {isFinanceiro && (
                <TabsContent value="financeiro" className="mt-0 focus-visible:ring-0">
                  <section aria-labelledby="financeiro-title" className="space-y-6">
                    <h2 id="financeiro-title" className="sr-only">Controle Financeiro</h2>
                    <ErrorBoundary>
                      <FinancialModule groupId={group.id} players={players} isOwner={isOwner} />
                    </ErrorBoundary>
                  </section>
                </TabsContent>
              )}

              {isAdmin && (
                <TabsContent value="configuracoes" className="mt-0 focus-visible:ring-0">
                  <GroupSettingsComponent
                    group={group}
                    onSave={async (settings, name, slug) => {
                      const success = await updateGroup(group.id, { settings, name, slug });
                      if (success && refreshGroup) {
                        await refreshGroup();
                      }
                      return success;
                    }}
                  />
                </TabsContent>
              )}

              {isAdmin && (
                <TabsContent value="membros" className="mt-0 focus-visible:ring-0">
                  <section aria-labelledby="membros-title" className="space-y-6">
                    <h2 id="membros-title" className="sr-only">Gerenciar Membros</h2>
                    
                    <div className="grid gap-6">
                      <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="text-xl font-black tracking-tight">Membros do Grupo</CardTitle>
                          <CardDescription className="font-medium">Gerencie os níveis de acesso dos membros</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                          <GroupMembers groupId={group.id} ownerId={group.ownerId} />
                        </CardContent>
                      </Card>

                      <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="text-xl font-black tracking-tight">Aprovações Pendentes</CardTitle>
                          <CardDescription className="font-medium">Usuários que solicitaram acesso a este grupo</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                          <PendingMembers groupId={group.id} />
                        </CardContent>
                      </Card>
                    </div>
                  </section>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </main>
      )}
    </div>
    </div>
  );
};

export default Index;