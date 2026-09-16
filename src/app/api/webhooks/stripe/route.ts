import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSystemError } from "@/lib/observability/log-error";
import type Stripe from "stripe";

// Webhooks bypass RLS via the service-role client because there is no user
// session on this request — Stripe calls this endpoint directly, and the
// signature check below is what proves authenticity instead of a cookie.
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();
  const admin = createAdminClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature.";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        if (userId && session.customer) {
          await admin
            .from("subscriptions")
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              plan_id: planId ?? "student",
              status: "active",
            })
            .eq("user_id", userId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const planId = sub.metadata?.plan_id;
        const statusMap: Record<string, string> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "canceled",
          incomplete: "incomplete",
          incomplete_expired: "canceled",
          unpaid: "past_due",
          paused: "canceled",
        };

        const update: Record<string, unknown> = {
          status: statusMap[sub.status] ?? "active",
          cancel_at_period_end: sub.cancel_at_period_end,
          stripe_subscription_id: sub.id,
        };
        if (planId) update.plan_id = planId;

        if (userId) {
          await admin.from("subscriptions").update(update).eq("user_id", userId);
        } else {
          // Fallback: match by Stripe customer id if metadata wasn't propagated.
          await admin.from("subscriptions").update(update).eq("stripe_customer_id", sub.customer as string);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await admin
          .from("subscriptions")
          .update({ status: "canceled", plan_id: "free" })
          .eq("stripe_customer_id", sub.customer as string);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await admin.from("subscriptions").update({ status: "past_due" }).eq("stripe_customer_id", invoice.customer as string);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing error.";
    await logSystemError(admin, { scope: "stripe_webhook", message, metadata: { eventType: event.type } });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
