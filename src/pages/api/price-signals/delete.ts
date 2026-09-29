import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await request.json();
  const { error } = await supabase.from('qm_price_signals').delete().eq('id', id);
  if (error) return new Response(error.message, { status: 400 });
  return new Response('ok');
};