import { BaseReport, Civ6Report, Civ7Report } from "../types/reports.js";

export function isValidOrder(new_order: string, num_players: number): boolean {
  let order = new_order.split(" ").map(id => parseInt(id));
  if (order.length !== num_players) {
    return false;
  }
  const seen = new Set<number>();
  for (const id of order) {
    if (id < 1 || id > num_players || seen.has(id)) {
      return false;
    }
    seen.add(id);
  }
  return true;
}

export function getPlayerListMessage(match: BaseReport, new_order: string = ""): string {
  let playersSortedByPlacement = [];
  if (new_order != "") {
    if (isValidOrder(new_order, match.players.length)) {
      let new_order_players = new_order.split(" ").map(id => parseInt(id));
      playersSortedByPlacement = [];
      for (const id of new_order_players) {
        const player = match.players[id - 1];
        if (player) {
          playersSortedByPlacement.push(player);
        }
      }
    }
  } else {
    playersSortedByPlacement = match.players.sort((a, b) => a.placement - b.placement);
  }
  return `Players:\n` + playersSortedByPlacement
        .map(p => `<@${p.discord_id}> (${p.user_name})`)
        .join("\t\t");
}

export function convertMatchToStr(match: BaseReport, includePlayerDiscordIds: boolean): string {
  let edition = match.game;
  let meta = "";
  let body = "";
  let playersSortedByPlacement = match.players.sort((a, b) => a.placement - b.placement);
  if (edition === "civ6") {
    const r = match as Civ6Report;
    meta = `Game: ${r.game} | Turn: ${r.turn} | Map: ${r.map_type} | Mode: ${r.game_mode}\n`;
    if (includePlayerDiscordIds) {
      body = getPlayerListMessage(r);
    }
  } else {
    const r = match as Civ7Report;
    meta = `Game: ${r.game} | Turn: ${r.turn} | Age: ${r.age} | Map: ${r.map_type} | Mode: ${r.game_mode}\n`;
    if (includePlayerDiscordIds) {
      body = getPlayerListMessage(r);
    }
  }
  return meta + body;
}