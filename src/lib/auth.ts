import type { AstroCookies } from 'astro';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars for server-side auth.');
}

export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try { cookies.set(name, value, { ...options, path: '/' }); } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try { cookies.delete(name, { ...options, path: '/' }); } catch {}
      },
    },
  });
}

export async function getCurrentUser(cookies: AstroCookies) {
  const supabase = createSupabaseServerClient(cookies);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function isAdmin(cookies: AstroCookies, userId: string): Promise<boolean> {
  if (!userId) return false;
  const supabase = createSupabaseServerClient(cookies);
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  return !!data?.is_admin;
}