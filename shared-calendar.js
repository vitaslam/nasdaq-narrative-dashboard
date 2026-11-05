'use strict';
(() => {
 const P=window.DashboardUI;
 const root=document.getElementById('calendar');if(!root)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const link=(u,t)=>/^https:\/\//.test(u||'')?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a>`:esc(t);
 const iso=d=>d.toISOString().slice(0,10),add=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return iso(d)},md=s=>s.slice(5).replace('-','/');
 const bjToday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const today=new Date(bjToday+'T12:00:00Z'),monday=add(bjToday,-((today.getUTCDay()+6)%7));
 // Each narrative page opens its own week in the shared event calendar.
 let selectedWeek;
 try{selectedWeek=JSON.parse(document.getElementById('live-week-data')?.textContent||'{}').start}catch{}
 const selected=typeof selectedWeek==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(selectedWeek)?selectedWeek:monday;
 const selectedDate=new Date(selected+'T12:00:00Z');
 let start=add(selected,-((selectedDate.getUTCDay()+6)%7)),seq=0,eventsById=new Map(),selectedCard=null;
 // Reviewed against the latest available market caps (2026-10-30); refresh as companies cross USD 500bn.
 const largeCapEarnings=/(?:Apple|苹果|AMD|ASML|Meta|Tesla|Alphabet|Google|Microsoft|Amazon|微软|亚马逊|特斯拉)/i;
 const isHigh=e=>P.calendarImportance(e).score===3||(/财报/.test(e.kind||'')&&largeCapEarnings.test(e.event||''));
 let changeMarkers={};
 const dots=key=>['GPT','Muse'].filter(agent=>(changeMarkers[agent]?.keys||[]).includes(key)).map(agent=>{
  const at=changeMarkers[agent].key_times?.[key]||changeMarkers[agent].at;
  const stamp=Number.isFinite(Date.parse(at))?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(at))+' 北京时间':'时间未记录';
  const label=agent+' 更新于 '+stamp+'；满 3 小时后在下一轮更新清理';
  return `<span class="update-dot" data-agent="${agent}" data-updated-at="${esc(at||'')}" title="${esc(label)}" aria-label="${esc(label)}"></span>`;
 }).join('');
 root.innerHTML=`<div class="section-head"><div><h2>事件日历</h2><p class="section-sub">所有周页面共用 · 所选叙事周起两周 · 北京时间，盘前／盘后另标</p></div><div class="calendar-navigation"><button type="button" data-calendar-nav="-14" aria-label="前两周">‹</button><span class="calendar-range" aria-live="polite"></span><button type="button" data-calendar-nav="14" aria-label="后两周">›</button><button type="button" data-calendar-today>回到本周</button></div></div><div class="review-calendar" id="events" aria-live="polite"></div><div class="note">事件落地后补充结果与市场反应；历史未录入日期留空。市值超过 5000 亿美元的公司财报高亮；其他事件以 3 星高亮。</div>`;
 function compactEarnings(e, released){
  const metrics=e.earnings_metrics||[];
  const revenue=metrics.find(m=>/^(?:总?营收|营业收入|总收入|(?:total )?revenue)(?:$|[（( ])/i.test(m.label));
  const eps=metrics.find(m=>/EPS|每股(?:收益|盈利)|earnings per share/i.test(m.label));
  const core=[revenue,eps].filter(Boolean);
  const rows=core.length?core:metrics.slice(0,2);
  const pending=released?'待核验':'待公布';
  let comparison;
  if(rows.length){
   comparison=`<table class="earnings-glance-table" aria-label="财报核心指标"><thead><tr><th scope="col">指标</th><th scope="col">市场预期</th><th scope="col">实际</th></tr></thead><tbody>${rows.map(m=>`<tr><th scope="row">${esc(m.label)}</th><td>${esc(m.expected||'待核验')}</td><td>${esc(m.actual||pending)}</td></tr>`).join('')}</tbody></table>`;
  }else{
   // Older events sometimes have only a sourced result in prose.
   const firstFact=e.result?.split(/[。；;]/,1)[0]?.trim();
   const actual=(released&&firstFact&&firstFact.length<=56)?firstFact:(released&&e.result?'已公布，见详情':pending);
   comparison=`<dl class="earnings-glance-fallback"><div><dt>市场预期</dt><dd>待核验</dd></div><div><dt>实际</dt><dd>${esc(actual)}</dd></div></dl>`;
  }
  const business=e.business_highlight||e.watch;
  return `<div class="earnings-glance">${comparison}${business?`<div class="earnings-glance-business"><b>业务看点</b> ${esc(business)}</div>`:''}</div>`;
 }
 function event(e){
  const released=['released','occurred'].includes(e.status);
  const earnings=/财报|earnings/i.test(e.kind||'');
  const kind=earnings?'earnings':/政策|选举/.test(e.kind)?'policy':'macro';
  const status=({released:'数据已公布',occurred:'已发生',cancelled:'已取消',postponed:'已延期'})[e.status]||'待发生';
  const title=earnings?`<span class="earnings-glance-emoji" aria-label="${released?'当季业绩表现':'财报状态'}">${esc(e.result_emoji||(released?'📊':e.status==='scheduled'?'⏳':'📅'))}</span> ${esc(e.event)} <span class="earnings-glance-open" aria-hidden="true">›</span>`:link(e.source,e.event);
  const body=earnings?compactEarnings(e,released):`<p>${P.emphasize(e.watch||'',e.emphasis||[])}</p>${e.result?`<p class="calendar-result"><b>${esc(e.result_emoji||'📊')} 结果</b> ${esc(e.result)}</p>`:''}${e.market_reaction?`<p class="calendar-reaction"><b>${esc(e.reaction_emoji||'📈')} ${esc(e.reaction_session||'当日市场')}</b> ${esc(e.market_reaction)}</p>`:e.status==='released'||e.status==='occurred'?'<p class="calendar-reaction">市场反应待收盘核验</p>':''}${e.result_source?`<div class="calendar-evidence">${link(e.result_source,'结果来源')}${e.reaction_source?' · '+link(e.reaction_source,'行情来源'):''}</div>`:''}`;
  return `<article class="calendar-event${isHigh(e)?' priority-high':''} ${kind}" data-calendar-event-id="${esc(e.id)}" role="button" tabindex="0" aria-expanded="false">${dots('calendar:'+e.id)}<div class="calendar-event-top"><span>${esc(e.kind||'事件')}</span><span class="calendar-status ${released?'done':''}">${status}</span></div>${P.stars(P.calendarImportance(e))}<h3>${title}</h3><div class="calendar-time">${esc(e.time||'时间待核验')}</div>${body}</article>`;
 }
 const detailRow=(label,value,pending=false)=>`<div class="calendar-detail-row"><b>${esc(label)}</b><p class="${pending?'is-pending':''}">${esc(value)}</p></div>`;
 function closeDetail(){root.querySelector('[data-calendar-detail]')?.remove();if(selectedCard){selectedCard.setAttribute('aria-expanded','false');selectedCard.classList.remove('is-selected');selectedCard=null}}
 function showDetail(card){
  const e=eventsById.get(card.dataset.calendarEventId);if(!e)return;
  if(selectedCard===card){closeDetail();return}closeDetail();
  const mobileDay=card.closest('.mobile-agenda-day'),grid=mobileDay||(card.closest('.calendar-week')||root.querySelector('.calendar-week'))?.querySelector('.calendar-grid');if(!grid)return;
  selectedCard=card;card.setAttribute('aria-expanded','true');card.classList.add('is-selected');
  const occurred=['released','occurred'].includes(e.status);
  const actual=e.result||(occurred?'结果待核验':'待公布');
  const reaction=e.market_reaction||(occurred?'当天市场反应待收盘行情核验':'待事件发生及当日市场收盘');
  const impact=e.narrative_impact||(occurred?'对叙事的影响待结合结果与行情核验':'待结果与市场反应确认后评估');
  const comparisons=(e.earnings_metrics||[]).length?`<div class="calendar-earnings-table" role="table" aria-label="财报预期与实际对照"><div class="earnings-row headings" role="row"><span>指标</span><span>预期</span><span>实际</span></div>${e.earnings_metrics.map(m=>`<div class="earnings-row" role="row"><span>${esc(m.label)}</span><span>${esc(m.expected)}</span><strong title="${esc(m.note||'')}">${esc(m.actual)}</strong></div>`).join('')}</div>`:'';
  const phases=(e.reaction_phases||[]).length?`<div class="reaction-phases">${e.reaction_phases.map(p=>`<div><b>${esc(p.session)}</b><span>${esc(p.value)}</span><small>${esc(p.at)} · ${link(p.source_url,'来源')}</small></div>`).join('')}</div>`:'';
  grid.insertAdjacentHTML('beforeend',`<aside class="calendar-detail" data-calendar-detail aria-label="${esc(e.event)}事件详情">${dots('calendar:'+e.id)}<div class="calendar-detail-head"><span>${esc(md(e.iso_date||card.closest('.calendar-day')?.dataset.date||''))} · ${esc(e.kind||'事件')} · ${esc(e.status==='occurred'||e.status==='released'?'已发生':'待发生')}</span><button type="button" data-calendar-close aria-label="关闭事件详情">×</button></div><h3>${esc(e.event)}</h3><p class="calendar-detail-time">${esc(e.time||'时间待核验')}</p><div class="calendar-detail-body">${detailRow('预期／关注',e.expectation||e.watch||'待补充',!(e.expectation||e.watch))}${comparisons}${detailRow((e.result_emoji||'📊')+' 实际结果',actual,!e.result)}${e.guidance?detailRow('下季指引',e.guidance):''}${detailRow((e.reaction_emoji||'📈')+' 分时段市场反应',reaction,!e.market_reaction)}${phases}${detailRow('对叙事的影响',impact,!e.narrative_impact)}</div><div class="calendar-detail-links">${link(e.source,'事件来源')}${e.consensus_source?' · '+link(e.consensus_source,'预期来源'):''}${e.result_source?' · '+link(e.result_source,'结果来源'):''}${e.guidance_source?' · '+link(e.guidance_source,'指引来源'):''}${e.reaction_source?' · '+link(e.reaction_source,'行情来源'):''}</div></aside>`);
  if(mobileDay){const detail=grid.querySelector('[data-calendar-detail]');card.after(detail)}
 }
 const agendaEvent=e=>{const earnings=/财报|earnings/i.test(e.kind||''),kind=earnings?'earnings':/政策|选举/.test(e.kind||'')?'policy':'macro';const status=({released:'已公布',occurred:'已发生',cancelled:'已取消',postponed:'已延期'})[e.status]||'待发生';return `<article class="mobile-agenda-event ${kind}${isHigh(e)?' is-important':''}" data-calendar-event-id="${esc(e.id)}" role="button" tabindex="0" aria-expanded="false" aria-label="${esc(e.event+'，'+(e.time||'时间待定')+'，'+status)}">${dots('calendar:'+e.id)}<div class="mobile-agenda-copy"><h3>${esc(e.event)}</h3><p>${esc(e.kind||'事件')} · ${status}${isHigh(e)?' · 重点':''}</p></div><time>${esc((e.time||'时间待定').replace(/北京(?:时间)?/g,''))}</time><span class="mobile-agenda-chevron" aria-hidden="true">›</span></article>`};
 function agenda(data){let out='<div class="mobile-calendar-agenda" aria-label="按日期排列的事件日程">';let days=0;for(let n=0;n<14;n++){const date=add(start,n),items=data.events.filter(e=>e.iso_date===date);if(!items.length&&date!==bjToday)continue;days++;const day=new Date(date+'T12:00:00Z'),label=Number(date.slice(5,7))+'月'+Number(date.slice(8,10))+'日 · 星期'+['日','一','二','三','四','五','六'][day.getUTCDay()];out+=`<section class="mobile-agenda-day${date===bjToday?' is-today':''}${date<bjToday?' is-past':''}" data-date="${date}"><header><h3><time datetime="${date}">${label}</time></h3>${date===bjToday?'<span>今天</span>':''}</header>${items.map(agendaEvent).join('')||'<p class="mobile-agenda-empty">今天暂无已录入事件</p>'}</section>`}if(!days)out+='<p class="mobile-agenda-empty">这两周暂无已录入事件</p>';if(data.ongoing?.length)out+=`<section class="mobile-agenda-day ongoing"><header><h3>持续观察</h3></header>${data.ongoing.map(agendaEvent).join('')}</section>`;return out+'</div>'}
 async function render(){const token=++seq,end=add(start,13);closeDetail();root.querySelector('.calendar-range').textContent=start.slice(0,4)+' · '+md(start)+' — '+md(end);root.querySelector('#events').setAttribute('aria-busy','true');let data;
 try{const r=await fetch(`../api/calendar.json`,{cache:'no-store'});if(!r.ok)throw Error();data=await r.json();}catch{if(token!==seq)return;root.querySelector('#events').innerHTML='<p class="calendar-empty">日历暂时无法读取，请稍后重试。</p>';return}if(token!==seq)return;changeMarkers=data.change_markers||{};
 eventsById=new Map([...data.events,...(data.ongoing||[])].map(e=>[String(e.id),e]));
 let out='';for(let w=0;w<2;w++){out+=`<section class="calendar-week"><div class="calendar-week-title"><b>第${w?'二':'一'}周</b><span>${md(add(start,w*7))} — ${md(add(start,w*7+6))}</span></div><div class="calendar-grid">`;for(let n=0;n<7;n++){const date=add(start,w*7+n),items=data.events.filter(e=>e.iso_date===date);out+=`<div class="calendar-day ${n>4?'weekend':''} ${date===bjToday?'is-today':''}" data-date="${date}"><header><time datetime="${date}">${md(date)}</time><span>${date===bjToday?'今天':(['周一','周二','周三','周四','周五','周六','周日'][n])}</span></header>${items.map(event).join('')||'<p class="calendar-empty">暂未录入事件</p>'}</div>`}out+='</div></section>'}if(data.ongoing?.length)out+='<div class="calendar-ongoing"><b>持续观察</b><div>'+data.ongoing.map(event).join('')+'</div></div>';root.querySelector('#events').innerHTML=out+agenda(data);root.querySelector('#events').removeAttribute('aria-busy');}
 root.addEventListener('click',ev=>{if(ev.target.closest('[data-calendar-close]')){closeDetail();return}const card=ev.target.closest('[data-calendar-event-id]');if(card&&!ev.target.closest('a'))showDetail(card)});
 root.addEventListener('keydown',ev=>{if(ev.key==='Escape'){closeDetail();return}const card=ev.target.closest('[data-calendar-event-id]');if(card&&ev.target===card&&['Enter',' '].includes(ev.key)){ev.preventDefault();showDetail(card)}});
 root.querySelectorAll('[data-calendar-nav]').forEach(b=>b.addEventListener('click',()=>{start=add(start,Number(b.dataset.calendarNav));render()}));matchMedia('(max-width:600px)').addEventListener('change',closeDetail);root.querySelector('[data-calendar-today]').addEventListener('click',()=>{start=monday;render()});render();
})();
