import axios from 'axios';
import FormData from 'form-data';
import { fetchSaveFile } from '../../utils/fetch-save-file';
import { config } from '../../config';

interface ReportResult {
  reportLink?: string;
  summary?: string;
}

/**
 * Handles fetching the save file and submitting it to the backend reporting endpoint.
 */
export async function submitSaveForReport(
  fileUrl: string,
  filename: string,
  version: 'civ6' | 'civ7'
): Promise<ReportResult> {
  const buffer = await fetchSaveFile(fileUrl);

  // Build multipart form data
  const form = new FormData();
  form.append('file', buffer, { filename });
  form.append('version', version);

  // POST to backend // TODO 
  const response = await axios.post(
    `${config.backend.url}/report`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 60000,
    }
  );

  return response.data as ReportResult;
}