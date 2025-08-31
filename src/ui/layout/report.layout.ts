import { EmbedBuilder, userMention } from "discord.js";
import type { BaseReport, BasePlayer } from "../../types/reports";
import type { UploadSaveResponse, ParsedPlayer } from "../../api/types";
import { lookupCiv6Leader, lookupCiv7Civ, lookupCiv7Leader } from "../../data";
import {
  EMOJI_REPORT,
  EMOJI_FIRST_PLACE,
  EMOJI_SECOND_PLACE,
  EMOJI_THIRD_PLACE,
  EMOJI_QUITTER,
} from "../../config/constants";
import { name } from "../../events/interaction-create";

type AnyReport = UploadSaveResponse | BaseReport;

type BuildOpts = {
  reporterId?: string;
  apiMs?: number;
  now?: Date;
  host?: string | null; // blank by default ("—")
};

const MEDAL_BY_POS: Record<number, string> = {
  1: EMOJI_FIRST_PLACE,
  2: EMOJI_SECOND_PLACE,
  3: EMOJI_THIRD_PLACE,
};

export function buildReportEmbed(report: AnyReport, opts: BuildOpts = {}): EmbedBuilder {
  const now = opts.now ?? new Date();
  const game = (report.game ?? "").toLowerCase();
  const isCiv7 = game === "civ7";
  const isCiv6 = game === "civ6";
  const modeStr = ("game_mode" in report && report.game_mode ? String(report.game_mode) : "").toLowerCase();
  const isTeamMode = modeStr.includes("team");

  // Meta
  const meta: string[] = [];
  meta.push(`Game: **${report.game}**`);
  if ("game_mode" in report && report.game_mode) meta.push(`Mode: **${report.game_mode}**`);
  if ("turn" in report && typeof report.turn === "number") meta.push(`Turn: **${report.turn}**`);
  if ("age" in (report as any) && (report as any).age) meta.push(`Age: **${(report as any).age}**`);
  if ("map_type" in report && report.map_type) meta.push(`Map: **${report.map_type}**`);
  const description = meta.join(" • ");

  // Players sorted by placement
  const players = [...report.players] as ParsedPlayer[];
  players.sort((a, b) => (placement(a) ?? 9e9) - (placement(b) ?? 9e9));

  const idColumn: string[] = [];   // id
  const rankColumn: string[] = [];   // rank token + Δ
  const nameCivLeaderColumn: string[] = [];    // mention / @name + quit flag + civ / leader

  if (isTeamMode) {
    // group by team → order by best placement
    const teamMap = new Map<number, ParsedPlayer[]>();
    for (const p of players) {
      const t = team(p);
      if (!teamMap.has(t)) teamMap.set(t, []);
      teamMap.get(t)!.push(p);
    }

    const teams = [...teamMap.entries()]
      .map(([teamId, members]) => {
        members.sort((a, b) => (placement(a) ?? 9e9) - (placement(b) ?? 9e9));
        const best = members.reduce((m, q) => Math.min(m, placement(q) ?? 9e9), 9e9);
        return { teamId, members, best };
      })
      .sort((a, b) => a.best - b.best);

    teams.forEach((t, idx) => {
      const teamRank = idx;
      // Team header row
      idColumn.push("-");
      rankColumn.push(rankToken(teamRank + 1));               // 🥇 / 01: etc
      nameCivLeaderColumn.push(`**Team ${t.teamId + 1}**`);

      // Team members (no medals per player)
      for (const p of t.members) {
        const pos = (placement(p) ?? t.members.indexOf(p));
        idColumn.push(`${report.players.indexOf(p) + 1}`);
        rankColumn.push(`${numRank(pos)} ${fmtDelta(delta(p))}`);
        nameCivLeaderColumn.push(`${who(p)}${quit(p)} ${civText(isCiv6, isCiv7, p)}`);
      }
    });
  } else {
    // FFA: medals replace 1/2/3; others numeric
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const pos = (placement(p) ?? i);
      idColumn.push(`${report.players.indexOf(p) + 1}`);
      rankColumn.push(`${rankToken(pos)} ${fmtDelta(delta(p))}`);
      nameCivLeaderColumn.push(`${who(p)}${quit(p)} ${civText(isCiv6, isCiv7, p)}`);
    }
  }

  // Clamp all three columns together so they fit 1024 chars each
  const columnsStr  = clampNColumns([idColumn, rankColumn, nameCivLeaderColumn], 1024);

  // Footer (bulleted; no embed timestamp)
  const footerLines = [
    `• MatchID: ${("match_id" in report && report.match_id) ? report.match_id : "—"}`,
  ];
  if (opts.reporterId) footerLines.push(`• ReporterID: ${opts.reporterId}`);
  footerLines.push(`• ${formatTodayAt(now)}`);

  return new EmbedBuilder()
    .setTitle(`${EMOJI_REPORT} Match Report`)
    .setDescription(description || "—")
    .addFields(
      { name: "Host", value: (opts.host ?? "—") || "—", inline: false },
      { name: "ID", value: columnsStr.str[0] || "—", inline: true },
      { name: "Placement / ΔELO", value: columnsStr.str[1] || "—", inline: true },
      { name: "Players / Civ / Leader", value: columnsStr.str[2] || "—", inline: true },
    )
    .setFooter({ text: footerLines.join("\n") });
}

/* ───────────── helpers ───────────── */

function placement(p: ParsedPlayer): number | undefined {
  const v = (p as any).placement;
  return typeof v === "number" ? v + 1 : undefined;
}
function team(p: ParsedPlayer): number {
  const t = (p as any).team;
  return typeof t === "number" ? t : 0;
}
/** ELO delta from likely keys; defaults to 0 for alignment. */
function delta(p: ParsedPlayer): number {
  const any = p as any;
  const v =
    (typeof any.delta === "number" ? any.delta : undefined) ??
    (typeof any.elo_delta === "number" ? any.elo_delta : undefined) ??
    (typeof any.eloDelta === "number" ? any.eloDelta : undefined) ??
    (typeof any.rating_delta === "number" ? any.rating_delta : undefined) ?? 0;
  return Number(v) || 0;
}
/** 🥇/🥈/🥉 for 1..3 else "04:" style */
function rankToken(pos: number): string {
  // const m = MEDAL_BY_POS[pos];
  // return m ? m : numRank(pos);
  return numRank(pos);
}
function numRank(pos: number): string {
  return `${String(pos).padStart(2, "0")}:`;
}
function fmtDelta(d: number): string {
  const s = (d >= 0 ? `+${d}` : `${d}`).padStart(3, " ");
  return `[ ${s}]`;
}
/** Mention if we have a discord id; otherwise @username */
function who(p: ParsedPlayer): string {
  const id = (p as any).discord_id as string | undefined;
  const name = (p as any).user_name as string | undefined;
  return id ? userMention(id) : (name ? `@${name}` : "UnknownUser");
}
/** Civ text (no leading spaces); '—' if unknown */
function civText(isCiv6: boolean, isCiv7: boolean, p: ParsedPlayer): string {
  if (isCiv7) {
    const civKey = (p as any).civ;
    const leaderKey = (p as any).leader;
    const civName = civKey ? lookupCiv7Civ(civKey) : null;
    const leaderName = leaderKey ? lookupCiv7Leader(leaderKey) : null;
    const s = [civName, leaderName ? `(${leaderName})` : ""].filter(Boolean).join(" ");
    return s || "—";
  }
  if (isCiv6) {
    const leaderKey = (p as any).civ;
    const leaderName = leaderKey ? lookupCiv6Leader(leaderKey) : null;
    return leaderName || "—";
  }
  const cv = (p as any).civ as string | undefined;
  return cv || "—";
}
function quit(p: ParsedPlayer): string {
  return (("quit" in (p as any)) && (p as any).quit) ? ` ${EMOJI_QUITTER}` : "";
}

/** Clamp N columns to ≤max chars each, keeping the same number of rows. */
function clampNColumns(
  columns: string[][],
  max = 1024
): { str:string[] } {
  let n = Math.min(...columns.map(arr => arr.length));
  while (n > 0) {
    var sliced = columns.map(arr => arr.slice(0, n).join("\n"));
    if (sliced.every(str => str.length <= max)) {
      return { str: sliced };
    }
    n--;
  }
  return { str: [] };
}

function formatTodayAt(d: Date): string {
  const now = new Date();
  const same = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return same
    ? `Today at ${time}`
    : d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}
