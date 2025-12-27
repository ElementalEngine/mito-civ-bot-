export type Edition = "CIV6" | "CIV7";

export type ParsedPlayer = {
  user_name?: string;
  steam_id?: string;
  discord_id?: string;
  player_alive: boolean;
  team: number;
  civ: string;
  leader?: string;
  placement: number;
  quit: boolean;
  delta?: number;
  sub_of: string | null;
};

export type ParsedSave = {
  edition: Edition;
  leaders: string[];
  players: ParsedPlayer[];
};

export type UploadSaveResponse = {
  match_id: string;
  game: string;
  turn: number;
  age: string;
  map_type: string;
  game_mode: string;
  is_cloud: boolean;
  parser_version: string;
  created_at: string;
  approved_at: string | null;
  approver_discord_id: string | null;
  flagged: boolean;
  flagged_by: string | null;
  players: ParsedPlayer[];
  repeated: boolean;
  reporter_discord_id: string;
};

export type OrderChangeResponse = {
  match_id: string;
  game: string;
  turn: number;
  age: string;
  map_type: string;
  game_mode: string;
  is_cloud: boolean;
  parser_version: string;
  created_at: string;
  approved_at: string | null;
  approver_discord_id: string | null;
  flagged: boolean;
  flagged_by: string | null;
  players: ParsedPlayer[];
  repeated: boolean;
  reporter_discord_id: string;
}

export type GetMatchResponse = {
  match_id: string;
  game: string;
  turn: number;
  age: string;
  map_type: string;
  game_mode: string;
  is_cloud: boolean;
  parser_version: string;
  created_at: string;
  approved_at: string | null;
  approver_discord_id: string | null;
  flagged: boolean;
  flagged_by: string | null;
  players: ParsedPlayer[];
  repeated: boolean;
  reporter_discord_id: string;
}