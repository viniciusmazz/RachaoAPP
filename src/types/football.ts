export type PlayerType = "mensalista" | "convidado";

export type PlayerPosition = "goleiro" | "zagueiro" | "lateral" | "volante" | "meia" | "atacante";

export interface PositionSkill {
  position: PlayerPosition;
  skill: number; // 1-5
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  photoUrl?: string;
  positions?: PositionSkill[];
  userId?: string | null;
}

export type TeamSide = "azul" | "vermelho";

export interface TeamAssignmentItem {
  playerId: string;
  isGoalkeeper?: boolean;
  goals?: number;
  assists?: number;
  ownGoals?: number;
  fieldGoals?: number;
}

export interface Teams {
  azul: TeamAssignmentItem[];
  vermelho: TeamAssignmentItem[];
}

export interface MatchEvent {
  id: string;
  minute?: number;
  team: TeamSide;
  scorerId: string;
  assistId?: string;
  isOwnGoal?: boolean;
}

export interface Match {
  id: string;
  date: Date;
  teams: Teams;
  events: MatchEvent[];
  reportFilePath?: string;
  observations?: string;
}

// Group / Multi-team types
export interface SideConfig {
  name: string;
  color: string;
  logoUrl?: string | null;
}

export interface GroupSettings {
  logoUrl?: string | null;
  sides: {
    home: SideConfig;
    away: SideConfig;
  };
  enabledStats: StatType[];
  roles?: { [userId: string]: "admin" | "approved" | "pending" | "financeiro" | "atleta" };
  playerLinks?: { [userId: string]: string }; // userId -> playerId
  pendingLinks?: { [userId: string]: string }; // userId -> playerId
  visibility?: "public" | "private";
}

export type StatType = "goals" | "assists" | "ownGoals" | "fieldGoals" | "cards" | "fouls" | "saves" | "ratings";

export interface Group {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  settings: GroupSettings;
  createdAt: string;
  updatedAt: string;
}
