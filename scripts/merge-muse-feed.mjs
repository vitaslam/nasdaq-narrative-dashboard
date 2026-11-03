// Merge Muse's cumulative weekly handoff into a disposable export snapshot.
// The GPT Site remains the source for every field outside X and market readings.
const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function analytics(bars) {
  const closes = bars.map(bar => bar.c);
  const mean = n => closes.length >= n ? closes.slice(-n).reduce((sum, value) => sum + value, 0) / n : null;
  const ranges = bars.map((bar, index) => bar.h != null && bar.l != null
    ? Math.max(bar.h - bar.l, index ? Math.abs(bar.h - bars[index - 1].c) : 0, index ? Math.abs(bar.l - bars[index - 1].c) : 0)
    : null);
  let atr = null;
  if (ranges.length >= 14 && ranges.every(value => value !== null)) {
    atr = ranges.slice(0, 14).reduce((sum, value) => sum + value, 0) / 14;
    for (const range of ranges.slice(14)) atr = (atr * 13 + range) / 14;
  }
  return {last: bars.at(-1), n: bars.length, first: bars[0]?.date, sma20: mean(20), sma50: mean(50), sma100: mean(100), sma200: mean(200), atr14: atr};
}

function postTimeError(post) {
  // X snowflake IDs encode creation time. A year-old post must not masquerade
  // as a fresh observation even if its feed timestamp is syntactically valid.
  if (!/^\d{16,20}$/.test(post.id)) return null;
  const encoded = Number(BigInt(post.id) >> 22n) + 1288834974657;
  const reported = Date.parse(post.published_at);
  if (!Number.isFinite(reported) || Math.abs(encoded - reported) > 48 * 3600_000)
    return `X ID indicates ${new Date(encoded).toISOString()} but published_at says ${post.published_at}`;
  return null;
}

export function mergeMuseFeed(exportData, feed, {now = new Date().toISOString()} = {}) {
  const data = clone(exportData);
  const warnings = [];
  const stats = {topics: 0, posts: 0, rejected_posts: 0, bars: 0, volatility_dates: 0, changed: false};
  const week = data.weeks?.[feed.week_id];
  if (!week?.snapshot) return {data, warnings: [`Muse batch ${feed.batch_id}: week ${feed.week_id} absent from export; no merge`], stats};
  const before = JSON.stringify(week);
  week.x_topics ??= [];
  const topics = new Map(week.x_topics.map(topic => [topic.id, topic]));
  for (const incoming of feed.x_topics_upsert) {
    const validPosts = [];
    for (const post of incoming.posts) {
      const error = postTimeError(post);
      if (error) {warnings.push(`Muse ${incoming.id}/${post.id}: ${error}; skipped`); stats.rejected_posts++; continue;}
      validPosts.push(post);
    }
    if (!validPosts.length) {warnings.push(`Muse topic ${incoming.id}: no valid posts; skipped`); continue;}
    const previous = topics.get(incoming.id);
    const byId = new Map((previous?.posts || []).map(post => [post.id, post]));
    for (const post of validPosts) {
      byId.set(post.id, {...byId.get(post.id), ...clone(post)});
      stats.posts++;
    }
    topics.set(incoming.id, {...previous, ...clone(incoming), posts: [...byId.values()]});
    stats.topics++;
  }
  week.x_topics = [...topics.values()];
  if (Array.isArray(feed.weekly_trends)) {
    week.x_trends ??= [];
    const trends = new Map(week.x_trends.map(trend => [trend.id, trend]));
    const posts = new Map(week.x_topics.flatMap(topic => (topic.posts || []).map(post => [post.id, post])));
    for (const trend of feed.weekly_trends) {
      const evidence = [...new Set(trend.evidence_post_ids)].map(id => posts.get(id)).filter(Boolean);
      if (evidence.length < 2 || new Set(evidence.map(post => post.author.toLowerCase())).size < 2) {
        warnings.push(`Muse trend ${trend.id}: needs two available posts by different authors; skipped`);
        continue;
      }
      trends.set(trend.id, {...trends.get(trend.id), ...clone(trend)});
    }
    week.x_trends = [...trends.values()];
  }

  const snap = week.snapshot;
  snap.bars ??= {};
  snap.analytics ??= {};
  for (const symbol of ['NDX', 'QQQ', 'SPX']) {
    const incoming = feed.market_bars[symbol];
    const byDate = new Map((snap.bars[symbol] || []).map(bar => [bar.date, bar]));
    for (const bar of incoming) {
      byDate.set(bar.date, {...byDate.get(bar.date), ...clone(bar)});
      stats.bars++;
    }
    snap.bars[symbol] = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    if (incoming.length && ['NDX', 'QQQ'].includes(symbol)) snap.analytics[symbol] = analytics(snap.bars[symbol]);
  }
  const newest = ['NDX', 'QQQ', 'SPX'].map(symbol => snap.bars[symbol].at(-1)?.date);
  if (newest[0] && newest.every(date => date === newest[0]) && newest[0] > (week.price_cutoff || '')) {
    week.price_cutoff = snap.price_cutoff = snap.generated_date = newest[0];
    const baseline = snap.bars.NDX.filter(bar => bar.date < week.start).at(-1);
    if (baseline && newest[0] >= week.start) snap.ndx_weekly = snap.bars.NDX.at(-1).c / baseline.c - 1;
  }

  const volatility = snap.volatility ??= {dates: [], vix: [], vxn: []};
  const byDate = new Map(volatility.dates.map((date, i) => [date, {vix: volatility.vix[i], vxn: volatility.vxn[i]}]));
  snap.asof_metrics ??= {};
  snap.sentiment ??= {};
  for (const reading of feed.volatility_readings) {
    byDate.set(reading.date, {vix: reading.vix.value, vxn: reading.vxn.value});
    stats.volatility_dates++;
    for (const [key, source] of [['VIX', reading.vix], ['VXN', reading.vxn]]) {
      const lower = key.toLowerCase();
      if (reading.date >= (snap.sentiment[key]?.asof || ''))
        snap.sentiment[key] = {...snap.sentiment[key], value: source.value, asof: reading.date, source_url: source.source_url};
      if (reading.date >= (snap.asof_metrics[lower]?.observation_date || ''))
        snap.asof_metrics[lower] = {...snap.asof_metrics[lower], value: source.value, observation_date: reading.date, available_date: reading.date, source_url: source.source_url};
    }
  }
  const dates = [...byDate.keys()].sort();
  volatility.dates = dates;
  volatility.vix = dates.map(date => byDate.get(date).vix);
  volatility.vxn = dates.map(date => byDate.get(date).vxn);
  if (newest[0] && newest.every(date => date === newest[0]) && newest[0] > (snap.asof_metrics.date || ''))
    snap.asof_metrics.date = newest[0];
  // These are report-date observations, not daily bars. Older cumulative feed
  // snapshots cannot roll the dashboard back to an earlier report.
  snap.indicator_history ??= {};
  for (const key of ['CNN', 'BofA', 'CTA', 'UST10Y', 'UST30Y', 'Brent', 'FedHike']) {
    const incoming = feed.market_indicators?.[key];
    if (!incoming || incoming.asof < (snap.sentiment[key]?.asof || '')) continue;
    snap.sentiment[key] = {...snap.sentiment[key], ...clone(incoming)};
    const field = {CNN: 'cnnFearGreed', BofA: 'bofaBullBear', CTA: 'cta', UST10Y: 'ust10y', UST30Y: 'ust30y', Brent: 'brent', FedHike: 'fedHike'}[key];
    snap.asof_metrics[field] = {...snap.asof_metrics[field], value: incoming.value, observation_date: incoming.asof, available_date: incoming.asof, source_url: incoming.source_url};
    const history = snap.indicator_history[key] ??= [];
    const byReportDate = new Map(history.map(row => [row.date, row]));
    byReportDate.set(incoming.asof, {...byReportDate.get(incoming.asof), date: incoming.asof, ...clone(incoming)});
    snap.indicator_history[key] = [...byReportDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  const futures = feed.market_indicators?.VXFutures;
  if (futures && futures.asof >= (snap.sentiment.VXFutures?.asof || '')) {
    snap.sentiment.VXFutures = clone(futures);
    const history = snap.indicator_history.VXFutures ??= [];
    const byDate = new Map(history.map(row => [row.date, row]));
    byDate.set(futures.asof, {date: futures.asof, ...clone(futures)});
    snap.indicator_history.VXFutures = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  stats.changed = !same(JSON.parse(before), week);
  if (stats.changed) week.updated_at = now;
  return {data, warnings, stats};
}
