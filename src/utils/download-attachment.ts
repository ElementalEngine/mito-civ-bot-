// Download a Discord attachmentto a Buffer. 

export async function downloadAttachment(url: string): Promise<Buffer> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Failed to download attachment: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}