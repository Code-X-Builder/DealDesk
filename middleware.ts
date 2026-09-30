import { NextRequest, NextResponse } from 'next/server';
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Edge middleware protecting authenticated areas of the application and
 * enforcing global rate limiting.
 *
 * Notes / assumptions:
 * - Auth0 session-based authentication is handled entirely by the Auth0 SDK.
 * - Business logic MUST NOT be added here; this middleware only enforces access
 *   control and transport-layer concerns such as rate limiting.
 * - Route groups in the App Router (e.g. `(dashboard)`) are not reflected in URLs,
 *   so the matcher uses `/dashboard` rather than `/(dashboard)`.
 * - Rate limiting is enforced per client IP at 100 requests per minute.
 */

const authMiddleware = withMiddlewareAuthRequired();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
});

export default async function middleware(req: NextRequest) {
  const ip =
    req.ip ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  const { success, reset } = await ratelimit.limit(`ratelimit:${ip}`);

  if (!success) {
    const retryAfterSeconds =
      reset !== undefined ? Math.max(reset - Math.floor(Date.now() / 1000), 0) : 60;

    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': retryAfterSeconds.toString(),
      },
    });
  }

  return authMiddleware(req);
}

export const config = {
  matcher: [
    // Protect all dashboard routes.
    '/dashboard/:path*',
    // Protect all API routes except auth and health checks.
    '/api/((?!auth|health).*)',
  ],
};


