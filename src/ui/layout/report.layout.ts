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

type AnyReport = UploadSaveResponse | BaseReport;
type AnyPlayer = BasePlayer | ParsedPlayer;

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
  const players = [...report.players] as AnyPlayer[];
  players.sort((a, b) => (placement(a) ?? 9e9) - (placement(b) ?? 9e9));

  // Build THREE columns
  const colLeft: string[] = [];   // rank token + Δ
  const colMid: string[] = [];    // mention / @name + quit flag
  const colRight: string[] = [];  // civ / leader

  if (isTeamMode) {
    // group by team → order by best placement
    const teamMap = new Map<number, AnyPlayer[]>();
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
      const teamRank = idx + 1;
      // Team header row
      colLeft.push(rankToken(teamRank));               // 🥇 / 01: etc
      colMid.push(`**Team ${t.teamId + 1}**`);
      colRight.push("—");

      // Team members (no medals per player)
      for (const p of t.members) {
        const pos = (placement(p) ?? t.members.indexOf(p)) + 1;
        colLeft.push(`${numRank(pos)} ${fmtDelta(delta(p))}`);
        colMid.push(`${who(p)}${quit(p)}`);
        colRight.push(civText(isCiv6, isCiv7, p));
      }
    });
  } else {
    // FFA: medals replace 1/2/3; others numeric
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const pos = (placement(p) ?? i) + 1;
      colLeft.push(`${rankToken(pos)} ${fmtDelta(delta(p))}`);
      colMid.push(`${who(p)}${quit(p)}`);
      colRight.push(civText(isCiv6, isCiv7, p));
    }
  }

  // Clamp all three columns together so they fit 1024 chars each
  const { leftStr, midStr, rightStr } = clampThreeColumns(colLeft, colMid, colRight, 1024);

  // Footer (bulleted; no embed timestamp)
  const footerLines = [
    `• MatchID: ${("match_id" in report && report.match_id) ? report.match_id : "—"}`,
  ];
  if (opts.reporterId) footerLines.push(`• ReporterID: @${opts.reporterId}`);
  footerLines.push(`• ${formatTodayAt(now)}`);

  return new EmbedBuilder()
    .setTitle(`${EMOJI_REPORT} Match Report`)
    .setDescription(description || "—")
    .addFields(
      { name: "Host", value: (opts.host ?? "—") || "—", inline: false },
      { name: "Placement / ΔELO", value: leftStr || "—", inline: true },
      { name: "Players", value: midStr || "—", inline: true },
      { name: "Civ / Leader", value: rightStr || "—", inline: true },
    )
    .setFooter({ text: footerLines.join("\n") });
}

/* ───────────── helpers ───────────── */

function placement(p: AnyPlayer): number | undefined {
  const v = (p as any).placement;
  return typeof v === "number" ? v : undefined;
}
function team(p: AnyPlayer): number {
  const t = (p as any).team;
  return typeof t === "number" ? t : 0;
}
/** ELO delta from likely keys; defaults to 0 for alignment. */
function delta(p: AnyPlayer): number {
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
  const m = MEDAL_BY_POS[pos];
  return m ? m : numRank(pos);
}
function numRank(pos: number): string {
  return `${String(pos).padStart(2, "0")}:`;
}
function fmtDelta(d: number): string {
  const s = (d >= 0 ? `+${d}` : `${d}`).padStart(3, " ");
  return `[ ${s}]`;
}
/** Mention if we have a discord id; otherwise @username */
function who(p: AnyPlayer): string {
  const id = (p as any).discord_id as string | undefined;
  const name = (p as any).user_name as string | undefined;
  return id ? userMention(id) : (name ? `@${name}` : "UnknownUser");
}
/** Civ text (no leading spaces); '—' if unknown */
function civText(isCiv6: boolean, isCiv7: boolean, p: AnyPlayer): string {
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
function quit(p: AnyPlayer): string {
  return (("quit" in (p as any)) && (p as any).quit) ? ` ${EMOJI_QUITTER}` : "";
}

/** Clamp three columns to ≤max chars each, keeping the same number of rows. */
function clampThreeColumns(
  left: string[],
  mid: string[],
  right: string[],
  max = 1024
): { leftStr: string; midStr: string; rightStr: string } {
  let n = Math.min(left.length, mid.length, right.length);
  while (n > 0) {
    const L = left.slice(0, n).join("\n");
    const M = mid.slice(0, n).join("\n");
    const R = right.slice(0, n).join("\n");
    if (L.length <= max && M.length <= max && R.length <= max) {
      return { leftStr: L, midStr: M, rightStr: R };
    }
    n--;
  }
  return { leftStr: "", midStr: "", rightStr: "" };
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
