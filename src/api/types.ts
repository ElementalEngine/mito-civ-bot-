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
  parser_version: string;
  created_at: string;
  confirmed: boolean;
  flagged: boolean;
  flagged_by: string | null;
  players: ParsedPlayer[];
  repeated: boolean;
};