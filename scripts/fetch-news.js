/**
 * Qaraye Marchants — Agriculture News Auto-Curator
 * Pulls RSS feeds, filters for agriculture relevance, inserts into qm_news.
 */

import 'dotenv/config';
import Parser from 'rss-parser';
import TurndownService from 'turndown';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const FEEDS = [
  'https://news.google.com/rss/search?q=agriculture+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=farming+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=agricultural+produce+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=food+prices+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=crop+harvest+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=livestock+poultry+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=grains+rice+maize+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://nairametrics.com/category/agriculture/feed/',
  'https://businessday.ng/category/agriculture/feed/'
];

const KEYWORDS = [
  'farm', 'farmer', 'farming', 'agriculture', 'agricultural', 'agro',
  'crop', 'harvest', 'planting', 'seed', 'seedling', 'fertilizer',
  'livestock', 'poultry', 'cattle', 'goat', 'sheep', 'fish', 'fishery',
  'rice', 'maize', 'cassava', 'yam', 'tomato', 'pepper', 'onion',
  'grain', 'tuber', 'produce', 'food security', 'food prices',
  'market', 'merchant', 'trade', 'commodity', 'supply chain',
  'irrigation', 'pesticide', 'cocoa', 'groundnut', 'palm oil',
  'nigeria', 'naira', 'kano', 'kaduna', 'benue', 'oyo', 'lagos',
  'kebbi', 'sokoto', 'bauchi', 'jigawa', 'plateau', 'niger state'
];

const BLOCKLIST = [
  'crypto', 'bitcoin', 'ethereum', 'nft', 'stock market', 'bond yield',
  'forex trading', 'mutual fund', 'hedge fund', 'wall street',
  'celebrity', 'bikini', 'football score', 'horoscope', 'betting odds',
  'lottery result', 'movie', 'netflix', 'music video'
];

const MAX_PER_RUN = 20;

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws }
});

const parser = new Parser({ timeout: 15000 });
const turndown = new TurndownService();

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

function isRelevant(item) {
  const text = ((item.title || '') + ' ' + (item.contentSnippet || item.content || '') + ' ' + (item.categories || []).join(' ')).toLowerCase();
  const isBlocked = BLOCKLIST.some((word) => text.includes(word));
  if (isBlocked) return false;
  return KEYWORDS.some((word) => text.includes(word));
}

async function fetchFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (err) {
    console.warn('Feed failed:', url, '-', err.message);
    return [];
  }
}

function cleanDescription(item) {
  const raw = item.contentSnippet || item.content || item.description || '';
  return raw.replace(/<[^>]+>/g, '').trim().slice(0, 280);
}

function cleanBody(item) {
  const raw = item['content:encoded'] || item.content || item.description || '';
  try {
    return turndown.turndown(raw).slice(0, 4000);
  } catch {
    return raw.replace(/<[^>]+>/g, '').slice(0, 4000);
  }
}

async function main() {
  console.log('Starting news curation...');

  const allItems = [];
  for (const url of FEEDS) {
    console.log('Fetching:', url);
    const items = await fetchFeed(url);
    console.log('  Got', items.length, 'items');
    allItems.push(...items);
  }

  console.log('Total raw items:', allItems.length);

  const seenLinks = new Set();
  const relevant = [];
  for (const item of allItems) {
    if (!item.link || seenLinks.has(item.link)) continue;
    if (!isRelevant(item)) continue;
    seenLinks.add(item.link);
    relevant.push(item);
  }

  console.log('Relevant after filter:', relevant.length);

  relevant.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

  const toInsert = relevant.slice(0, MAX_PER_RUN);

  if (toInsert.length === 0) {
    console.log('No relevant news to insert.');
    return;
  }

  const rows = toInsert.map((item) => {
    const title = (item.title || '').trim();
    const slug = slugify(title) || ('news-' + Date.now());
    return {
      slug,
      title,
      description: cleanDescription(item),
      body: cleanBody(item),
      source_name: item.creator || item.author || 'News',
      source_url: item.link,
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
    };
  });

  // Fetch ALL existing slugs (paginated to handle >1000 rows)
  const existingSlugs = new Set();
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data: page, error: pageErr } = await supabase
      .from('qm_news')
      .select('slug')
      .range(from, from + PAGE_SIZE - 1);
    if (pageErr) {
      console.warn('Slug fetch failed:', pageErr.message);
      break;
    }
    if (!page || page.length === 0) break;
    for (const r of page) existingSlugs.add(r.slug);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Filter against DB + dedupe within the batch itself
  const seenInBatch = new Set();
  const newRows = rows.filter((r) => {
    if (existingSlugs.has(r.slug)) return false;
    if (seenInBatch.has(r.slug)) return false;
    seenInBatch.add(r.slug);
    return true;
  });
  console.log('New rows to insert:', newRows.length);

  if (newRows.length === 0) {
    console.log('All items already in database.');
    return;
  }

  // Use upsert to handle any remaining edge cases gracefully
 const { data, error } = await supabase
  .from('qm_news')
  .upsert(rows, {
    onConflict: 'slug',
    ignoreDuplicates: true
  });

if (error) {
  console.error('Upsert failed:', error.message);
  process.exit(1);
}

console.log(`✅ Upserted ${data?.length ?? 0} rows (duplicates skipped)`);
    // Do NOT exit(1) — allow the workflow to complete
  } else {
    console.log('Inserted', newRows.length, 'news items.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
