import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { s3Client } from '../config/s3';
import { env } from '../config/env';
import { HeadBucketCommand } from '@aws-sdk/client-s3';

const router = Router();

/**
 * GET /api/health
 * Checks liveness of the service and its dependencies (DB + S3).
 * Returns 200 if all healthy, 503 if any dependency is down.
 */
router.get('/', async (_req: Request, res: Response) => {
  const start = Date.now();

  // Check database
  let dbStatus: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  // Check S3 / MinIO bucket reachability
  let storageStatus: 'ok' | 'error' = 'ok';
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  } catch {
    storageStatus = 'error';
  }

  const healthy = dbStatus === 'ok' && storageStatus === 'ok';
  const responseTime = Date.now() - start;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTime,
    services: {
      database: dbStatus,
      storage: storageStatus,
    },
    version: process.env.npm_package_version || '1.0.0',
  });
});

export default router;
