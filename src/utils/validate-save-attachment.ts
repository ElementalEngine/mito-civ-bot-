import type { Attachment } from 'discord.js';
import { CIV_SAVE, CivEdition, expectedExt } from '../config/constants';

const CIV_EDITION_LABEL: Record<CivEdition, 'Civ6' | 'Civ7'> = {
  CIV6: 'Civ6',
  CIV7: 'Civ7',
} as const;

export function validateSaveAttachment(attachment: Attachment, edition: CivEdition): void {
  if (attachment.size <= 0) {
    throw new Error('Empty file. Please upload a valid save.');
  }
  if (attachment.size > CIV_SAVE.MAX_BYTES) {
    throw new Error('Your save file is too large. Please upload a file under 7MB.');
  }
  const name = (attachment.name ?? '').trim().toLowerCase(); // handles stray spaces
  const ext = expectedExt(edition);
  if (!name.endsWith(ext)) {
    const label = CIV_EDITION_LABEL[edition];
    throw new Error(`Invalid file type. Please upload a ${label} save file ending in ${ext}.`);
  }
}