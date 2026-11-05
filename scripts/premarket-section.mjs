const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const displayTime = value => {
  if (!value || Number.isNaN(Date.parse(value))) return '尚未更新';
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type)?.value || '';
  return get('month') + '/' + get('day') + ' ' + get('hour') + ':' + get('minute') + ' 北京时间';
};
const marketBar = items => !Array.isArray(items) || !items.length ? '' : '<div class="prelogic-market" aria-label="盘前价格快照">' + items.slice(0,5).map(item => '<div class="prelogic-quote"><b>' + esc(item.symbol) + '</b><strong class="' + (Number(item.change_pct)<0?'negative':'positive') + '">' + (Number(item.change_pct)>0?'+':'') + Number(item.change_pct).toFixed(2) + '%</strong><small>' + esc(item.asof_label || '') + '</small></div>').join('') + '</div>';
const timeline = row => { const groups=[['最近落地',row?.recent],['待落地事件',row?.upcoming]]; if(!groups.some(([,items])=>Array.isArray(items)&&items.length))return ''; return '<div class="prelogic-timeline">' + groups.map(([label,items])=>'<div class="prelogic-timeline-group"><h3>'+label+'</h3>'+(Array.isArray(items)?items.map(item=>{const url=item.source_urls?.find(u=>/^https:\/\//.test(u));const title=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(item.title)+'</a>':esc(item.title);return '<article><time>'+esc(item.time)+'</time><div><strong>'+title+'</strong><p><b>潜在推动</b> '+esc(item.driver)+'</p><p><b>风险</b> '+esc(item.risk)+'</p></div></article>'}).join(''):'')+'</div>').join('')+'</div>'};
const list = (items, kind) => {
  if (!Array.isArray(items) || !items.length) return '<p class="prelogic-empty">等待本时段核验</p>';
  return '<ol class="prelogic-list">' + items.slice(0,3).map((item,index) => {
    const title = esc(item.title);
    const link = Array.isArray(item.source_urls) && item.source_urls.find(url => /^https:\/\//.test(url));
    const heading = link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + title + '</a>' : title;
    return '<li class="prelogic-item"><span class="prelogic-rank">' + (index+1) + '</span><div><strong>' + heading + '</strong>' + (item.detail ? '<p>' + esc(item.detail) + '</p>' : '') + (item.test ? '<p class="prelogic-test">验证：' + esc(item.test) + '</p>' : '') + '</div></li>';
  }).join('') + '</ol>';
};
const openingVerification = row => {
  const resultLabels = {supported:'得到支持',invalidated:'被推翻',mixed:'部分验证',pending:'待验证'};
  const rounds = [['20m','开盘 +20 分钟'],['60m','开盘 +60 分钟']];
  const cards = rounds.map(([key,label]) => {
    const check = row?.opening_checks?.[key];
    const ready = Boolean(check?.dominant_logic && check?.observed_at && Number.isFinite(Date.parse(check.observed_at)));
    const head = '<div class="prelogic-opening-round"><h4>' + label + '</h4><span class="prelogic-opening-state">' + (ready ? '已核验' : '尚未核验') + '</span></div>';
    if (!ready) return '<article class="prelogic-opening-card is-pending">' + head + '<p class="prelogic-opening-pending">等待本轮开盘行情核验</p><p class="prelogic-opening-guide">一句主导逻辑 · 关键证据 · 盘前判断验证</p></article>';
    const evidence = Array.isArray(check.evidence) ? check.evidence : [];
    const verdicts = Array.isArray(check.verdicts) ? check.verdicts : [];
    const links = Array.isArray(check.source_urls) ? check.source_urls.filter(url => /^https:\/\//.test(url)) : [];
    return '<article class="prelogic-opening-card">' + head +
      '<p class="prelogic-opening-logic">' + esc(check.dominant_logic) + '</p>' +
      '<div class="prelogic-opening-time">观察截至 ' + displayTime(check.observed_at) + '</div>' +
      (evidence.length ? '<ul class="prelogic-opening-evidence">' + evidence.slice(0,3).map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>' : '') +
      (verdicts.length ? '<div class="prelogic-opening-verdicts">' + verdicts.map(item => {
        const status = Object.hasOwn(resultLabels,item.result) ? item.result : 'pending';
        return '<div class="prelogic-opening-verdict"><span class="prelogic-verdict-tag ' + status + '">' + resultLabels[status] + '</span><p><strong>' + esc(item.hypothesis) + '</strong>' + (item.reason ? '<span>' + esc(item.reason) + '</span>' : '') + '</p></div>';
      }).join('') + '</div>' : '') +
      (check.watch_next ? '<p class="prelogic-opening-watch"><b>下一观察点</b> ' + esc(check.watch_next) + '</p>' : '') +
      '<div class="prelogic-opening-footer"><span>更新 ' + displayTime(check.updated_at) + '</span>' + (links.length ? '<div>' + links.map((url,index) => '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">依据 ' + (index+1) + '</a>').join(' ') + '</div>' : '') + '</div></article>';
  }).join('');
  return '<section class="prelogic-opening" aria-labelledby="prelogic-opening-title"><div class="prelogic-opening-heading"><h3 id="prelogic-opening-title">开盘验证</h3><span>开盘后实际在交易什么逻辑</span></div><div class="prelogic-opening-grid">' + cards + '</div></section>';
};
const closingVerification = row => {
  const check = row?.closing_check;
  const ready = check?.session === 'regular_close' && Boolean(check?.dominant_logic && check?.observed_at && Number.isFinite(Date.parse(check.observed_at)));
  const head = '<div class="prelogic-opening-heading"><h3 id="prelogic-closing-title">收盘验证</h3><span>完整收盘后回看盘前与开盘判断</span></div>';
  if (!ready) return '<section class="prelogic-closing" aria-labelledby="prelogic-closing-title">' + head + '<div class="prelogic-closing-card is-pending"><span class="prelogic-opening-state">尚未核验</span><p class="prelogic-opening-pending">等待常规时段完整收盘</p></div></section>';
  const verdictLabels = {supported:'得到支持',invalidated:'被推翻',mixed:'部分验证',pending:'待验证'};
  const evidence = Array.isArray(check.evidence) ? check.evidence.slice(0,3) : [];
  const verdicts = Array.isArray(check.verdicts) ? check.verdicts.slice(0,3) : [];
  const links = Array.isArray(check.source_urls) ? check.source_urls.filter(url => /^https:\/\//.test(url)).slice(0,3) : [];
  const checks = verdicts.map(item => {
    const status = Object.hasOwn(verdictLabels,item.result) ? item.result : 'pending';
    return '<div class="prelogic-opening-verdict"><span class="prelogic-verdict-tag ' + status + '">' + verdictLabels[status] + '</span><p><strong>' + esc(item.hypothesis) + '</strong>' + (item.reason ? '<span>' + esc(item.reason) + '</span>' : '') + '</p></div>';
  }).join('');
  return '<section class="prelogic-closing" aria-labelledby="prelogic-closing-title">' + head + '<article class="prelogic-closing-card"><div class="prelogic-opening-round"><strong>收盘结论</strong><span class="prelogic-opening-state">已核验</span></div><p class="prelogic-opening-logic">' + esc(check.dominant_logic) + '</p><div class="prelogic-opening-time">常规收盘 ' + displayTime(check.observed_at) + '</div>' + (evidence.length ? '<ul class="prelogic-opening-evidence">' + evidence.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>' : '') + (checks ? '<div class="prelogic-opening-verdicts">' + checks + '</div>' : '') + (check.next_day_risk ? '<p class="prelogic-opening-watch"><b>下一交易日</b> ' + esc(check.next_day_risk) + '</p>' : '') + '<div class="prelogic-opening-footer"><span>更新 ' + displayTime(check.updated_at) + '</span><div>' + links.map((url,index) => '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">依据 ' + (index+1) + '</a>').join(' ') + '</div></div></article></section>';
};
export function renderPremarketSection(data, weekStart, activeWeek) {
  const days = data?.days || {};
  const dates = Object.keys(days).filter(date => date >= weekStart && date < new Date(Date.parse(weekStart+'T00:00:00Z')+7*86400000).toISOString().slice(0,10)).sort();
  const day = dates.at(-1);
  if (!day && weekStart !== activeWeek) return '';
  const row = day ? days[day] : null;
  const label = day ? day.slice(5).replace('-', '/') : '本周';
  return '<section class="prelogic" id="premarket-logic" aria-labelledby="prelogic-title"><div class="prelogic-heading"><div><span class="prelogic-eyebrow">MARKET OPEN / NASDAQ</span><h2 id="prelogic-title">盘前逻辑 <em class="prelogic-beta">BETA</em> <span>' + esc(label) + '</span></h2></div><div class="prelogic-updated">更新 ' + displayTime(row?.updated_at) + '</div></div>' + marketBar(row?.market_context) + '<div class="prelogic-columns"><div class="prelogic-panel prelogic-bull"><h3>多头逻辑</h3>' + list(row?.bull,'bull') + '</div><div class="prelogic-panel prelogic-bear"><h3>空头逻辑</h3>' + list(row?.bear,'bear') + '</div></div><div class="prelogic-risk"><h3>盘中风险点 <span>按优先级排序</span></h3>' + list(row?.risks,'risk') + '</div>' + openingVerification(row) + closingVerification(row) + timeline(row) + '</section>';
}
export const premarketCSS = `<style>
.prelogic{margin:22px 0 28px;padding:22px 26px;border:1px solid #dfe5eb;border-radius:16px;background:#fff;color:#1d2936;box-shadow:0 8px 25px #1d293608}
.prelogic-heading{display:flex;justify-content:space-between;align-items:end;gap:18px;margin-bottom:18px}
.prelogic-eyebrow{display:block;color:#98a6bb;font-size:10px;font-weight:700;letter-spacing:.15em;margin-bottom:5px}
.prelogic h2{font-size:22px;margin:0;line-height:1.3}.prelogic h2 span{font-size:13px;color:#91a0b4;font-weight:500}.prelogic-beta{display:inline-block;margin-left:5px;padding:2px 5px;border-radius:4px;background:#edf1f7;color:#8491a5;font-size:9px;font-style:normal;font-weight:700;letter-spacing:.08em;vertical-align:middle}
.prelogic-updated{color:#74849a;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
.prelogic-market{display:flex;gap:8px;overflow-x:auto;margin:0 0 16px;scrollbar-width:none}.prelogic-market::-webkit-scrollbar{display:none}.prelogic-quote{display:flex;align-items:baseline;gap:7px;flex:0 0 auto;padding:8px 11px;border:1px solid #e3e8ed;border-radius:10px;background:#f8fafc;font-variant-numeric:tabular-nums}.prelogic-quote b{font-size:11px}.prelogic-quote strong{font-size:13px}.prelogic-quote strong.negative{color:#24755d}.prelogic-quote strong.positive{color:#b85a61}.prelogic-quote small{font-size:10px;color:#94a1b1}.prelogic-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.prelogic-panel,.prelogic-risk{border-radius:12px;padding:17px 18px}
.prelogic-bull{background:#edf6f2}.prelogic-bear{background:#f8f0f1}.prelogic-risk{background:#f3f5fa;margin-top:12px}
.prelogic h3{font-size:14px;margin:0 0 12px;font-weight:700}.prelogic-bull h3{color:#24755d}.prelogic-bear h3{color:#aa5861}.prelogic-risk h3{color:#394966}.prelogic-risk h3 span{font-size:11px;color:#91a0b4;font-weight:500;margin-left:6px}
.prelogic-list{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.prelogic-item{display:grid;grid-template-columns:23px minmax(0,1fr);gap:9px;align-items:start}
.prelogic-rank{display:grid;place-items:center;width:21px;height:21px;border-radius:7px;background:#ffffffb8;color:#637187;font-size:11px;font-weight:700}
.prelogic-item strong{font-size:13px;line-height:1.5}.prelogic-item p{font-size:12px;line-height:1.65;color:#677589;margin:3px 0 0}.prelogic-item a{color:inherit;text-decoration:none;border-bottom:1px dotted #8391a2}
.prelogic-test{color:#344e6b!important}.prelogic-empty{font-size:12px;color:#91a0b4;margin:0}.prelogic-timeline{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:18px;padding-top:17px;border-top:1px solid #e5e9ef}.prelogic-timeline-group h3{color:#344e6b}.prelogic-timeline article{display:grid;grid-template-columns:86px minmax(0,1fr);gap:10px;padding:9px 0;border-top:1px solid #edf0f3}.prelogic-timeline time{font-size:11px;color:#8d9aae;font-variant-numeric:tabular-nums}.prelogic-timeline strong{font-size:12px}.prelogic-timeline a{color:inherit;text-decoration:none;border-bottom:1px dotted #8391a2}.prelogic-timeline p{font-size:11px;line-height:1.6;color:#68778b;margin:4px 0 0}.prelogic-timeline p b{color:#4c6177;font-weight:600}
@media(max-width:700px){.prelogic{margin:18px 0 24px;padding:17px 16px;border-radius:15px}.prelogic-heading{align-items:start;flex-direction:column;gap:5px;margin-bottom:13px}.prelogic h2{font-size:19px}.prelogic-columns{grid-template-columns:1fr;gap:9px}.prelogic-panel,.prelogic-risk{padding:14px 15px}.prelogic-item strong{font-size:13px}.prelogic-updated{font-size:11px}.prelogic-timeline{grid-template-columns:1fr;gap:12px}.prelogic-timeline article{grid-template-columns:72px minmax(0,1fr)}.prelogic-quote{padding:7px 9px}}
.prelogic-opening{margin-top:18px;padding-top:18px;border-top:1px solid #e5e9ef}.prelogic-opening-heading{display:flex;align-items:baseline;gap:10px;margin-bottom:12px}.prelogic-opening-heading h3{margin:0;color:#394966}.prelogic-opening-heading>span{font-size:11px;color:#91a0b4}.prelogic-opening-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.prelogic-opening-card{min-width:0;padding:17px 18px;border-radius:12px;background:#f3f6fa}.prelogic-opening-round{display:flex;align-items:center;justify-content:space-between;gap:12px}.prelogic-opening-round h4{font-size:13px;color:#3d536e;margin:0}.prelogic-opening-state{font-size:10px;color:#75879d;background:#e7edf5;padding:3px 7px;border-radius:5px;white-space:nowrap}.prelogic-opening-logic{font-size:14px;font-weight:700;color:#243b53;line-height:1.6;margin:12px 0 5px}.prelogic-opening-time{font-size:10px;color:#8797aa;font-variant-numeric:tabular-nums}.prelogic-opening-evidence{padding-left:17px;margin:12px 0;font-size:12px;line-height:1.65;color:#677589}.prelogic-opening-evidence li+li{margin-top:5px}.prelogic-opening-verdicts{display:grid;gap:9px;margin-top:12px}.prelogic-opening-verdict{display:flex;align-items:flex-start;gap:9px}.prelogic-verdict-tag{flex:0 0 auto;font-size:10px;line-height:1.5;padding:3px 6px;border-radius:5px;background:#e7edf5;color:#68798e}.prelogic-verdict-tag.supported{background:#e2f0e9;color:#33745c}.prelogic-verdict-tag.invalidated{background:#f4e4e7;color:#a35762}.prelogic-verdict-tag.mixed{background:#f4ecd9;color:#92723c}.prelogic-opening-verdict p{margin:1px 0 0;font-size:12px;line-height:1.6}.prelogic-opening-verdict strong{font-weight:600;color:#42576c}.prelogic-opening-verdict p>span{display:block;color:#718095;margin-top:2px}.prelogic-opening-watch{margin:14px 0 0;padding-top:11px;border-top:1px solid #e0e7ef;font-size:12px;line-height:1.65;color:#64768b}.prelogic-opening-watch b{font-weight:600;color:#3d536e}.prelogic-opening-footer{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:7px;margin-top:12px;font-size:10px;color:#91a0b4;font-variant-numeric:tabular-nums}.prelogic-opening-footer a{color:#7a8fa7;text-decoration:underline;text-underline-offset:3px;margin-left:5px}.prelogic-opening-pending{font-size:13px;color:#7a8ca1;margin:16px 0 5px}.prelogic-opening-guide{font-size:11px;line-height:1.6;color:#9aa7b8;margin:0}.prelogic-opening-card.is-pending{background:#f6f8fb}
@media(max-width:700px){.prelogic-opening-grid{grid-template-columns:1fr}.prelogic-opening-card{padding:14px 15px}.prelogic-opening-heading{flex-wrap:wrap;gap:5px 10px}}
.prelogic-closing{margin-top:18px;padding-top:18px;border-top:1px solid #e5e9ef}.prelogic-closing-card{padding:17px 18px;border-radius:12px;background:#eef4f7}.prelogic-closing-card.is-pending{background:#f6f8fb}.prelogic-closing-card .prelogic-opening-round>strong{font-size:13px;color:#3d536e}.prelogic-closing-card .prelogic-opening-evidence{margin-bottom:10px}
@media(max-width:700px){.prelogic-closing-card{padding:14px 15px}}
</style>`;

