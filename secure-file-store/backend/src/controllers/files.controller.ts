import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import * as filesService from '../services/files.service';

// ── Zod schemas ──────────────────────────────────────────────────────────────

export const initUploadSchema = z.object({
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(209_715_200, 'File size exceeds the 200 MB limit.'), // server-enforced hard cap
});

export const completeUploadSchema = z.object({
  storageKey: z.string().min(1),
  uploadId: z.string().min(1),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  parts: z.array(
    z.object({
      PartNumber: z.number().int().positive(),
      ETag: z.string().min(1),
    }),
  ),
});

export const abortUploadSchema = z.object({
  storageKey: z.string().min(1),
  uploadId: z.string().min(1),
});

export const updateVisibilitySchema = z.object({
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
});

// ── Controllers ───────────────────────────────────────────────────────────────

export async function initUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { originalName, mimeType, sizeBytes } = req.body;
    const result = await filesService.initiateUpload(req.user!.id, originalName, mimeType, sizeBytes);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function completeUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { storageKey, uploadId, parts, originalName, mimeType, sizeBytes } = req.body;
    const file = await filesService.finalizeUpload(
      req.user!.id,
      storageKey,
      uploadId,
      parts,
      originalName,
      mimeType,
      sizeBytes,
    );
    res.status(201).json({ file });
  } catch (err) {
    next(err);
  }
}

export async function abortUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { storageKey, uploadId } = req.body;
    await filesService.abortUpload(req.user!.id, storageKey, uploadId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listFiles(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit  = Math.max(1, parseInt(req.query.limit  as string) || 50);
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const search     = (req.query.search     as string) || undefined;
    const visibility = (req.query.visibility as 'PUBLIC' | 'PRIVATE') || undefined;
    const sortBy    = (['uploadedAt', 'originalName', 'sizeBytes'].includes(req.query.sortBy as string)
      ? req.query.sortBy : 'uploadedAt') as 'uploadedAt' | 'originalName' | 'sizeBytes';
    const sortOrder = (['asc', 'desc'].includes(req.query.sortOrder as string)
      ? req.query.sortOrder : 'desc') as 'asc' | 'desc';

    const result = await filesService.listUserFiles(req.user!.id, {
      limit, offset, search, visibility, sortBy, sortOrder,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getFile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = await filesService.getFileWithDownloadUrl(req.params.id, req.user!.id);
    res.status(200).json({ file });
  } catch (err) {
    next(err);
  }
}

export async function updateVisibility(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = await filesService.updateFileVisibility(
      req.params.id,
      req.user!.id,
      req.body.visibility,
    );
    res.status(200).json({ file });
  } catch (err) {
    next(err);
  }
}

export async function deleteFile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await filesService.deleteFile(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getPublicFile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = await filesService.getPublicFileByShareToken(req.params.shareToken);
    res.status(200).json({ file });
  } catch (err) {
    next(err);
  }
}
