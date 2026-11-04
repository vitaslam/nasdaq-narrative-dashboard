import fs from 'node:fs/promises';

const fail = message => { throw Error(`muse-feed.json: ${message}`); };
const feed = JSON.parse(await fs.readFile(new URL('../muse-feed.json', import.meta.url), 'utf8'));
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
const timestamp = value => typeof value === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && !Number.isNaN(Date.parse(value));
const url = value => typeof value === 'string' && /^https:\/\/[^\s/]+\//.test(value);
const number = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const keys = (value, allowed, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${label}.${key} is not an allowed field`);
};
keys(feed, ['schema_version','batch_id','week_id','generated_at','x_topics_upsert','weekly_trends','market_bars','volatility_readings','market_indicators'], 'root');
if (feed.schema_version !== 1 || !date(feed.week_id)) fail('invalid schema version or week_id');
if (typeof feed.batch_id !== 'string' || !/^[a-zA-Z0-9:._-]{1,80}$/.test(feed.batch_id)) fail('invalid batch_id');
if (feed.batch_id !== 'template' && !timestamp(feed.generated_at)) fail('generated_at must be a timestamp');
if (!Array.isArray(feed.x_topics_upsert)) fail('X topics must be an array');
const topicIds = new Set(), postIds = new Set();
for (const topic of feed.x_topics_upsert) {
  keys(topic, ['id','title','summary','posts'], 'topic');
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(topic.id || '') || topicIds.has(topic.id)) fail('invalid or duplicate topic id');
  topicIds.add(topic.id);
  if (!topic.title?.trim() || !topic.summary?.trim() || !Array.isArray(topic.posts) || !topic.posts.length) fail('topic needs a title, summary, and posts');
  for (const post of topic.posts) {
    keys(post, ['id','author','published_at','quote','viewpoint','translation_zh','translation_scope','translation_source_url','views','reposts','replies','observed_at','source_url','metrics_source','verification','avatar_url','avatar_source','impact','context'], 'post');
    if (!/^[a-z0-9][a-z0-9-]{1,99}$/.test(post.id || '') || postIds.has(post.id)) fail('invalid or duplicate post id');
    postIds.add(post.id);
    if (!/^@[A-Za-z0-9_]{1,15}$/.test(post.author || '') || !timestamp(post.published_at) || !timestamp(post.observed_at)) fail('invalid X author or timestamp');
    if (!url(post.source_url) || !url(post.metrics_source) || !post.viewpoint?.trim() || !post.verification?.trim()) fail('post needs original, metrics source, viewpoint, verification');
    if (typeof post.translation_zh !== 'string' || !post.translation_zh.trim()) fail(`${topic.id}/${post.id} needs a faithful Chinese translation_zh`);
    if (post.translation_scope != null && !['full','post_only','excerpt'].includes(post.translation_scope)) fail(`${topic.id}/${post.id} has invalid translation_scope`);
    if (post.translation_scope === 'full' && !url(post.translation_source_url)) fail(`${topic.id}/${post.id} full translation needs a retrievable original-text source`);
    if (post.quote != null && (typeof post.quote !== 'string' || post.quote.length > 220 || post.quote.trim().split(/\s+/).length > 25)) fail('quote must be short (up to 25 words)');
    for (const key of ['views','reposts','replies']) if (post[key] !== null && post[key] !== undefined && (!Number.isInteger(post[key]) || post[key] < 0)) fail(`${key} must be nonnegative integer or null`);
    if (post.avatar_url != null && !url(post.avatar_url) && !/^\/assets\/avatars\/[a-z0-9_-]+\.jpg$/.test(post.avatar_url)) fail('avatar URL invalid');
    if (post.avatar_url && !url(post.avatar_source)) fail('avatar needs verification source');
    if (!Array.isArray(post.impact) || post.impact.length > 4) fail('impact must have at most four entries');
    for (const item of post.impact) {
      keys(item, ['targets','direction','reason'], 'impact');
      if (!item.targets?.trim() || !item.direction?.trim() || !item.reason?.trim()) fail('impact needs targets, direction and reason');
    }
  }
}
if (feed.weekly_trends != null) {
  if (!Array.isArray(feed.weekly_trends)) fail('weekly_trends must be an array');
  const trendIds = new Set();
  for (const trend of feed.weekly_trends) {
    keys(trend, ['id','title','summary','status','asof','evidence_post_ids','caveat','benefit_tags'], 'weekly_trend');
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(trend.id || '') || trendIds.has(trend.id)) fail('invalid or duplicate weekly trend id');
    trendIds.add(trend.id);
    if (!trend.title?.trim() || !trend.summary?.trim() || !['tracking','final'].includes(trend.status) || !timestamp(trend.asof)) fail('trend needs dated title, summary and status');
    if (!Array.isArray(trend.evidence_post_ids) || new Set(trend.evidence_post_ids).size < 2 || trend.evidence_post_ids.length > 12) fail('trend needs at least two distinct post IDs');
    if (!Array.isArray(trend.benefit_tags) || trend.benefit_tags.length > 6 || !trend.benefit_tags.every(tag => typeof tag === 'string' && tag.trim() && tag.length <= 45)) fail('trend benefit tags invalid');
    if (trend.caveat != null && (typeof trend.caveat !== 'string' || trend.caveat.length > 300)) fail('trend caveat too long');
  }
}
keys(feed.market_bars, ['NDX','QQQ','SPX'], 'market_bars');
const barDates = {};
for (const symbol of ['NDX','QQQ','SPX']) {
  const bars = feed.market_bars[symbol];
  if (!Array.isArray(bars) || bars.length > 5) fail(`${symbol} must contain at most five closes`);
  barDates[symbol] = bars.map(bar => {
    keys(bar, ['date','c','o','h','l','v','source_url'], symbol);
    if (!date(bar.date) || !url(bar.source_url) || !['c','o','h','l'].every(key => number(bar[key]))) fail(`${symbol} needs a dated sourced full OHLC`);
    if (bar.h < Math.max(bar.o,bar.c,bar.l) || bar.l > Math.min(bar.o,bar.c,bar.h) || bar.v != null && (!Number.isInteger(bar.v) || bar.v < 0)) fail(`${symbol} inconsistent OHLC/volume`);
    return bar.date;
  });
  if (new Set(barDates[symbol]).size !== bars.length) fail(`${symbol} has duplicate dates`);
}
if (JSON.stringify(barDates.NDX) !== JSON.stringify(barDates.QQQ) || JSON.stringify(barDates.NDX) !== JSON.stringify(barDates.SPX)) fail('NDX/QQQ/SPX dates must match and be in the same order');
if (!Array.isArray(feed.volatility_readings) || feed.volatility_readings.length > 5) fail('volatility_readings must contain at most five sessions');
const volDates = new Set();
for (const row of feed.volatility_readings) {
  keys(row, ['date','vix','vxn'], 'volatility');
  if (!date(row.date) || volDates.has(row.date)) fail('invalid or duplicate volatility date');
  volDates.add(row.date);
  for (const key of ['vix','vxn']) {
    keys(row[key], ['value','source_url'], key);
    if (!number(row[key].value) || !url(row[key].source_url)) fail(`${key} needs a value and source`);
  }
}
if (feed.market_indicators != null) {
  keys(feed.market_indicators, ['CNN','BofA','CTA','UST10Y','UST30Y','Brent','FedHike','VXFutures'], 'market_indicators');
  const futures = feed.market_indicators.VXFutures;
  if (futures != null) {
    keys(futures, ['vx1','vx2','asof','front_expiry','second_expiry','source_url'], 'VXFutures');
    if (!number(futures.vx1) || !number(futures.vx2) || !date(futures.asof) ||
        !date(futures.front_expiry) || !date(futures.second_expiry) ||
        futures.front_expiry <= futures.asof || futures.second_expiry <= futures.front_expiry ||
        !/^https:\/\/(?:www\.)?cboe\.com\//.test(futures.source_url || ''))
      fail('VXFutures needs same-day first/second monthly VX settlements, expiries and Cboe source');
  }
  for (const key of ['CNN','BofA']) {
    const row = feed.market_indicators[key];
    if (row == null) continue;
    keys(row, ['value','asof','prior','prior_asof','source_url','source_label'], key);
    if (!Number.isFinite(row.value) || row.value < 0 || row.value > (key === 'CNN' ? 100 : 10) || !date(row.asof) || !url(row.source_url)) fail(`${key} needs a dated sourced value`);
    if (row.prior != null && (!Number.isFinite(row.prior) || row.prior < 0 || row.prior > (key === 'CNN' ? 100 : 10) || !date(row.prior_asof) || row.prior_asof >= row.asof)) fail(`${key} prior reading invalid`);
  }
  for (const key of ['UST10Y','UST30Y','Brent']) {
    const row = feed.market_indicators[key];
    if (row == null) continue;
    keys(row, ['value','asof','source_url'], key);
    const official = key === 'Brent' ? /^https:\/\/(?:www\.)?eia\.gov\// : /^https:\/\/home\.treasury\.gov\//;
    if (!Number.isFinite(row.value) || row.value <= 0 || row.value > (key === 'Brent' ? 500 : 15) || !date(row.asof) || !official.test(row.source_url || '')) fail(`${key} needs an official dated sourced reading`);
  }
  const fed = feed.market_indicators.FedHike;
  if (fed != null) {
    keys(fed, ['value','meeting','asof','source_url','method'], 'FedHike');
    if (!Number.isFinite(fed.value) || fed.value < 0 || fed.value > 100 || !date(fed.meeting) || !date(fed.asof) || !/^https:\/\/(?:www\.)?polymarket\.com\/event\//.test(fed.source_url || '') || !fed.method?.trim()) fail('FedHike needs a meeting date, percentage, Polymarket market and aggregation method');
  }
  const cta = feed.market_indicators.CTA;
  if (cta != null) {
    keys(cta, ['value','asof','data_kind','scope','institution','model','source_url','source_label','report_date','summary','confidence_note','unit','digits','label'], 'CTA');
    if (!number(cta.value) || !date(cta.asof) || cta.data_kind !== 'sell_trigger' || !/\bSPX\b|\bES(?:[A-Z]\d{1,2})?\b/i.test(cta.scope || '') || !cta.institution?.trim() || !cta.model?.trim() || !url(cta.source_url)) fail('CTA needs a sourced SPX or ES sell trigger, institution, model and date');
    if (cta.report_date != null && !date(cta.report_date)) fail('CTA report date invalid');
  }
}
console.log(`Valid Muse handoff: ${feed.batch_id}; ${feed.x_topics_upsert.length} topics, ${barDates.NDX.length} market sessions, ${volDates.size} volatility sessions. Evidence still requires human/agent verification.`);

