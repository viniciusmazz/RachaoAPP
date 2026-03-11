import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Player, PlayerType, PlayerPosition, PositionSkill } from "@/types/football";

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: "goleiro", label: "Goleiro" },
  { value: "zagueiro", label: "Zagueiro" },
  { value: "lateral", label: "Lateral" },
  { value: "volante", label: "Volante" },
  { value: "meia", label: "Meia" },
  { value: "atacante", label: "Atacante" },
];

interface PlayerFormProps {
  players: Player[];
  onAdd: (player: Omit<Player, 'id'>) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, player: Omit<Player, 'id'>) => void;
  onLoadUserPlayers?: () => void;
  isAuthenticated?: boolean;
}

export default function PlayerForm({ 
  players, 
  onAdd, 
  onRemove, 
  onEdit, 
  onLoadUserPlayers, 
  isAuthenticated = false 
}: PlayerFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PlayerType>("mensalista");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionSkill[]>([]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const playerData = { name: name.trim(), type, photoUrl: preview, positions };
    if (editingId) {
      onEdit(editingId, playerData);
    } else {
      onAdd(playerData);
    }
    clearForm();
  };

  const clearForm = () => {
    setName("");
    setPreview(undefined);
    setPhotoFile(null);
    setType("mensalista");
    setEditingId(null);
    setPositions([]);
  };

  const handleEdit = (player: Player) => {
    setName(player.name);
    setType(player.type);
    setPreview(player.photoUrl);
    setEditingId(player.id);
    setPositions(player.positions || []);
  };

  const togglePosition = (pos: PlayerPosition) => {
    setPositions(prev => {
      const exists = prev.find(p => p.position === pos);
      if (exists) return prev.filter(p => p.position !== pos);
      return [...prev, { position: pos, skill: 3 }];
    });
  };

  const updateSkill = (pos: PlayerPosition, skill: number) => {
    setPositions(prev => prev.map(p => p.position === pos ? { ...p, skill } : p));
  };

  const getPositionLabel = (pos: PlayerPosition) => POSITIONS.find(p => p.value === pos)?.label ?? pos;

  const mensalistas = players.filter(p => p.type === "mensalista").sort((a, b) => a.name.localeCompare(b.name));
  const convidados = players.filter(p => p.type === "convidado").sort((a, b) => a.name.localeCompare(b.name));

  const renderPlayerList = (list: Player[]) => (
    <ul className="space-y-3">
      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado.</p>
      )}
      {list.map((p) => (
        <li key={p.id} className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={p.photoUrl} alt={`Foto de ${p.name}`} />
              <AvatarFallback>
                {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {p.positions?.map(ps => (
                  <Badge key={ps.position} variant="outline" className="text-xs">
                    {getPositionLabel(ps.position)} ({ps.skill})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleEdit(p)}>Editar</Button>
            <Button variant="destructive" size="sm" onClick={() => onRemove(p.id)}>Remover</Button>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Form - sticky on desktop */}
      <div className="md:sticky md:top-6 md:self-start">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar Jogador" : "Novo Jogador"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Tipo</label>
              <Select value={type} onValueChange={(v) => setType(v as PlayerType)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensalista">Mensalista</SelectItem>
                  <SelectItem value="convidado">Convidado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Foto do atleta</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setPhotoFile(file);
                  if (!file) { setPreview(undefined); return; }
                  const reader = new FileReader();
                  reader.onload = () => setPreview(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              {preview && (
                <div className="flex items-center gap-3 pt-1">
                  <Avatar><AvatarImage src={preview} alt="Pré-visualização" /><AvatarFallback>FT</AvatarFallback></Avatar>
                  <span className="text-xs text-muted-foreground truncate">{photoFile?.name}</span>
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <Label className="text-sm font-medium">Posições e Habilidades</Label>
              <div className="flex flex-wrap gap-3">
                {POSITIONS.map(pos => {
                  const selected = positions.find(p => p.position === pos.value);
                  return (
                    <div key={pos.value} className="flex items-center gap-2">
                      <Checkbox id={`pos-${pos.value}`} checked={!!selected} onCheckedChange={() => togglePosition(pos.value)} />
                      <label htmlFor={`pos-${pos.value}`} className="text-sm cursor-pointer">{pos.label}</label>
                    </div>
                  );
                })}
              </div>
              {positions.length > 0 && (
                <div className="space-y-3 rounded-md border p-3">
                  {positions.map(ps => (
                    <div key={ps.position} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{getPositionLabel(ps.position)}</span>
                        <span className="text-sm font-bold text-primary">{ps.skill}/5</span>
                      </div>
                      <Slider min={1} max={5} step={1} value={[ps.skill]} onValueChange={([v]) => updateSkill(ps.position, v)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit}>{editingId ? "Salvar" : "Adicionar"}</Button>
              {editingId && <Button variant="outline" onClick={clearForm}>Cancelar</Button>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Player list with tabs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Jogadores ({players.length})</CardTitle>
            {isAuthenticated && onLoadUserPlayers && (
              <Button variant="outline" size="sm" onClick={onLoadUserPlayers}>Ver Meus Jogadores</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mensalistas">
            <TabsList className="mb-4">
              <TabsTrigger value="mensalistas">Mensalistas ({mensalistas.length})</TabsTrigger>
              <TabsTrigger value="convidados">Convidados ({convidados.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="mensalistas">{renderPlayerList(mensalistas)}</TabsContent>
            <TabsContent value="convidados">{renderPlayerList(convidados)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
