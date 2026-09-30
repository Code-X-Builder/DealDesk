/**
 * Feature flag helpers backed by environment variables.
 *
 * All flags are read from NEXT_PUBLIC_ env vars so they can be used safely
 * in both server and client components.
 */

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export function isYouTubeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_YOUTUBE === 'true';
}

export function isPlaidEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PLAID === 'true';
}


