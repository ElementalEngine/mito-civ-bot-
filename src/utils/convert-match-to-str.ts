import { BaseReport, Civ6Report, Civ7Report } from "../types/reports.js";

export function convertMatchToStr(match: BaseReport, includePlayerDiscordIds: boolean): string {
  let edition = match.game;
  let meta = "";
  let body = "";
  let playersSortedByPlacement = match.players.sort((a, b) => a.placement - b.placement);
  if (edition === "civ6") {
    const r = match as Civ6Report;
    meta = `Game: ${r.game} | Turn: ${r.turn} | Map: ${r.map_type} | Mode: ${r.game_mode}\n`;
    if (includePlayerDiscordIds) {
      body = `Players:\n` + playersSortedByPlacement
        .map(p => `<@${p.discord_id}> (${p.user_name})`)
        .join("\t\t");
    }
  } else {
    const r = match as Civ7Report;
    meta = `Game: ${r.game} | Turn: ${r.turn} | Age: ${r.age} | Map: ${r.map_type} | Mode: ${r.game_mode}\n`;
    if (includePlayerDiscordIds) {
      body = `Players:\n` + playersSortedByPlacement
        .map(p => `<@${p.discord_id}>\t${p.user_name}`)
        .join("\n");
    }
  }
  return meta + body;
}