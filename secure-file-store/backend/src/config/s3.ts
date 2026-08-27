import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

const s3Config: ConstructorParameters<typeof S3Client>[0] = {
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
};

// When S3_ENDPOINT is set (MinIO local dev), point to it
// When empty, the default AWS S3 endpoint is used
if (env.S3_ENDPOINT) {
  s3Config.endpoint = env.S3_ENDPOINT;
  s3Config.forcePathStyle = true; // Required for MinIO
}

export const s3Client = new S3Client(s3Config);
