// src/pages/api/escrow/initiate.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { productId, amount, currency = 'NGN' } = body;

    if (!productId || !amount) {
      return new Response(JSON.stringify({ error: 'Missing productId or amount' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // -------------------------------------------------------------
    // ACTIVATE ONE OF THESE BLOCKS when you have provider access:
    // -------------------------------------------------------------
    //
    // === PAYSTACK (recommended for Nigeria) ===
    // const res = await fetch('https://api.paystack.co/transaction/initialize', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${import.meta.env.PAYSTACK_SECRET_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     email: 'buyer@example.com',
    //     amount: Math.round(amount * 100),
    //     currency,
    //     reference: `QM-${productId}-${Date.now()}`,
    //     callback_url: 'https://qarayemarchants.com.ng/escrow/success',
    //   }),
    // });
    // const data = await res.json();
    // return new Response(JSON.stringify({ checkoutUrl: data.data.authorization_url }), { status: 200 });
    //
    // === TAZAPAY (cross-border) ===
    // === TRUSTCROW (Nigerian escrow) ===
    // === FLUTTERWAVE (Africa multi-currency) ===
    // -------------------------------------------------------------

    return new Response(JSON.stringify({
      error: 'Escrow provider not yet configured. Contact support@qarayemarchants.com.ng to complete this purchase securely.',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: 'Escrow initiation failed: ' + err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};