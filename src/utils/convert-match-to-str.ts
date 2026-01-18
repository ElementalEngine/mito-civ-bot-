import { BaseReport, Civ6Report, Civ7Report } from "../types/reports.js";
import {ParsedPlayer} from "../api/types"

export function isValidOrder(new_order: string, players: ParsedPlayer[]): boolean {
  let order = new_order.split(" ").map(id => parseInt(id));
  let num_players = players.map(p => p.team);
  let unique_teams = new Set(num_players);
  let num_teams = unique_teams.size;
  if (order.length !== num_teams) {
    return false;
  }
  return true;
}

export function getPlayerListMessage(match: BaseReport, new_order: string = "", sep: string = "\t\t"): string {
  let playersSortedByPlacement = [];
  if (new_order != "") {
    if (isValidOrder(new_order, match.players)) {
      let new_order_players = new_order.split(" ").map(id => parseInt(id));
      playersSortedByPlacement = [];
      for (const id of new_order_players) {
        const player = match.players.find(p => p.placement === id - 1);
        for (const player in match.players) {
          const placement = match.players[player].placement;
          if (placement === id - 1) {
            playersSortedByPlacement.push(match.players[player]);
          }
        }
      }
    }
  } else {
    playersSortedByPlacement = match.players.sort((a, b) => a.placement - b.placement);
  }
  return playersSortedByPlacement
        .map(p => `<@${p.discord_id}> ${p.user_name ? `(${p.user_name})` : ``}`)
        .join(sep);
}

export function convertMatchToStr(match: BaseReport, includePlayerDiscordIds: boolean): string {
  let edition = match.game;
  let meta = "";
  let body = "";
  if (edition === "civ6") {
    const r = match as Civ6Report;
    meta = `Game: ${r.game} | Turn: ${r.turn} | Map: ${r.map_type} | Mode: ${r.game_mode}\n`;
    if (includePlayerDiscordIds) {
      body = `Players:` + getPlayerListMessage(r);
    }
  } else {
    const r = match as Civ7Report;
    meta = `Game: ${r.game} | Turn: ${r.turn} | Age: ${r.age} | Map: ${r.map_type} | Mode: ${r.game_mode}\n`;
    if (includePlayerDiscordIds) {
      body = `Players:` + getPlayerListMessage(r);
    }
  }
  return meta + body;
}