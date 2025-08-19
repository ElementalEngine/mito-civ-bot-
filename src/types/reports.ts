export type GameMode = "realtime" | "cloud";

export type BaseReport = {
  match_id: string;
  repeated?: boolean;
  game: string;
  turn: number;
  map_type: string;
  game_mode: string;
};

export type Civ6Player = {
  discord_id: string;
  user_name: string;
  civ: string; // key into CIV6_LEADERS
};

export type Civ7Player = {
  discord_id: string;
  user_name: string;
  civ: string;    // key into CIV7_CIVS
  leader: string; // key into CIV7_LEADERS
};

export type Civ6Report = BaseReport & {
  players: Civ6Player[];
};

export type Civ7Report = BaseReport & {
  players: Civ7Player[];
  age: string | number;
};