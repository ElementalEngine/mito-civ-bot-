import type { UploadSaveResponse, OrderChangeResponse, GetMatchResponse } from "../api";
import { ApiClient } from "../api";
import { downloadAttachment } from "../utils/download-attachment";

export async function submitSaveForReport(
  fileUrl: string,
  filename: string,
  reporterDiscordId: string,
  isCloud: boolean,
  api: ApiClient = new ApiClient(),
  downloader: (url: string) => Promise<Buffer> = downloadAttachment,
): Promise<UploadSaveResponse> {
  const buf = await downloader(fileUrl);
  return api.uploadSave(buf, filename, reporterDiscordId, isCloud);
}

export async function setPlacements(
  matchId: string,
  newOrder: string,
  api: ApiClient = new ApiClient(),
) : Promise<OrderChangeResponse> {
  return api.changeOrder(matchId, newOrder);
}

export async function getMatch(
  matchId: string,
  api: ApiClient = new ApiClient(),
) : Promise<GetMatchResponse> {
  return api.getMatch(matchId);
}

export async function deletePendingMatch(
  matchId: string,
  api: ApiClient = new ApiClient(),
) : Promise<GetMatchResponse> {
  return api.deletePendingMatch(matchId);
}

export async function triggerQuit(
  matchId: string,
  quitterDiscordId: string,
  api: ApiClient = new ApiClient(),
) : Promise<GetMatchResponse> {
  return api.triggerQuit(matchId, quitterDiscordId);
}

export async function approveMatch(
  matchId: string,
  api: ApiClient = new ApiClient(),
) : Promise<OrderChangeResponse> {
  return api.approveMatch(matchId);
}

// Future (add here when ready):
// export async function confirmMatch(...) { ... }
// export async function flagMatch(...) { ... }
// export async function approveEligible(...) { ... }