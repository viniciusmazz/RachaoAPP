import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Palette, Type, BarChart3, Save, Lock, Globe, Upload, Image as ImageIcon } from "lucide-react";
import type { Group, GroupSettings as GroupSettingsType, StatType, SideConfig } from "@/types/football";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GroupSettingsProps {
  group: Group;
  onSave: (settings: GroupSettingsType, name?: string, slug?: string) => Promise<boolean>;
}

const STAT_OPTIONS: { value: StatType; label: string; description: string }[] = [
  { value: "goals", label: "Gols", description: "Contabilizar gols marcados" },
  { value: "assists", label: "Assistências", description: "Contabilizar assistências" },
  { value: "ownGoals", label: "Gols Contra", description: "Contabilizar gols contra" },
  { value: "fieldGoals", label: "Field Goals", description: "Bola chutada por cima do alambrado" },
  { value: "cards", label: "Cartões", description: "Cartões amarelos e vermelhos" },
  { value: "fouls", label: "Faltas", description: "Contabilizar faltas cometidas" },
  { value: "saves", label: "Defesas", description: "Defesas do goleiro por partida" },
  { value: "ratings", label: "Avaliações", description: "Notas de 1-10 por jogador" },
];

const GroupSettingsComponent = ({ group, onSave }: GroupSettingsProps) => {
  const [name, setName] = useState(group.name);
  const [slug, setSlug] = useState(group.slug);
  const [logoUrl, setLogoUrl] = useState<string | null>(group.settings.logoUrl || null);
  const [homeSide, setHomeSide] = useState<SideConfig>({ ...group.settings.sides.home });
  const [awaySide, setAwaySide] = useState<SideConfig>({ ...group.settings.sides.away });
  const [enabledStats, setEnabledStats] = useState<StatType[]>([...group.settings.enabledStats]);
  const [visibility, setVisibility] = useState<"public" | "private">(group.settings.visibility || "public");
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleStat = (stat: StatType) => {
    setEnabledStats(prev =>
      prev.includes(stat) ? prev.filter(s => s !== stat) : [...prev, stat]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const settings: GroupSettingsType = {
      logoUrl,
      sides: { home: homeSide, away: awaySide },
      enabledStats,
      visibility,
      roles: group.settings.roles,
    };
    await onSave(
      settings,
      name !== group.name ? name : undefined,
      slug !== group.slug ? slug : undefined,
    );
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Group Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            <CardTitle>Informações do Grupo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="space-y-2">
              <Label>Logo do Grupo</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 rounded-2xl border-2 border-slate-100 shadow-sm">
                  <AvatarImage src={logoUrl || ""} className="object-contain" />
                  <AvatarFallback className="bg-slate-50 text-slate-400">
                    <ImageIcon className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="relative overflow-hidden"
                    asChild
                  >
                    <label className="cursor-pointer flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Logo
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, setLogoUrl)} 
                      />
                    </label>
                  </Button>
                  {logoUrl && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 block"
                      onClick={() => setLogoUrl(null)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="space-y-2">
                <Label>Nome do Grupo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>URL (slug)</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">rachao.app.br/</span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {visibility === 'public' ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            <CardTitle>Visibilidade do Grupo</CardTitle>
          </div>
          <CardDescription>Configure se o grupo é aberto para qualquer pessoa ou restrito</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-0.5">
              <Label className="text-base font-bold">Grupo {visibility === 'public' ? 'Público' : 'Privado'}</Label>
              <p className="text-sm text-muted-foreground">
                {visibility === 'public' 
                  ? 'Qualquer pessoa com o link pode visualizar as estatísticas e histórico.' 
                  : 'Apenas membros aprovados podem visualizar as informações do grupo.'}
              </p>
            </div>
            <Switch 
              checked={visibility === 'private'} 
              onCheckedChange={(checked) => setVisibility(checked ? 'private' : 'public')} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Sides */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Times</CardTitle>
          </div>
          <CardDescription>Configure nomes, cores e escudos dos dois lados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Home Side */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Time da Casa</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={homeSide.name}
                  onChange={(e) => setHomeSide(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={homeSide.color}
                    onChange={(e) => setHomeSide(prev => ({ ...prev, color: e.target.value }))}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={homeSide.color}
                    onChange={(e) => setHomeSide(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Escudo do Time (Upload)</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 rounded-lg border shadow-sm">
                  <AvatarImage src={homeSide.logoUrl || ""} className="object-contain" />
                  <AvatarFallback className="text-[10px]">ESC</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    Selecionar Imagem
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, (url) => setHomeSide(prev => ({ ...prev, logoUrl: url })))} 
                    />
                  </label>
                </Button>
                {homeSide.logoUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setHomeSide(prev => ({ ...prev, logoUrl: null }))}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ou URL do Escudo</Label>
              <Input
                value={homeSide.logoUrl || ""}
                onChange={(e) => setHomeSide(prev => ({ ...prev, logoUrl: e.target.value || null }))}
                placeholder="https://exemplo.com/escudo.png"
              />
            </div>
          </div>

          <Separator />

          {/* Away Side */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Time Visitante</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={awaySide.name}
                  onChange={(e) => setAwaySide(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={awaySide.color}
                    onChange={(e) => setAwaySide(prev => ({ ...prev, color: e.target.value }))}
                    className="h-10 w-14 rounded border cursor-pointer"
                  />
                  <Input
                    value={awaySide.color}
                    onChange={(e) => setAwaySide(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Escudo do Time (Upload)</Label>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 rounded-lg border shadow-sm">
                  <AvatarImage src={awaySide.logoUrl || ""} className="object-contain" />
                  <AvatarFallback className="text-[10px]">ESC</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    Selecionar Imagem
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, (url) => setAwaySide(prev => ({ ...prev, logoUrl: url })))} 
                    />
                  </label>
                </Button>
                {awaySide.logoUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setAwaySide(prev => ({ ...prev, logoUrl: null }))}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ou URL do Escudo</Label>
              <Input
                value={awaySide.logoUrl || ""}
                onChange={(e) => setAwaySide(prev => ({ ...prev, logoUrl: e.target.value || null }))}
                placeholder="https://exemplo.com/escudo.png"
              />
            </div>
          </div>

          {/* Preview */}
          <Separator />
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="text-center">
              {homeSide.logoUrl && (
                <img src={homeSide.logoUrl} alt={homeSide.name} className="w-12 h-12 mx-auto mb-2 object-contain" />
              )}
              <div className="w-8 h-8 rounded-full mx-auto border-2" style={{ backgroundColor: homeSide.color }} />
              <span className="text-sm font-medium mt-1 block">{homeSide.name}</span>
            </div>
            <span className="text-lg font-bold text-muted-foreground">VS</span>
            <div className="text-center">
              {awaySide.logoUrl && (
                <img src={awaySide.logoUrl} alt={awaySide.name} className="w-12 h-12 mx-auto mb-2 object-contain" />
              )}
              <div className="w-8 h-8 rounded-full mx-auto border-2" style={{ backgroundColor: awaySide.color }} />
              <span className="text-sm font-medium mt-1 block">{awaySide.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle>Estatísticas</CardTitle>
          </div>
          <CardDescription>Escolha quais métricas acompanhar nas partidas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {STAT_OPTIONS.map((stat) => (
              <div key={stat.value} className="flex items-center space-x-3">
                <Checkbox
                  id={`stat-${stat.value}`}
                  checked={enabledStats.includes(stat.value)}
                  onCheckedChange={() => toggleStat(stat.value)}
                />
                <div className="flex-1">
                  <label htmlFor={`stat-${stat.value}`} className="text-sm font-medium cursor-pointer">
                    {stat.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
};

export default GroupSettingsComponent;
