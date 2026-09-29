import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const { error } = await supabase.from('qm_price_signals').insert({
    category: body.category,
    item_name: body.item_name,
    price: body.price,
    unit: body.unit,
    recorded_at: body.recorded_at,
    source: body.source || 'admin',
    status: 'approved',
  });
  if (error) return new Response(error.message, { status: 400 });
  return new Response('ok');
};