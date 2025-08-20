import type { UploadSaveResponse, OrderChangeResponse, GetMatchResponse } from "../api";
import { ApiClient } from "../api";
import { downloadAttachment } from "../utils/download-attachment";

export async function submitSaveForReport(
  fileUrl: string,
  filename: string,
  reporterDiscordId: string,
  api: ApiClient = new ApiClient(),
  downloader: (url: string) => Promise<Buffer> = downloadAttachment,
): Promise<UploadSaveResponse> {
  const buf = await downloader(fileUrl);
  return api.uploadSave(buf, filename, reporterDiscordId);
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

// Future (add here when ready):
// export async function confirmMatch(...) { ... }
// export async function flagMatch(...) { ... }
// export async function approveEligible(...) { ... }