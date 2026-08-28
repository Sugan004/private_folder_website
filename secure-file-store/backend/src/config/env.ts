import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),

  DATABASE_URL: required('DATABASE_URL'),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  S3_ENDPOINT: process.env.S3_ENDPOINT || '',        // empty = real AWS S3
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_BUCKET: required('S3_BUCKET'),
  S3_ACCESS_KEY: required('S3_ACCESS_KEY'),
  S3_SECRET_KEY: required('S3_SECRET_KEY'),

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || String(200 * 1024 * 1024), 10), // 200 MB
  PART_SIZE_BYTES: parseInt(process.env.PART_SIZE_BYTES || String(5 * 1024 * 1024), 10),           // 5 MB per part

  RESEND_API_KEY: required('RESEND_API_KEY'),
};
