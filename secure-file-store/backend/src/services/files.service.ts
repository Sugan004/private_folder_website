import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { validateFile, sanitizeFilename } from '../utils/fileValidation';

/** Per-user storage quota (500 MB default, overridable via env) */
const USER_QUOTA_BYTES = parseInt(process.env.USER_QUOTA_BYTES || String(500 * 1024 * 1024), 10);

import {
  initMultipartUpload,
  completeMultipartUpload,
  abortMultipartUpload,
  deleteS3Object,
  getPresignedDownloadUrl,
  CompletedPart,
} from './s3.service';

export async function initiateUpload(
  userId: string,
  originalName: string,
  mimeType: string,
  sizeBytes: number,
) {
  // Hard server-side size guard — client cannot bypass this
  if (sizeBytes > env.MAX_FILE_SIZE_BYTES) {
    const maxMB = (env.MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0);
    throw new AppError(400, `File size exceeds the ${maxMB} MB limit.`);
  }

  const validation = validateFile(originalName, mimeType, sizeBytes, env.MAX_FILE_SIZE_BYTES);
  if (!validation.valid) {
    throw new AppError(400, validation.error!);
  }

  // Storage quota check
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { storageUsedBytes: true },
  });
  if (!user) throw new AppError(404, 'User not found.');

  const usedAfterUpload = BigInt(user.storageUsedBytes) + BigInt(sizeBytes);
  if (usedAfterUpload > BigInt(USER_QUOTA_BYTES)) {
    const quotaMB = (USER_QUOTA_BYTES / 1024 / 1024).toFixed(0);
    throw new AppError(413, `Storage quota exceeded. Limit is ${quotaMB} MB.`);
  }

  const ext = path.extname(sanitizeFilename(originalName)).toLowerCase();
  const storageKey = `uploads/${userId}/${uuidv4()}${ext}`;

  const { uploadId, parts } = await initMultipartUpload(storageKey, mimeType, sizeBytes);

  return { uploadId, storageKey, parts };
}

export async function finalizeUpload(
  userId: string,
  storageKey: string,
  uploadId: string,
  parts: CompletedPart[],
  originalName: string,
  mimeType: string,
  sizeBytes: number,
) {
  // Confirm the storageKey belongs to this user (prefix check)
  if (!storageKey.startsWith(`uploads/${userId}/`)) {
    throw new AppError(403, 'Unauthorized storage key.');
  }

  await completeMultipartUpload(storageKey, uploadId, parts);

  const file = await prisma.file.create({
    data: {
      ownerId: userId,
      originalName: sanitizeFilename(originalName),
      storageKey,
      mimeType,
      sizeBytes: BigInt(sizeBytes),
      visibility: 'PRIVATE',
    },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      visibility: true,
      shareToken: true,
      uploadedAt: true,
    },
  });

  // Atomically increment user's storage usage
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsedBytes: { increment: BigInt(sizeBytes) } },
  });

  return serializeFile(file);
}

export async function abortUpload(
  userId: string,
  storageKey: string,
  uploadId: string,
) {
  if (!storageKey.startsWith(`uploads/${userId}/`)) {
    throw new AppError(403, 'Unauthorized storage key.');
  }
  await abortMultipartUpload(storageKey, uploadId);
}

export interface ListFilesOptions {
  search?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  limit?: number;
  offset?: number;
  sortBy?: 'uploadedAt' | 'originalName' | 'sizeBytes';
  sortOrder?: 'asc' | 'desc';
}

export async function listUserFiles(userId: string, options: ListFilesOptions = {}) {
  const { search, visibility, limit = 50, offset = 0, sortBy = 'uploadedAt', sortOrder = 'desc' } = options;

  // Clamp limit to prevent DoS via huge result sets
  const safeLimit = Math.min(limit, 100);

  const where: Record<string, unknown> = { ownerId: userId };
  if (visibility) where.visibility = visibility;
  if (search) where.originalName = { contains: search, mode: 'insensitive' };

  const [files, total, user] = await Promise.all([
    prisma.file.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: safeLimit,
      skip: offset,
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true, visibility: true, shareToken: true, uploadedAt: true },
    }),
    prisma.file.count({ where }),
    prisma.user.findUnique({ where: { id: userId }, select: { storageUsedBytes: true } }),
  ]);

  return {
    files: files.map(serializeFile),
    total,
    limit: safeLimit,
    offset,
    quota: {
      usedBytes: (user?.storageUsedBytes ?? BigInt(0)).toString(),
      limitBytes: USER_QUOTA_BYTES.toString(),
    },
  };
}

export async function getFileWithDownloadUrl(fileId: string, userId: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new AppError(404, 'File not found.');
  if (file.ownerId !== userId) throw new AppError(403, 'Access denied.');

  const downloadUrl = await getPresignedDownloadUrl(file.storageKey, 900); // 15 min
  return { ...serializeFile(file), downloadUrl };
}

export async function updateFileVisibility(
  fileId: string,
  userId: string,
  visibility: 'PUBLIC' | 'PRIVATE',
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new AppError(404, 'File not found.');
  if (file.ownerId !== userId) throw new AppError(403, 'Access denied.');

  const updated = await prisma.file.update({
    where: { id: fileId },
    data: { visibility },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      visibility: true,
      shareToken: true,
      uploadedAt: true,
    },
  });

  return serializeFile(updated);
}

export async function deleteFile(fileId: string, userId: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new AppError(404, 'File not found.');
  if (file.ownerId !== userId) throw new AppError(403, 'Access denied.');

  // Delete from S3 first, then DB and decrement quota
  await deleteS3Object(file.storageKey);
  await prisma.file.delete({ where: { id: fileId } });

  // Decrement user storage usage (don't let it go below 0)
  await prisma.user.update({
    where: { id: userId },
    data: { storageUsedBytes: { decrement: file.sizeBytes } },
  }).catch(() => { /* non-critical */ });
}

export async function getPublicFileByShareToken(shareToken: string) {
  const file = await prisma.file.findUnique({
    where: { shareToken },
    include: { owner: { select: { username: true } } },
  });

  if (!file || file.visibility !== 'PUBLIC') {
    throw new AppError(404, 'File not found or is not publicly shared.');
  }

  const downloadUrl = await getPresignedDownloadUrl(file.storageKey, 3600); // 1 hour
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes.toString(),
    uploadedAt: file.uploadedAt,
    uploadedBy: file.owner.username,
    downloadUrl,
  };
}

// BigInt cannot be JSON-serialized directly
function serializeFile(file: {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  visibility: string;
  shareToken: string;
  uploadedAt: Date;
}) {
  return {
    ...file,
    sizeBytes: file.sizeBytes.toString(),
  };
}
