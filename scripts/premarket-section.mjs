const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const displayTime = value => {
  if (!value || Number.isNaN(Date.parse(value))) return '尚未更新';
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type)?.value || '';
  return get('month') + '/' + get('day') + ' ' + get('hour') + ':' + get('minute') + ' 北京时间';
};
const list = (items, kind) => {
  if (!Array.isArray(items) || !items.length) return '<p class="prelogic-empty">等待本时段核验</p>';
  return '<ol class="prelogic-list">' + items.slice(0,3).map((item,index) => {
    const title = esc(item.title);
    const link = Array.isArray(item.source_urls) && item.source_urls.find(url => /^https:\/\//.test(url));
    const heading = link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + title + '</a>' : title;
    return '<li class="prelogic-item"><span class="prelogic-rank">' + (index+1) + '</span><div><strong>' + heading + '</strong>' + (item.detail ? '<p>' + esc(item.detail) + '</p>' : '') + '</div></li>';
  }).join('') + '</ol>';
};
export function renderPremarketSection(data, weekStart, activeWeek) {
  const days = data?.days || {};
  const dates = Object.keys(days).filter(date => date >= weekStart && date < new Date(Date.parse(weekStart+'T00:00:00Z')+7*86400000).toISOString().slice(0,10)).sort();
  const day = dates.at(-1);
  if (!day && weekStart !== activeWeek) return '';
  const row = day ? days[day] : null;
  const label = day ? day.slice(5).replace('-', '/') : '本周';
  return '<section class="prelogic" id="premarket-logic" aria-labelledby="prelogic-title"><div class="prelogic-heading"><div><span class="prelogic-eyebrow">MARKET OPEN / NASDAQ</span><h2 id="prelogic-title">盘前逻辑 <span>' + esc(label) + '</span></h2></div><div class="prelogic-updated">更新 ' + displayTime(row?.updated_at) + '</div></div><div class="prelogic-columns"><div class="prelogic-panel prelogic-bull"><h3>多头逻辑</h3>' + list(row?.bull,'bull') + '</div><div class="prelogic-panel prelogic-bear"><h3>空头逻辑</h3>' + list(row?.bear,'bear') + '</div></div><div class="prelogic-risk"><h3>盘中风险点 <span>按优先级排序</span></h3>' + list(row?.risks,'risk') + '</div></section>';
}
export const premarketCSS = `<style>
.prelogic{margin:22px 0 28px;padding:22px 26px;border:1px solid #dfe5eb;border-radius:16px;background:#fff;color:#1d2936;box-shadow:0 8px 25px #1d293608}
.prelogic-heading{display:flex;justify-content:space-between;align-items:end;gap:18px;margin-bottom:18px}
.prelogic-eyebrow{display:block;color:#98a6bb;font-size:10px;font-weight:700;letter-spacing:.15em;margin-bottom:5px}
.prelogic h2{font-size:22px;margin:0;line-height:1.3}.prelogic h2 span{font-size:13px;color:#91a0b4;font-weight:500}
.prelogic-updated{color:#74849a;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
.prelogic-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.prelogic-panel,.prelogic-risk{border-radius:12px;padding:17px 18px}
.prelogic-bull{background:#edf6f2}.prelogic-bear{background:#f8f0f1}.prelogic-risk{background:#f3f5fa;margin-top:12px}
.prelogic h3{font-size:14px;margin:0 0 12px;font-weight:700}.prelogic-bull h3{color:#24755d}.prelogic-bear h3{color:#aa5861}.prelogic-risk h3{color:#394966}.prelogic-risk h3 span{font-size:11px;color:#91a0b4;font-weight:500;margin-left:6px}
.prelogic-list{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.prelogic-item{display:grid;grid-template-columns:23px minmax(0,1fr);gap:9px;align-items:start}
.prelogic-rank{display:grid;place-items:center;width:21px;height:21px;border-radius:7px;background:#ffffffb8;color:#637187;font-size:11px;font-weight:700}
.prelogic-item strong{font-size:13px;line-height:1.5}.prelogic-item p{font-size:12px;line-height:1.65;color:#677589;margin:3px 0 0}.prelogic-item a{color:inherit;text-decoration:none;border-bottom:1px dotted #8391a2}
.prelogic-empty{font-size:12px;color:#91a0b4;margin:0}
@media(max-width:700px){.prelogic{margin:18px 0 24px;padding:17px 16px;border-radius:15px}.prelogic-heading{align-items:start;flex-direction:column;gap:5px;margin-bottom:13px}.prelogic h2{font-size:19px}.prelogic-columns{grid-template-columns:1fr;gap:9px}.prelogic-panel,.prelogic-risk{padding:14px 15px}.prelogic-item strong{font-size:13px}.prelogic-updated{font-size:11px}}
</style>`;
