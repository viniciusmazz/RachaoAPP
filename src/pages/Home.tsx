import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserGroups } from "@/hooks/useGroup";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Users, ExternalLink, Shield, Search, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Landing from "./Landing";
import type { Group } from "@/types/football";
import { toast } from "@/hooks/use-toast";

const Home = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { groups, loading: groupsLoading, createGroup, searchGroups } = useUserGroups();
  const { isSuperAdmin } = useUserRole();
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setSearching(true);
        const results = await searchGroups(searchQuery);
        setSearchResults(results);
        setSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchGroups]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSlug) return;
    setCreating(true);
    const group = await createGroup(newName, newSlug);
    setCreating(false);
    if (group) {
      setNewName("");
      setNewSlug("");
      setDialogOpen(false);
      navigate(`/${group.slug}`);
    }
  };

  const handleSlugChange = (value: string) => {
    setNewSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return <Landing />;
  }

  if (groupsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando grupos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <div className="container py-12 max-w-4xl">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gradient">
              Meus Grupos
            </h1>
            <p className="text-muted-foreground mt-3 text-lg max-w-md">
              Gerencie seus grupos de futebol e acompanhe estatísticas em tempo real.
            </p>
            <div className="flex items-center gap-2 mt-4 px-3 py-1.5 bg-secondary rounded-full w-fit">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-xs font-medium text-secondary-foreground">Logado como: {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin')} 
                className="flex items-center gap-2 rounded-full border-primary/20 hover:bg-primary/5 text-primary font-bold"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Geral</span>
              </Button>
            )}
            <Button 
              variant="ghost" 
              onClick={() => navigate('/profile')} 
              className="flex items-center gap-2 hover:bg-secondary transition-colors rounded-full"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </Button>
            <Button 
              variant="ghost" 
              onClick={async () => { await signOut(); navigate('/'); }} 
              className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors rounded-full"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        <div className="space-y-12">
          {/* Search Groups */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Procurar Grupos
            </h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Digite o nome do grupo para buscar..." 
                className="pl-11 h-14 rounded-2xl border-muted-foreground/20 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery.length >= 3 && (
              <Card className="rounded-3xl border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <CardContent className="p-4">
                  {searching ? (
                    <div className="py-8 text-center text-muted-foreground">Buscando...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">Nenhum grupo encontrado com esse nome.</div>
                  ) : (
                    <div className="grid gap-2">
                      {searchResults.map(g => (
                        <div 
                          key={g.id} 
                          onClick={() => navigate(`/${g.slug}`)}
                          className="flex items-center justify-between p-4 hover:bg-secondary rounded-2xl cursor-pointer transition-colors group"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{g.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">futebol.app/{g.slug}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </section>

          <div className="space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Seus Grupos
              </h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Grupo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Criar Novo Grupo</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-6 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="group-name" className="text-sm font-semibold">Nome do Grupo</Label>
                      <Input
                        id="group-name"
                        value={newName}
                        onChange={(e) => {
                          setNewName(e.target.value);
                          if (!newSlug || newSlug === newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) {
                            handleSlugChange(e.target.value);
                          }
                        }}
                        placeholder="Ex: Turma de Quinta"
                        className="rounded-xl border-muted-foreground/20 focus:ring-primary"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group-slug" className="text-sm font-semibold">URL do Grupo</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-2 rounded-lg border">futebol.app/</span>
                        <Input
                          id="group-slug"
                          value={newSlug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          placeholder="turma-de-quinta"
                          className="rounded-xl border-muted-foreground/20 font-mono"
                          required
                          minLength={3}
                          maxLength={50}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1 italic">Apenas letras minúsculas, números e hífens.</p>
                    </div>
                    <Button type="submit" className="w-full rounded-xl h-12 text-base font-bold" disabled={creating}>
                      {creating ? "Criando..." : "Criar Grupo"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {groups.length === 0 ? (
              <Card className="border-dashed border-2 bg-muted/30 rounded-3xl">
                <CardContent className="py-20 text-center">
                  <div className="bg-background w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Users className="h-10 w-10 text-muted-foreground opacity-30" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Nenhum grupo encontrado</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">
                    Você ainda não faz parte de nenhum grupo. Crie um agora para começar a gerenciar suas peladas!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className="group cursor-pointer border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-3xl overflow-hidden bg-card"
                    onClick={() => navigate(`/${group.slug}`)}
                  >
                    <div className="h-2 w-full bg-gradient-to-r from-primary to-emerald-400" />
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                          {group.name}
                        </CardTitle>
                        <div className="p-2 bg-secondary rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-1 font-mono text-xs">
                        <span className="text-primary/60">futebol.app/</span>
                        <span className="font-bold">{group.slug}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: group.settings.sides.home.color }}
                          />
                          <span className="text-xs font-bold uppercase tracking-wider">{group.settings.sides.home.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground px-2 py-1 bg-background rounded-md border">VS</span>
                        <div className="flex items-center gap-3 flex-row-reverse">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: group.settings.sides.away.color }}
                          />
                          <span className="text-xs font-bold uppercase tracking-wider">{group.settings.sides.away.name}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
