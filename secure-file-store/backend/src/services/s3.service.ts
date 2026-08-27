import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../config/s3';
import { env } from '../config/env';

export interface PresignedPart {
  partNumber: number;
  url: string;
}

export interface CompletedPart {
  PartNumber: number;
  ETag: string;
}

/**
 * Initiates a multipart upload and returns presigned URLs for each part.
 * Files are split into PART_SIZE_BYTES chunks.
 */
export async function initMultipartUpload(
  storageKey: string,
  mimeType: string,
  totalSize: number,
): Promise<{ uploadId: string; parts: PresignedPart[] }> {
  const create = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      ContentType: mimeType,
      // SSE-S3 only on real AWS S3 — MinIO doesn't support this API
      ...(env.S3_ENDPOINT ? {} : { ServerSideEncryption: 'AES256' }),
    }),
  );

  const uploadId = create.UploadId!;
  const partCount = Math.ceil(totalSize / env.PART_SIZE_BYTES);

  const parts: PresignedPart[] = await Promise.all(
    Array.from({ length: partCount }, async (_, i) => {
      const url = await getSignedUrl(
        s3Client,
        new UploadPartCommand({
          Bucket: env.S3_BUCKET,
          Key: storageKey,
          UploadId: uploadId,
          PartNumber: i + 1,
        }),
        { expiresIn: 3600 }, // 1 hour to upload parts
      );
      return { partNumber: i + 1, url };
    }),
  );

  return { uploadId, parts };
}

/** Completes a multipart upload after all parts are uploaded. */
export async function completeMultipartUpload(
  storageKey: string,
  uploadId: string,
  parts: CompletedPart[],
): Promise<void> {
  await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    }),
  );
}

/** Aborts an in-progress multipart upload to free S3 storage. */
export async function abortMultipartUpload(
  storageKey: string,
  uploadId: string,
): Promise<void> {
  await s3Client.send(
    new AbortMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      UploadId: uploadId,
    }),
  );
}

/** Permanently deletes an object from S3. */
export async function deleteS3Object(storageKey: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
    }),
  );
}

/**
 * Generates a time-limited presigned download URL.
 * Private files: 15 minutes. Public files: 1 hour.
 */
export async function getPresignedDownloadUrl(
  storageKey: string,
  expiresIn = 900,
): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
    }),
    { expiresIn },
  );
}
