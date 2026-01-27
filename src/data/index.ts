export type LeaderType =
  | "Industrial"
  | "War"
  | "Naval"
  | "Culture"
  | "Religious"
  | "Science"
  | "None";

export type AgePool = "Antiquity_Age" | "Exploration_Age" | "Modern_Age";

export type LeaderMeta = Readonly<{
  gameId: string;
  emojiId?: string;
  type: LeaderType;
}>;

export type CivMeta = Readonly<{
  gameId: string;
  emojiId?: string;
  agePool: AgePool;
}>;

export * from "./civ6-data.js";
export * from "./civ7-data.js";