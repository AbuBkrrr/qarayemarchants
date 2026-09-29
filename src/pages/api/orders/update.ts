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
  if (!body.id) return new Response('Missing id', { status: 400 });

  const allowed = ['status', 'notes'];
  const patch: Record<string, any> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) return new Response('No fields', { status: 400 });

  const { error } = await supabase.from('qm_orders').update(patch).eq('id', body.id);
  if (error) return new Response(error.message, { status: 400 });
  return new Response('ok');
};