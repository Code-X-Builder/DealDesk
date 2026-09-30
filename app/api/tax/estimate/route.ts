import { NextRequest, NextResponse } from 'next/server';

import { TaxService } from '../../../../lib/services/tax.service';
import { UserService } from '../../../../lib/services/user.service';
import { supabase } from '../../../../lib/db/supabase';
import { redis } from '../../../../lib/db/redis';
import { getSession } from '../../../../lib/utils/auth';
import { handleError } from '../../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../../lib/utils/errors';

const taxService = new TaxService(supabase, redis);
const userService = new UserService(supabase, redis);

async function resolveOrCreateUserFromSession(req: NextRequest) {
  const session = await getSession(req);

  const auth0Id: string | undefined = session?.user?.sub;
  const email: string | undefined = session?.user?.email;

  if (!auth0Id || !email) {
    throw new UnauthorizedError('Missing Auth0 session');
  }

  const user = await userService.createUser(auth0Id, email);
  if (!user) {
    throw new AppError(500, 'Failed to resolve user from session');
  }

  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const { searchParams } = new URL(req.url);

    const query = {
      year: searchParams.get('year'),
      quarter: searchParams.get('quarter'),
    };

    const breakdown = await taxService.calculateQuarterlyEstimate(
      user.id,
      query,
    );

    return NextResponse.json(breakdown);
  } catch (error) {
    return handleError(error);
  }
}


