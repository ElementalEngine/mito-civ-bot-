import axios from 'axios';
/**
 * Downloads a file from the given URL and returns it as a Buffer.
 * Throws an error if network or HTTP status indicates failure.
 */
export async function fetchSaveFile(url: string): Promise<Buffer> {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
  });

  if (response.status !== 200) {
    throw new Error(`Failed to download file: HTTP ${response.status}`);
  }

  return Buffer.from(response.data);
}
