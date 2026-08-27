import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import {
  register,
  login,
  logout,
  logoutAll,
  refresh,
  me,
  registerSchema,
  loginSchema,
} from '../controllers/auth.controller';
import { env } from '../config/env';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'test' ? 1000 : 10,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               username: { type: string, minLength: 3, maxLength: 30 }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201: { description: Account created }
 *       409: { description: Email or username already taken }
 */
router.post('/register', authLimiter, validate(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Invalid credentials }
 */
router.post('/login', authLimiter, validate(loginSchema), login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token and get a new access token
 *     description: Reads the refresh token from the HttpOnly cookie (preferred) or request body.
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *       401: { description: Refresh token invalid or expired }
 */
router.post('/refresh', authLimiter, refresh);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the authenticated user's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Unauthorized }
 */
router.get('/me', authMiddleware, me);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current session (revoke this refresh token)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204: { description: Logged out successfully }
 */
router.post('/logout', authMiddleware, logout);

/**
 * @openapi
 * /auth/sessions:
 *   delete:
 *     tags: [Auth]
 *     summary: Logout all devices (revoke all refresh tokens for this user)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204: { description: All sessions revoked }
 */
router.delete('/sessions', authMiddleware, logoutAll);

export default router;
