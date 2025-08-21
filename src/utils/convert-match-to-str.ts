import { BaseReport, Civ6Report, Civ7Report } from "../types/reports.js";
import { BasePlayer, Civ6Player, Civ7Player } from "../types/reports.js";
import { lookupCiv6Leader } from "../data/civ6-leaders";
import { lookupCiv7Civ } from "../data/civ7-civs";
import { lookupCiv7Leader } from "../data/civ7-leaders";

function quitStr(p: BasePlayer): string {
  return p.quit == true ? "(Quit)" : "";
}

export function convertMatchToStr(match: BaseReport): string {
  let edition = match.game;
  let meta = "";
  let body = "";
  let playersSortedByPlacement = match.players.sort((a, b) => a.placement - b.placement);
  if (edition === "civ6") {
    const r = match as Civ6Report;
    meta = `Game: ${r.game} | Turn: ${r.turn} | Map: ${r.map_type} | Mode: ${r.game_mode}\n\n`;
    body = playersSortedByPlacement
      .map(p => `<@${p.discord_id}>\t${p.user_name}\t${lookupCiv6Leader((p as Civ6Player).civ)} ${quitStr(p)}`)
      .join("\n");
  } else {
    const r = match as Civ7Report;
    meta = `Game: ${r.game} | Turn: ${r.turn} | Age: ${r.age} | Map: ${r.map_type} | Mode: ${r.game_mode}\n\n`;
    body = playersSortedByPlacement
      .map(p => `<@${p.discord_id}>\t${p.user_name}\t${lookupCiv7Civ((p as Civ7Player).civ)} ${lookupCiv7Leader((p as Civ7Player).leader)} ${quitStr(p)}`)
      .join("\n");
  }
  return meta + body;
}