export type Edition = "CIV6" | "CIV7";

export type ParsedPlayer = {
  name: string;
  steam_id?: string;
  discord_id?: string;
  alive?: boolean;
  team?: number;
};

export type ParsedSave = {
  edition: Edition;
  leaders: string[];
  players: ParsedPlayer[];
};

export type UploadSaveResponse = {
  matchId: string;
  parsed: ParsedSave;
  players: ParsedPlayer[];
};