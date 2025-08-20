export type GameMode = "realtime" | "cloud";

export type BaseReport = {
  match_id: string;
  repeated?: boolean;
  game: string;
  turn: number;
  map_type: string;
  game_mode: string;
  players: BasePlayer[];
};

export type BasePlayer = {
  discord_id: string;
  user_name: string;
  placement: number;
};

export type Civ6Player = BasePlayer & {
  civ: string; // key into CIV6_LEADERS
};

export type Civ7Player = BasePlayer & {
  civ: string;    // key into CIV7_CIVS
  leader: string; // key into CIV7_LEADERS
};

export type Civ6Report = BaseReport & {
};

export type Civ7Report = BaseReport & {
  age: string | number;
};