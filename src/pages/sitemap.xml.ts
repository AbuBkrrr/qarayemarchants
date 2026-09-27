import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

const SITE_URL = 'https://qarayemarchants.com.ng';

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/products', priority: '0.9', changefreq: 'hourly' },
  { path: '/trending', priority: '0.8', changefreq: 'hourly' },
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' }
];

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return '  <url>\n    <loc>' + escapeXml(loc) + '</loc>\n    <lastmod>' + lastmod + '</lastmod>\n    <changefreq>' + changefreq + '</changefreq>\n    <priority>' + priority + '</priority>\n  </url>';
}

export const GET: APIRoute = async () => {
  const today = new Date().toISOString();
  const entries: string[] = STATIC_PAGES.map(p => urlEntry(SITE_URL + p.path, today, p.changefreq, p.priority));

  try {
    const { data: products } = await supabase
      .from('products')
      .select('id, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(2000);

    (products || []).forEach((p: any) => {
      const lastmod = p.created_at ? new Date(p.created_at).toISOString() : today;
      entries.push(urlEntry(SITE_URL + '/products/' + p.id, lastmod, 'weekly', '0.7'));
    });

    const { data: news } = await supabase
      .from('qm_news')
      .select('slug, published_at')
      .order('published_at', { ascending: false })
      .limit(1000);

    (news || []).forEach((n: any) => {
      const lastmod = n.published_at ? new Date(n.published_at).toISOString() : today;
      entries.push(urlEntry(SITE_URL + '/news/' + n.slug, lastmod, 'weekly', '0.6'));
    });

    const { data: posts } = await supabase
      .from('qm_posts')
      .select('id, created_at')
      .or('status.eq.published,status.is.null')
      .order('created_at', { ascending: false })
      .limit(500);

    (posts || []).forEach((p: any) => {
      const lastmod = p.created_at ? new Date(p.created_at).toISOString() : today;
      entries.push(urlEntry(SITE_URL + '/post/' + p.id, lastmod, 'monthly', '0.5'));
    });
  } catch (err) {
    // Static entries only if DB fails
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries.join('\n') + '\n</urlset>';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};