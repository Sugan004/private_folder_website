import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(
  email: string,
  username: string,
  password: string,
): Promise<{ id: string; email: string; username: string }> {
  // Check for existing user
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    if (existing.email === email) throw new AppError(409, 'Email already in use.');
    throw new AppError(409, 'Username already taken.');
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, username, passwordHash },
    select: { id: true, email: true, username: true },
  });

  return user;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: { id: string; email: string; username: string }; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Constant-time comparison to prevent timing attacks
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    throw new AppError(401, 'Invalid email or password.');
  }

  const tokens = await _issueTokenPair(user.id, user.email);
  return {
    user: { id: user.id, email: user.email, username: user.username },
    tokens,
  };
}

export async function refreshTokens(rawRefreshToken: string): Promise<TokenPair> {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token.');
  }

  const tokenHash = _hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.sub, tokenHash, revoked: false },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token not found or expired.');
  }

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  return _issueTokenPair(stored.user.id, stored.user.email);
}

export async function revokeRefreshToken(
  userId: string,
  rawRefreshToken: string,
): Promise<void> {
  const tokenHash = _hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { userId, tokenHash, revoked: false },
    data: { revoked: true },
  });
}

/** Revoke every active session for this user (logout from all devices) */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

async function _issueTokenPair(userId: string, email: string): Promise<TokenPair> {
  const jti = uuidv4();
  const accessToken = signAccessToken({ sub: userId, email });
  const rawRefreshToken = signRefreshToken({ sub: userId, jti });
  const tokenHash = _hashToken(rawRefreshToken);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  // Clean up expired tokens for this user (housekeeping)
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

  return { accessToken, refreshToken: rawRefreshToken };
}

function _hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
