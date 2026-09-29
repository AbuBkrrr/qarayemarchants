import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.cart || !Array.isArray(body.cart) || body.cart.length === 0) {
      return new Response('Empty cart', { status: 400 });
    }
    if (!body.name || !body.phone) {
      return new Response('Missing name or phone', { status: 400 });
    }

    const total = body.cart.reduce((s: number, i: any) => s + Number(i.qty) * Number(i.price), 0);

    const { error } = await supabase.from('qm_orders').insert({
      customer_name: body.name,
      customer_phone: body.phone,
      customer_email: body.email || null,
      delivery_location: body.location || null,
      notes: body.notes || null,
      items: body.cart,
      total,
      status: 'pending',
    });

    if (error) return new Response(error.message, { status: 400 });
    return new Response('ok');
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};