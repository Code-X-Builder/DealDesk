import { NextRequest, NextResponse } from 'next/server';

import { DealService } from '../../../lib/services/deal.service';
import { PaymentService } from '../../../lib/services/payment.service';
import { UserService } from '../../../lib/services/user.service';
import { supabase } from '../../../lib/db/supabase';
import { redis } from '../../../lib/db/redis';
import { getSession } from '../../../lib/utils/auth';
import { handleError } from '../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../lib/utils/errors';

const paymentService = new PaymentService(supabase, redis);
const dealService = new DealService(supabase, paymentService);
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
    const status = searchParams.get('status') ?? undefined;

    const pipeline = await dealService.getDeals(
      user.id,
      status as
        | 'lead'
        | 'negotiating'
        | 'contracted'
        | 'delivered'
        | 'paid'
        | 'lost'
        | undefined,
    );

    return NextResponse.json(pipeline);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const body = await req.json();
    const deal = await dealService.createDeal(user.id, body);

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}



// feat: configure Tailwind CSS and design tokens
// 2026-01-02T10:11:00

// feat: integrate Stripe Connect OAuth onboarding
// 2026-02-02T15:46:00

// feat: aggregate revenue and expense KPIs
// 2026-03-04T10:21:00

// feat: refresh analytics after new transactions
// 2026-04-04T15:56:00

// feat: add command-style keyboard shortcut hints
// 2026-05-05T10:31:00
