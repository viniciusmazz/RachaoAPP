

## Plano: Aproveitamento por cor por jogador + Posições e habilidades

### Parte 1: Aproveitamento por cor no modal de Pontuação

No modal "Pontuação - Detalhes" (dentro do `RankingCard` em `Reports.tsx`), adicionar duas colunas: **Az%** e **Vm%** mostrando o aproveitamento do jogador quando joga no azul e quando joga no vermelho.

**Lógica:**
- Para cada jogador, iterar pelas partidas filtradas e verificar em qual time ele estava (azul ou vermelho)
- Calcular vitórias/empates/derrotas separadamente por cor
- Aproveitamento = `Math.round((pontos / (jogos * 3)) * 100)` (mesmo critério de arredondamento)
- Se o jogador nunca jogou naquela cor, exibir "—"

**Alterações em `Reports.tsx`:**
- Expandir `PlayerStats` com `pontosAzul`, `jogosAzul`, `pontosVermelho`, `jogosVermelho`
- Na função `calculatePlayerStats`, acumular pontos por cor separadamente
- No `RankingCard`, adicionar colunas "Az%" e "Vm%" na tabela do modal, com as porcentagens arredondadas via `Math.round()`

### Parte 2: Posições e habilidades no cadastro de jogadores

**Migração no banco (players):**
- Adicionar coluna `positions` (JSONB, default `'[]'`) — array de objetos `{ position: string, skill: number }`
- Posições disponíveis: Goleiro, Zagueiro, Lateral, Meia, Atacante (ou similar)
- Habilidade: nota de 1 a 5

**Alterações no tipo `Player` (`src/types/football.ts`):**
```
export type PlayerPosition = "goleiro" | "zagueiro" | "lateral" | "meia" | "atacante";

export interface PositionSkill {
  position: PlayerPosition;
  skill: number; // 1-5
}
```
- Adicionar `positions?: PositionSkill[]` ao `Player`

**Alterações no formulário (`PlayerForm.tsx`):**
- Adicionar seção de posições com checkboxes (multi-select)
- Para cada posição selecionada, exibir um slider ou select de 1 a 5 para a habilidade
- Salvar/carregar essas informações

**Alterações no hook `usePlayers.ts`:**
- Mapear `positions` do banco para o tipo `PositionSkill[]` ao carregar
- Enviar `positions` como JSONB ao salvar/editar

### Parte 3 (preparação futura): Sugestão de escalação

Não será implementada agora, mas a estrutura de posições/habilidades criada na Parte 2 servirá de base para um algoritmo futuro que combinará:
- Pontuação geral do jogador
- Aproveitamento por cor
- Habilidade por posição
- Balanceamento entre times

### Resumo das alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/components/reports/Reports.tsx` | Adicionar colunas Az%/Vm% no modal de Pontuação |
| `src/types/football.ts` | Adicionar tipos `PlayerPosition`, `PositionSkill` e campo `positions` |
| `src/components/players/PlayerForm.tsx` | UI para selecionar posições e notas de habilidade |
| `src/hooks/usePlayers.ts` | Mapear positions do/para banco |
| **Migração SQL** | Adicionar coluna `positions JSONB DEFAULT '[]'` na tabela `players` |

