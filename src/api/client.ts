import { log } from "console";
import { config } from "../config";
import { ApiError } from "./errors";
import type { UploadSaveResponse, OrderChangeResponse, GetMatchResponse } from "./types";
import { match } from "assert";

type FetchLike = typeof fetch;

export class ApiClient {
  private readonly base: string;
  private readonly fetcher: FetchLike;

  constructor(base = config.backend.url, fetcher: FetchLike = fetch) {
    this.base = base.replace(/\/+$/, "");
    this.fetcher = fetcher;
  }

  async uploadSave(fileBuf: Buffer, filename: string, reporterDiscordId: string, isCloud: boolean, messageId: string): Promise<UploadSaveResponse> {
    const form = new FormData();
    // TS typing-safe for Node: wrap Buffer in Uint8Array for File/Blob
    form.append("file", new File([new Uint8Array(fileBuf)], filename));
    form.append("reporter_discord_id", reporterDiscordId);
    form.append("is_cloud", isCloud ? "1" : "0");
    form.append("message_id", messageId);

    const res = await this.fetchWithRetry(`${this.base}/api/v1/upload-game-report/`, {
      method: "POST",
      body: form,
    });

    return (await this.parseJson(res)) as UploadSaveResponse;
  }

  async changeOrder(matchId: string, newOrder: string): Promise<OrderChangeResponse> {
    const form = new FormData();
    form.append("match_id", matchId);
    form.append("new_order", newOrder);

    const res = await this.fetchWithRetry(`${this.base}/api/v1/change-order/`, {
      method: "PUT",
      body: form,
    });

    return (await this.parseJson(res)) as OrderChangeResponse;
  }

  async deletePendingMatch(matchId: string): Promise<GetMatchResponse> {
    const form = new FormData();
    form.append("match_id", matchId);

    const res = await this.fetchWithRetry(`${this.base}/api/v1/delete-pending-match/`, {
      method: "PUT",
      body: form
    });

    return (await this.parseJson(res)) as GetMatchResponse;
  }

  async getMatch(matchId: string): Promise<GetMatchResponse> {
    const form = new FormData();
    form.append("match_id", matchId);

    const res = await this.fetchWithRetry(`${this.base}/api/v1/get-match/`, {
      method: "PUT",
      body: form
    });

    return (await this.parseJson(res)) as GetMatchResponse;
  }

  async triggerQuit(matchId: string, quitterDiscordId: string): Promise<GetMatchResponse> {
    const form = new FormData();
    form.append("match_id", matchId);
    form.append("quitter_discord_id", quitterDiscordId);

    const res = await this.fetchWithRetry(`${this.base}/api/v1/trigger-quit/`, {
      method: "PUT",
      body: form,
    });

    return (await this.parseJson(res)) as GetMatchResponse;
  }

  async assignDiscordId(matchId: string, playerId: string, discordId: string): Promise<GetMatchResponse> {
    const form = new FormData();
    form.append("match_id", matchId);
    form.append("player_id", playerId);
    form.append("discord_id", discordId);

    const res = await this.fetchWithRetry(`${this.base}/api/v1/assign-discord-id/`, {
      method: "PUT",
      body: form,
    });

    return (await this.parseJson(res)) as GetMatchResponse;
  }

  async approveMatch(matchId: string, approverDiscordId: string): Promise<GetMatchResponse> {
    const form = new FormData();
    form.append("match_id", matchId);
    form.append("approver_discord_id", approverDiscordId);

    const res = await this.fetchWithRetry(`${this.base}/api/v1/approve-match/`, {
      method: "PUT",
      body: form,
    });

    return (await this.parseJson(res)) as GetMatchResponse;
  }

  private async fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, attempts = 3): Promise<Response> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        const res = await this.fetcher(input, { ...init, signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          const body = await this.safeJson(res);
          throw new ApiError(`HTTP ${res.status}`, res.status, body);
        }
        return res;
      } catch (err) {
        lastErr = err;
        const status = err instanceof ApiError ? err.status : 0;
        const retriable = status === 0 || (status >= 500 && status <= 599);
        if (!retriable || i === attempts - 1) throw err;
        await new Promise(r => setTimeout(r, Math.min(2000, 200 * Math.pow(2, i))));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Unknown API error");
  }

  private async parseJson(res: Response): Promise<unknown> {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError("Invalid JSON from backend", res.status, text);
    }
  }

  private async safeJson(res: Response): Promise<unknown | string> {
    const text = await res.text().catch(() => "");
    try {
      return text ? JSON.parse(text) : "";
    } catch {
      return text;
    }
  }
}