import { Attachment } from 'discord.js';

/**
 * Validates a Civ save attachment for size and extension.
 * Throws an Error with a user-friendly message if validation fails.
 */
export function validateSaveAttachment(
  attachment: Attachment,
  version: 'civ6' | 'civ7'
): void {
  // Maximum allowed size (10 MB)
  const MAX_SAVE_SIZE = 10 * 1024 * 1024;
  if (attachment.size > MAX_SAVE_SIZE) {
    throw new Error('Your save file is too large. Please upload a file under 10 MB.');
  }

  // Expected extension
  const expectedExt = version === 'civ6' ? '.civ6save' : '.civ7save';
  const filename = attachment.name.toLowerCase();
  if (!filename.endsWith(expectedExt)) {
    throw new Error(
      `Invalid file type. Please upload a ${version === 'civ6' ? 'Civ6' : 'Civ7'} save file ending in ${expectedExt}.`
    );
  }
}
