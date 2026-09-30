import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { PaymentService } from '../../../../../lib/services/payment.service';
import { supabase } from '../../../../../lib/db/supabase';
import { redis } from '../../../../../lib/db/redis';
import { logger } from '../../../../../lib/utils/logger';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey || !stripeWebhookSecret) {
  // Fail fast in development if Stripe is not configured.
  // In production, this would surface as a deployment/config error.
  // eslint-disable-next-line no-console
  console.error('Stripe environment variables are not configured correctly.');
}

const stripe = new Stripe(stripeSecretKey ?? '', {
  apiVersion: '2023-10-16',
});

const paymentService = new PaymentService(supabase, redis);

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');

  if (!signature || !stripeWebhookSecret) {
    logger.warn('stripe.webhook.missing_signature');
    return new NextResponse('Bad Request', { status: 400 });
  }

  const rawBody = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    );

    await paymentService.processStripeEvent(event);

    // Webhook-safe: acknowledge quickly after delegating to the service.
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'StripeSignatureVerificationError'
    ) {
      logger.warn('stripe.webhook.signature_invalid', {
        message: error.message,
      });
      return new NextResponse('Invalid signature', { status: 400 });
    }

    logger.error('stripe.webhook.unhandled_error', error as Error);

    // Return 200 OK to avoid repeated retries while still logging the error.
    return new NextResponse('OK', { status: 200 });
  }
}


