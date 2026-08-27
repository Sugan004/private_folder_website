import path from 'path';

/** Allowed file extensions (allowlist approach per OWASP) */
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.txt', '.md',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.csv', '.json', '.xml',
  '.mp3', '.wav', '.ogg',
  '.mp4', '.mov', '.avi', '.mkv',
  '.zip', '.tar', '.gz',
]);

/** MIME-type → allowed extensions mapping for magic bytes cross-check */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/markdown', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/json', 'application/xml',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
  'application/zip', 'application/x-tar', 'application/gzip',
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file by:
 * 1. Checking the extension against the allowlist
 * 2. Checking the MIME type against the allowlist
 * 3. Checking file size against the max limit
 */
export function validateFile(
  originalName: string,
  mimeType: string,
  sizeBytes: number,
  maxSizeBytes: number,
): FileValidationResult {
  // Sanitize: decode URI components and get the true extension
  const decodedName = decodeURIComponent(originalName);
  const ext = path.extname(decodedName).toLowerCase();

  if (!ext) {
    return { valid: false, error: 'File must have an extension.' };
  }

  // 1. Extension allowlist check
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File type "${ext}" is not allowed.` };
  }

  // 2. MIME type allowlist check (client-provided, secondary guard)
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: `MIME type "${mimeType}" is not allowed.` };
  }

  // 3. File size limit
  if (sizeBytes > maxSizeBytes) {
    const maxMB = (maxSizeBytes / 1024 / 1024).toFixed(0);
    return { valid: false, error: `File size exceeds the ${maxMB} MB limit.` };
  }

  // 4. Block double-extension tricks like file.jpg.php
  const parts = decodedName.split('.');
  if (parts.length > 2) {
    const allExts = parts.slice(1).map((p) => `.${p.toLowerCase()}`);
    const hasBlocked = allExts.some((e) => !ALLOWED_EXTENSIONS.has(e));
    if (hasBlocked) {
      return { valid: false, error: 'Double-extension filenames are not allowed.' };
    }
  }

  return { valid: true };
}

/** Sanitizes a filename: strips path traversal chars, limits length */
export function sanitizeFilename(name: string): string {
  return path
    .basename(name)
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')
    .substring(0, 255);
}
