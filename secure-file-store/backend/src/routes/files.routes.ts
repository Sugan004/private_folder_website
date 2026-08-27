import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  initUpload,
  completeUpload,
  abortUpload,
  listFiles,
  getFile,
  updateVisibility,
  deleteFile,
  getPublicFile,
  initUploadSchema,
  completeUploadSchema,
  abortUploadSchema,
  updateVisibilitySchema,
} from '../controllers/files.controller';
import { env } from '../config/env';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : 20,
  message: { error: 'Too many upload requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /files/share/{shareToken}:
 *   get:
 *     tags: [Files]
 *     summary: Access a public file via its share token (no auth required)
 *     parameters:
 *       - in: path
 *         name: shareToken
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Public file info with time-limited download URL (1 hour)
 *       404: { description: File not found or not publicly shared }
 */
router.get('/share/:shareToken', getPublicFile);

// All file routes below require authentication
router.use(authMiddleware);

/**
 * @openapi
 * /files:
 *   get:
 *     tags: [Files]
 *     summary: List authenticated user's files (paginated, server-side search & filter)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Case-insensitive filename search
 *       - in: query
 *         name: visibility
 *         schema: { type: string, enum: [PUBLIC, PRIVATE] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [uploadedAt, originalName, sizeBytes], default: uploadedAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated file list with quota info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/FileRecord' }
 *                 total: { type: integer }
 *                 limit: { type: integer }
 *                 offset: { type: integer }
 *                 quota: { $ref: '#/components/schemas/Quota' }
 */
router.get('/', listFiles);

/**
 * @openapi
 * /files/{id}:
 *   get:
 *     tags: [Files]
 *     summary: Get file metadata + presigned download URL (15 min)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: File with download URL }
 *       403: { description: Access denied (not the owner) }
 *       404: { description: File not found }
 */
router.get('/:id', getFile);

/**
 * @openapi
 * /files/upload/init:
 *   post:
 *     tags: [Files]
 *     summary: Initiate a multipart upload — returns presigned S3 URLs for each part
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [originalName, mimeType, sizeBytes]
 *             properties:
 *               originalName: { type: string, maxLength: 255 }
 *               mimeType:     { type: string }
 *               sizeBytes:    { type: integer, maximum: 209715200, description: 'Max 200 MB' }
 *     responses:
 *       200:
 *         description: Upload initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploadId:   { type: string }
 *                 storageKey: { type: string }
 *                 parts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       partNumber: { type: integer }
 *                       url:        { type: string, format: uri }
 *       400: { description: Validation error (invalid file type, size exceeded) }
 *       413: { description: Storage quota exceeded }
 */
router.post('/upload/init', uploadLimiter, validate(initUploadSchema), initUpload);

/**
 * @openapi
 * /files/upload/complete:
 *   post:
 *     tags: [Files]
 *     summary: Complete a multipart upload and persist file metadata
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storageKey, uploadId, originalName, mimeType, sizeBytes, parts]
 *             properties:
 *               storageKey:   { type: string }
 *               uploadId:     { type: string }
 *               originalName: { type: string }
 *               mimeType:     { type: string }
 *               sizeBytes:    { type: integer }
 *               parts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     PartNumber: { type: integer }
 *                     ETag:       { type: string }
 *     responses:
 *       201:
 *         description: File created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 file: { $ref: '#/components/schemas/FileRecord' }
 */
router.post('/upload/complete', validate(completeUploadSchema), completeUpload);

/**
 * @openapi
 * /files/upload/abort:
 *   post:
 *     tags: [Files]
 *     summary: Abort an in-progress multipart upload to free S3 storage
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204: { description: Upload aborted }
 */
router.post('/upload/abort', validate(abortUploadSchema), abortUpload);

/**
 * @openapi
 * /files/{id}/visibility:
 *   patch:
 *     tags: [Files]
 *     summary: Toggle file visibility between PUBLIC and PRIVATE
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visibility]
 *             properties:
 *               visibility: { type: string, enum: [PUBLIC, PRIVATE] }
 *     responses:
 *       200: { description: Updated file record }
 *       403: { description: Access denied }
 */
router.patch('/:id/visibility', validate(updateVisibilitySchema), updateVisibility);

/**
 * @openapi
 * /files/{id}:
 *   delete:
 *     tags: [Files]
 *     summary: Delete a file from S3 and database
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: File deleted }
 *       403: { description: Access denied }
 *       404: { description: File not found }
 */
router.delete('/:id', deleteFile);

export default router;
