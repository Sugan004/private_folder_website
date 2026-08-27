import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Assigns a unique X-Request-ID to every request.
 * Uses the client-provided header if present (for distributed tracing),
 * otherwise generates a fresh UUID.
 * The ID is attached to the response and to req.requestId for use in logs.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
