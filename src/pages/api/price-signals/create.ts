import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return new Response('Missing token', { status: 401 });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return new Response('Unauthorized', { status: 401 });

  const { data: prof } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!prof?.is_admin) return new Response('Forbidden', { status: 403 });

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