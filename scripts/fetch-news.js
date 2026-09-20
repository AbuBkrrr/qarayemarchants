/**
 * Qaraye Marchants — News auto-curator
 * Pulls RSS feeds, filters for relevance, inserts into qm_news table.
 * Run daily via GitHub Action (.github/workflows/daily-news.yml).
 */

import 'dotenv/config';
import Parser from 'rss-parser';
import TurndownService from 'turndown';
import { createClient } from '@supabase/supabase-js';

const FEEDS = [
  'https://news.google.com/rss/search?q=business+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=personal+finance+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=real+estate+lagos&hl=en-NG&gl=NG&ceid=NG:en',
  'https://news.google.com/rss/search?q=central+bank+of+nigeria&hl=en-NG&gl=NG&ceid=NG:en',
  'https://nairametrics.com/feed/',
  'https://businessday.ng/feed/',
];

const KEYWORDS = [
  'nigeria', 'naira', 'lagos', 'abuja', 'cbn', 'tax', 'mortgage',
  'real estate', 'property', 'solar', 'investment', 'loan',
  'business', 'startup', 'salary', 'savings', 'inflation',
  'interest rate', 'housing', 'rent', 'bank', 'fintech', 'construction',
];

const BLOCKLIST = [
  'celebrity', 'bikini', 'football score', 'horoscope',
  'lottery result', 'betting odds',
];

const MAX_PER_RUN = 5;

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'QM-Bot/1.0' } });
const turndown = new TurndownService({ headingStyle: 'atx' });

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function isRelevant(item) {
  const title = (item.title || '').toLowerCase();
  if (title.length < 20) return false;
  if (!KEYWORDS.some((k) => title.includes(k))) return false;
  if (BLOCKLIST.some((b) => title.includes(b))) return false;
  return true;
}

function cleanMarkdown(md) {
  return String(md).replace(/^\s*---\s*$/gm, '').replace(/\r\n/g, '\n').trim();
}

async function run() {
  let inserted = 0;

  for (const url of FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      console.log('Feed: ' + (feed.title || url) + ' — ' + feed.items.length + ' items');

      for (const item of feed.items) {
        if (inserted >= MAX_PER_RUN) break;
        if (!isRelevant(item)) continue;

        const slug = slugify(item.title);
        const { data: existing } = await supabase
          .from('qm_news')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        if (existing) continue;

        const md = cleanMarkdown(turndown.turndown(item.content || item.contentSnippet || ''));
        const { error } = await supabase.from('qm_news').insert({
          slug: slug,
          title: item.title,
          description: (item.contentSnippet || item.title).slice(0, 160),
          source_name: feed.title || 'News',
          source_url: item.link,
          content_markdown: md.slice(0, 8000),
          language: 'en',
        });

        if (error) { console.error('Insert failed: ' + error.message); continue; }
        console.log('Inserted: ' + slug);
        inserted++;
      }
    } catch (err) {
      console.error('Feed error (' + url + '): ' + err.message);
    }
  }

  console.log('\nTotal inserted: ' + inserted);
}

run().catch((e) => { console.error(e); process.exit(1); });