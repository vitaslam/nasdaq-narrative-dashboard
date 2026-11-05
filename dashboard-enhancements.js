'use strict';
(() => {
  const q=s=>document.querySelector(s),read=id=>JSON.parse(document.getElementById(id)?.textContent||'{}');
  const S=read('report-data'),W=read('live-week-data'),E=read('display-support');
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cutoff=S.price_cutoff,from=new Date(cutoff+'T12:00:00Z');from.setUTCMonth(from.getUTCMonth()-2);
  const lower=from.toISOString().slice(0,10),num=(v,d=2)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const metrics=q('.market-overview');if(!metrics)return;
  q('[data-metric="spx-ma"]')?.remove();
  const M=document.getElementById('mood-week-context')?read('mood-week-context'):W;
  const currentWeek=M.status==='active';
  const P=window.DashboardUI,mood=M.market_mood,current=mood?.current||mood?.anchor;
  const moodTone=label=>/悲观|卖压|转弱|恐慌/.test(label||'')?'negative':/修复|偏多|乐观/.test(label||'')?'positive':'neutral';
  const currentDay=current?.date||current?.asof?.slice(0,10)||M.start;
  const baseline=(current?.baseline_date&&Object.values(mood?.baselines||{}).find(b=>b.date===current.baseline_date))||mood?.baselines?.[currentDay===M.start?'previous_close':'week_open']||mood?.baselines?.previous_close;
  const baselineDate=baseline?.date,baselineLabel=baseline?.label;
  const tile=document.createElement('div');tile.className='metric sentiment-tile mood-tone-'+moodTone(current?.label);tile.dataset.metric='market-mood';
  const sourceDate=baselineDate?baselineDate.slice(5).replace('-','/'):'';
  const baselineDay=baselineDate?['周日','周一','周二','周三','周四','周五','周六'][new Date(baselineDate+'T12:00:00Z').getUTCDay()]:'';
  tile.innerHTML=`<div class="key">市场情绪 · ${M.historical_review?'当周历史回溯':baselineDate&&baselineDate<M.start?'以上周收盘为基准':baselineDate?'以本周初为基准':'情绪变化'}</div><div class="sentiment-title"><span class="sentiment-emoji" role="img" aria-label="${escape(current?.label||'归档')}">${escape(current?.emoji||'📌')}</span><strong>${escape(current?.label||'归档未记录')}</strong></div><p class="sentiment-anchor">${baseline?`${escape(baselineDay)} ${escape(sourceDate)} · ${escape(baselineLabel)} <span aria-hidden="true">→</span> <b>${currentDay===M.start?'周一':escape(currentDay?.slice(5).replace('-','/'))} ${escape(current?.label)}</b>`:M.historical_review?'周收盘状态 · 依据同期证据回溯判断':'此历史周未建立情绪比较基准'}</p><p class="sentiment-reason">${P.emphasize(current?.reason||'保留原周结论；情绪跟踪从 11/02 这一周开始。',current?.emphasis||[])}</p>${mood?.conclusion?`<p class="sentiment-conclusion"><b>周五结论</b> ${escape(mood.conclusion.label)} · ${P.emphasize(mood.conclusion.reason,mood.conclusion.emphasis||[])}</p>`:''}`;
  metrics.prepend(tile);
  const previousMonday=M.start&&new Date(Date.parse(M.start+'T12:00:00Z')-7*86400000).toISOString().slice(0,10);
  const pastDays=(M.recent_moods||[]).filter(row=>row.week_start===M.start||(currentWeek&&row.week_start===previousMonday));
  if(pastDays.length){
    const panel=document.createElement('aside');panel.id='mood-week-history';panel.className='mood-week-history';panel.hidden=true;
    const scope=currentWeek?'本周与上周':'所选周';
    panel.setAttribute('aria-label',scope+'交易日情绪和 QQQ 收盘');
    const dayName=date=>['周日','周一','周二','周三','周四','周五','周六'][new Date(date+'T12:00:00Z').getUTCDay()];
    const entries=pastDays.map((row,i)=>{
      const weekStart=row.week_start,range=row.date.slice(5).replace('-','/')+' '+dayName(row.date);
      const close=Number.isFinite(row.qqq_close)?num(row.qqq_close):'—';
      const date=row.date.slice(5).replace('-','/');
      const label=row.label||'未单独记录情绪';
      const targetWeek=row.week_id||weekStart;
      const href=location.pathname.includes('/weeks/')?'../index.html#week='+targetWeek:'/week/'+targetWeek;
      const boundary=currentWeek&&weekStart===previousMonday&&pastDays[i-1]?.week_start!==previousMonday?'<li class="mood-week-boundary">上周交易日</li>':'';
      const change=Number.isFinite(row.pct)?`${row.pct>=0?'+':''}${row.pct.toFixed(2)}%`:'—';
      const cause=row.attribution;
      const why=cause?`<div class="mood-day-driver"><small>${cause.kind==='event'?'事件归因':'量化归因'}</small><b>${escape(cause.driver)}</b></div>`:'';
      const urls=[...new Set(cause?.source_urls||[])].filter(u=>/^https:\/\//.test(u));
      const sources=urls.length?`<div class="mood-day-sources">${urls.map((u,n)=>`<a href="${escape(u)}" target="_blank" rel="noopener">${n?'补充依据':'依据'} ↗</a>`).join('')}</div>`:'';
      const vol=Number.isFinite(row.vix_close)?'VIX '+num(row.vix_close)+' · ':'';
      return `${boundary}<li class="mood-tone-${moodTone(label)}"><a href="${href}" data-week-start="${escape(targetWeek)}"><div class="mood-week-top"><time datetime="${escape(row.date)}">${escape(range)}</time><span>${vol}${row.kind==='recorded'?'当日记录':'收盘回溯'}</span></div><div class="mood-week-main"><span class="mood-week-emoji" role="img" aria-label="${escape(label)}">${escape(row.emoji||'📝')}</span><strong>${escape(label)}</strong></div>${why}${row.reason?`<p>${escape(row.reason)}</p>`:''}<div class="mood-week-close"><span>QQQ · ${escape(date)} 收盘</span><b>${close} <small>${change}</small></b></div></a>${sources}</li>`;
    });
    panel.innerHTML=`<div class="mood-week-heading"><button class="mood-mobile-close" type="button" aria-label="返回页面"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="m17 6-8 8 8 8"/></svg></button><strong id="mood-history-title">交易日情绪</strong><span>${currentWeek?'本周与上周':M.start.slice(5).replace('-','/')+'–'+M.end.slice(5).replace('-','/')}</span></div><ol>${entries.join('')}</ol><p class="mood-week-foot">标为「收盘回溯」的日期依据同期收盘与已知事件整理。</p>`;
    const list=panel.querySelector('ol');
    const cards=[...list.querySelectorAll('li:not(.mood-week-boundary)')];
    const lastVisible=cards[Math.min(5,cards.length)-1];
    const panelMargin=()=>document.documentElement.clientWidth<480?4:10;
    function fitFive(){
      panel.style.setProperty('--mood-tile-width',tile.getBoundingClientRect().width+'px');
      list.style.maxHeight='none';
      if(matchMedia('(max-width:600px)').matches)return;
      // Week labels take space in the list but do not count as trading days.
      const height=lastVisible.getBoundingClientRect().bottom-list.getBoundingClientRect().top+list.scrollTop;
      list.style.maxHeight=Math.ceil(height)+'px';
    }
    document.body.append(panel);
    tile.tabIndex=0;tile.setAttribute('aria-haspopup','true');tile.setAttribute('aria-controls',panel.id);tile.setAttribute('aria-expanded','false');
    tile.setAttribute('aria-label','市场情绪，点击查看'+scope+'交易日情绪和 QQQ 收盘');
    const moodMobile=matchMedia('(max-width:600px)');
    let shellDoc=document;try{if(parent!==window&&parent.location.origin===location.origin)shellDoc=parent.document}catch{}
    const back=panel.querySelector('.mood-mobile-close');
    let lastPointer,returnY=0,mainWasInert=false,mobileMode=false;
    function setMoodMode(open){
      const active=open&&moodMobile.matches,main=q('main');
      if(active&&!mobileMode){returnY=window.scrollY;mainWasInert=main?.inert||false;if(main)main.inert=true}
      if(!active&&mobileMode&&main)main.inert=mainWasInert;
      mobileMode=active;
      document.documentElement.classList.toggle('mood-history-open',active);
      shellDoc.documentElement.classList.toggle('mood-history-open',active);
      panel.setAttribute('role',active?'dialog':'region');
      panel.setAttribute('aria-labelledby','mood-history-title');
      if(active)panel.setAttribute('aria-modal','true');else panel.removeAttribute('aria-modal');
    }
    function place(){
      if(moodMobile.matches)return;
      const rect=tile.getBoundingClientRect();
      const cursor=lastPointer||{x:rect.left+Math.min(rect.width/2,150),y:rect.top+Math.min(rect.height/2,110)};
      const gap=16,margin=panelMargin();
      const width=panel.offsetWidth;
      let left;
      if(rect.left>=width+margin)left=Math.max(margin,rect.left-width-gap);
      else if(cursor.x+gap+width<=innerWidth-margin)left=cursor.x+gap;
      else if(cursor.x-width-gap>=margin)left=cursor.x-width-gap;
      else left=Math.max(margin,Math.min(innerWidth-margin-width,cursor.x-width/2));
      panel.style.left=Math.round(left)+'px';
      panel.style.top=Math.round(Math.max(margin,Math.min(innerHeight-panel.offsetHeight-margin,cursor.y-90)))+'px';
    }
    function show(){panel.hidden=false;list.scrollTop=0;tile.setAttribute('aria-expanded','true');setMoodMode(true);fitFive();place();if(mobileMode){back.focus({preventScroll:true});if(!matchMedia('(prefers-reduced-motion:reduce)').matches)panel.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'})}}
    function hide(){if(panel.hidden)return;const wasMobile=mobileMode;panel.hidden=true;setMoodMode(false);tile.setAttribute('aria-expanded','false');if(wasMobile){window.scrollTo({top:returnY,behavior:'instant'});tile.focus({preventScroll:true})}}
    panel.addEventListener('keydown',event=>{if(!mobileMode||event.key!=='Tab')return;const focusable=[...panel.querySelectorAll('button,a[href]')].filter(node=>node.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}});
    moodMobile.addEventListener('change',()=>{if(!panel.hidden){setMoodMode(true);fitFive();place()}});
    window.addEventListener('pagehide',()=>setMoodMode(false));
    panel.querySelector('.mood-mobile-close').addEventListener('click',hide);
    tile.addEventListener('click',e=>{lastPointer=Number.isFinite(e.clientX)&&e.clientX?{x:e.clientX,y:e.clientY}:null;panel.hidden?show():hide()});
    tile.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();lastPointer=null;panel.hidden?show():hide()}});
    panel.addEventListener('click',e=>{const link=e.target.closest('a[data-week-start]');if(!link||parent===window)return;e.preventDefault();parent.postMessage({type:'nasdaq:select-week',date:link.dataset.weekStart},location.origin);hide()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
    document.addEventListener('pointerdown',e=>{if(!tile.contains(e.target)&&!panel.contains(e.target))hide()});
    const refit=()=>{if(!panel.hidden){fitFive();place()}};
    window.addEventListener('scroll',()=>{if(!panel.hidden)place()},{passive:true});window.addEventListener('resize',refit);
    document.fonts?.ready.then(refit);
  }
  // Owner-scoped, per-item clocks are pruned only by subsequent content updates.
  const markerMap=W.change_markers||{};
  const targetsFor=key=>{
    if(key==='mood')return [tile];
    if(key==='price-chart')return [document.getElementById('price-chart')?.closest('.card')];
    if(key==='events')return [q('#toggle-event-drivers'),...document.querySelectorAll('#event-drivers .live-event-card')];
    if(key==='strategy')return [q('.dashboard-chart-heading')];
    if(key.startsWith('dimension:'))return [document.getElementById('toggle-'+key.slice(10)),...document.querySelectorAll('#'+key.slice(10)+' .live-dimension-detail')];
    const fields=[['question:','questionId','[data-question-id]'],['answer:','recordId','[data-record-id]'],['x-author:','author','.x-author-card[data-author]'],['x:','postId','[data-post-id]'],['trend:','trendId','[data-trend-id]']];
    for(const [prefix,field,selector]of fields)if(key.startsWith(prefix))return [...document.querySelectorAll(selector)].filter(n=>n.dataset[field]===key.slice(prefix.length));
    if(key==='metric:FedHike')return [q('#toggle-macro')];
    const metrics={NDX:['ndx'],QQQ:['ndx','ndx-ma'],SPX:['spx'],VIX:['vix'],VXN:['vix'],VXFutures:['vix'],CNN:['fear-greed'],BofA:['bofa'],CTA:['spx'],UST10Y:['cta'],UST30Y:['cta'],Brent:['cta']}[key.slice(7)];
    return key.startsWith('metric:')&&metrics?metrics.map(metric=>q(`[data-metric="${metric}"]`)):[];
  };
  for(const agent of ['GPT','Muse']){
    const group=markerMap[agent],nodes=new Map();
    for(const key of group?.keys||[]){
      if(agent==='GPT'&&key.startsWith('trend:'))continue;
      const at=group.key_times?.[key]||group.at;
      for(const node of targetsFor(key))if(node&&(!nodes.has(node)||Date.parse(at)>Date.parse(nodes.get(node))))nodes.set(node,at);
    }
    for(const [node,at]of nodes){
      const stamp=Number.isFinite(Date.parse(at))?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(at))+' 北京时间':'时间未记录';
      const label=agent+' 更新于 '+stamp+'；满 3 小时后在下一轮更新清理';
      node.classList.add('has-update-dot');
      node.insertAdjacentHTML('beforeend',`<span class="update-dot" data-agent="${agent}" data-updated-at="${escape(at||'')}" title="${escape(label)}" aria-label="${escape(label)}"></span>`);
    }
  }
  tile.querySelector('.sentiment-emoji').style.fontSize=getComputedStyle(q('h1')).fontSize;
  for(const [id,key,max] of [['fear-greed','CNN',100],['bofa','BofA',10]]){
    const host=q(`[data-metric="${id}"]`),value=S.sentiment?.[key]?.value;
    if(!host||!Number.isFinite(value))continue;
    host.querySelector('.metric-primary-row .value').outerHTML=`<div class="score-display"><div class="score-readout"><strong>${num(value,key==='CNN'?0:1)}</strong><span>/ ${max}</span></div><div class="score-meter" role="meter" aria-label="${escape(host.querySelector('.key').textContent)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><span style="width:${Math.max(0,Math.min(100,value/max*100))}%"></span></div></div>`;
  }
  for(const [group,selector,attribute]of [['metrics','[data-metric]','metric'],['dimensions','[data-dimension]','dimension']]){
    document.querySelectorAll(selector).forEach(el=>{const id=el.dataset[attribute],r=P.lookup(W,group,id);if(!r)return;el.classList.toggle('priority-high',r.score===3);el.dataset.importance=r.score;const target=el.querySelector(group==='metrics'?'.key':'.pulse-top');if(target&&group!=='metrics')target.insertAdjacentHTML('afterend',P.stars(r));});
  }
  const legend=document.createElement('p');legend.className='importance-legend';legend.textContent='重要性（分析估计）：最高 3 星 · 支持半星 · 3 星彩色反相强调 · 悬停星级查看判断依据';q('.pulse-grid')?.after(legend);
  const tooltip=document.createElement('div');tooltip.className='sparkline-tooltip';tooltip.hidden=true;tooltip.setAttribute('role','tooltip');tooltip.id='sparkline-tooltip';document.body.append(tooltip);
  let activeHide=()=>{};
  window.addEventListener('scroll',()=>activeHide(),{passive:true,capture:true});window.addEventListener('resize',()=>activeHide());
  function draw(id,items,digits=2,unit='',label='日频',overlays=[]){
    const host=q(`[data-metric="${id}"]`);if(!host)return;
    const data=[...new Map(items.filter(p=>p&&p.date>=lower&&p.date<=cutoff&&Number.isFinite(p.value)).map(p=>[p.date,p])).values()].sort((a,b)=>a.date.localeCompare(b.date));
    const chart=document.createElement('div');chart.className='sparkline';chart.dataset.points=data.length;chart.dataset.from=lower;chart.dataset.to=cutoff;
    chart.setAttribute('aria-label',host.querySelector('.key').textContent+'，过去两个月走势；悬停或用左右键查看日期与读数');
    host.classList.add('has-spark');host.append(chart);
    if(!data.length||id==='cta'&&data.length<2){chart.classList.add('sparkline-empty');chart.textContent=data.length?'仅 1 期已核验读数':'暂无可核验历史';return}
    chart.tabIndex=0;chart.setAttribute('aria-describedby','sparkline-tooltip');
    const width=180,height=62,pad=5,plotBottom=label==='日频'&&!overlays.length?57:45;
    const times=data.map(p=>Date.parse(p.date+'T12:00:00Z')),first=Date.parse(lower+'T12:00:00Z'),last=Date.parse(cutoff+'T12:00:00Z');
    const color=data.at(-1).value>data[0].value?'#b35365':data.at(-1).value<data[0].value?'#3a8978':'#7588ae';
    const series=[{key:'value',name:overlays.length?'QQQ':'读数',color},...overlays];
    const vals=data.flatMap(p=>series.map(s=>p[s.key]).filter(Number.isFinite)),lo=Math.min(...vals),hi=Math.max(...vals),span=hi-lo||Math.max(1,Math.abs(lo)*.02);
    const x=i=>pad+(times[i]-first)/(last-first||1)*(width-2*pad),y=value=>plotBottom-(value-lo+(hi===lo?span/2:0))/span*(plotBottom-pad);
    chart.innerHTML=`<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${series.map(s=>`<polyline data-series="${s.key}" points="${data.map((p,i)=>Number.isFinite(p[s.key])?x(i).toFixed(2)+','+y(p[s.key]).toFixed(2):'').filter(Boolean).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.key==='value'?2.3:1.6}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}<line class="spark-reference" y1="3" y2="${plotBottom+3}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" visibility="hidden"/>${series.map(s=>`<circle class="spark-hover-point" data-series="${s.key}" r="3.3" fill="${s.color}" stroke="white" stroke-width="1.4" visibility="hidden"/>`).join('')}</svg>${overlays.length?'<div class="sparkline-mini-legend"><span class="close">QQQ</span><span class="ma50">50日</span><span class="ma200">200日</span></div>':''}`;
    let active=data.length-1;
    function show(i){activeHide();activeHide=hide;active=i;const p=data[i],reference=chart.querySelector('.spark-reference');reference.setAttribute('x1',x(i));reference.setAttribute('x2',x(i));reference.setAttribute('visibility','visible');
      chart.querySelectorAll('.spark-hover-point').forEach(dot=>{const v=p[dot.dataset.series];if(Number.isFinite(v)){dot.setAttribute('cx',x(i));dot.setAttribute('cy',y(v));dot.setAttribute('visibility','visible')}});
      const note=[label!=='日频'?label:'',p.observation_date?'观测截至 '+p.observation_date:''].filter(Boolean).join(' · ');
      tooltip.innerHTML=`<time>${escape(p.date)}</time>${series.map(s=>`<div class="sparkline-tooltip-row">${overlays.length?`<span>${s.name}</span>`:''}<b>${Number.isFinite(p[s.key])?num(p[s.key],digits)+unit:'—'}</b></div>`).join('')}${note?`<small>${escape(note)}</small>`:''}`;tooltip.hidden=false;
      // Always below the plot: never cover the series or flip back over it.
      const r=chart.getBoundingClientRect(),atX=r.left+r.width*x(i)/width;
      tooltip.style.left=Math.max(8,Math.min(innerWidth-tooltip.offsetWidth-8,atX-tooltip.offsetWidth/2))+'px';tooltip.style.top=(r.bottom+10)+'px';
      tooltip.dataset.date=p.date;chart.dataset.activeDate=p.date;
    }
    function hide(){tooltip.hidden=true;chart.querySelector('.spark-reference').setAttribute('visibility','hidden');chart.querySelectorAll('.spark-hover-point').forEach(dot=>dot.setAttribute('visibility','hidden'))}
    function pointer(e){const r=chart.getBoundingClientRect(),target=(e.clientX-r.left)/r.width*width;let i=0;for(let n=1;n<data.length;n++)if(Math.abs(x(n)-target)<Math.abs(x(i)-target))i=n;show(i)}
    chart.addEventListener('pointermove',pointer);chart.addEventListener('pointerdown',pointer);chart.addEventListener('pointerleave',hide);chart.addEventListener('blur',hide);chart.addEventListener('focus',()=>show(active));
    chart.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();show(e.key==='Home'?0:e.key==='End'?data.length-1:Math.max(0,Math.min(data.length-1,active+(e.key==='ArrowLeft'?-1:1))))}else if(e.key==='Escape')hide()});
  }
  const bars=(key)=>(S.bars?.[key]||E.bars?.[key]||[]).filter(x=>x.date<=cutoff);
  for(const [id,key]of [['ndx','QQQ'],['spx','SPX']])draw(id,bars(key).map(p=>({date:p.date,value:p.c})));
  const prices=bars('QQQ');let sum50=0,sum200=0;
  const averages=prices.map((p,i)=>{sum50+=p.c;sum200+=p.c;if(i>=50)sum50-=prices[i-50].c;if(i>=200)sum200-=prices[i-200].c;return {date:p.date,value:p.c,ma50:i>=49?sum50/50:null,ma200:i>=199?sum200/200:null}});
  draw('ndx-ma',averages,2,'','日频',[{key:'ma50',name:'50 日均线',color:'#8598cb'},{key:'ma200',name:'200 日均线',color:'#c79e46'}]);
  const volatility=S.volatility||{},vix=(volatility.dates||[]).map((date,i)=>({date,value:volatility.vix[i]}));
  const merged=key=>[...(E.indicator_history?.[key]||[]),...(S.indicator_history?.[key]||[])].filter(p=>p.date<=cutoff);
  draw('vix',[...vix,...merged('VIX')]);
  draw('fear-greed',merged('CNN'),0,'','日频读数');draw('bofa',merged('BofA'),1,'','周频报告');if(!q('[data-metric="cta"]')?.classList.contains('risk-tile'))draw('cta',merged('CTA').filter(p=>p.model===S.sentiment?.CTA?.model&&p.institution===S.sentiment?.CTA?.institution),S.sentiment?.CTA?.digits??0,S.sentiment?.CTA?.unit||'','模型观测');
  const sources=q('.source-content');if(sources){const p=document.createElement('p');p.className='fineprint';p.innerHTML='小折线：指数与 VIX 使用已保存的日频行情；CNN 使用已核验的日频读数及早期留存归档，BofA 为报告发布日读数；缺失日期不补造。CTA 缺少可核验序列时留空。';sources.append(p);
    const links=[...new Set(['CNN','BofA'].flatMap(k=>merged(k).map(p=>p.source_url)).filter(Boolean))];const list=document.createElement('div');list.className='scan-source-list';links.forEach((url,i)=>{if(!/^https:\/\//.test(url))return;const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent='情绪历史来源 '+(i+1)+' ↗';list.append(a)});sources.append(list);
  }
  const compactBody=q('.week-live-banner .compact-info-body');
  if(compactBody)for(const el of document.querySelectorAll('.importance-legend,.direction-legend,.pulse-heading > .pulse-caption'))compactBody.append(el);
  const moodKey=q('.sentiment-title')?.previousElementSibling;if(moodKey)moodKey.textContent='市场情绪';
  const moodReason=q('.sentiment-reason');if(moodReason)moodReason.innerHTML=moodReason.innerHTML.replace(/^相对周一悲观基准[，,；;]\s*/,'');
  const pulseCaption=q('.pulse-heading > span > .pulse-caption');if(pulseCaption)pulseCaption.remove();
  // Keep only a short observation timestamp in the mobile reading surface.
  const mobileStamp=text=>{const date=String(text||'').match(/\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?|\d{2}\/\d{2}(?:\s+\d{2}:\d{2})?/),session=String(text||'').match(/夜盘|盘前|盘中|盘后|收盘/);return date?[date[0].replace(/^\d{4}-(\d{2})-(\d{2})/,'$1/$2'),session?.[0]].filter(Boolean).join(' · '):''};
  for(const el of document.querySelectorAll('.compact-info,.fed-hike-reading small')){if(el.closest('.week-live-banner'))continue;const text=mobileStamp(el.querySelector('summary')?.textContent)||mobileStamp(el.textContent);if(text){const stamp=document.createElement('span');stamp.className='mobile-info-stamp';stamp.textContent=text;el.before(stamp)}}
  for(const a of document.querySelectorAll('a'))if(/^(?:(?:补充|原始|事件|结果|行情|报告|预期|指引|数据|核验)来源|来源(?: \d+)?|补充依据|依据)(?:\s*↗)?$/.test(a.textContent.trim())){a.classList.add('mobile-source-only');if(a.parentElement.children.length&&[...a.parentElement.childNodes].every(n=>n.nodeType===3?/^[\s·|／/]*$/.test(n.textContent):n.matches?.('a.mobile-source-only')))a.parentElement.classList.add('mobile-source-only')}
  // Mobile-only shortcuts, scoped to the weekly document so iframe scrolling stays local.
  const navSvg=body=>`<svg viewBox="0 0 28 28" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="square" stroke-linejoin="round">${body}</svg>`;
  const navIcons={
    overview:navSvg('<path d="M11 4H7a3 3 0 0 0-3 3v17l6-5h11a3 3 0 0 0 3-3v-4"/><path d="m9 14 4-4 4 3"/><path d="m21 2 1.5 3.5L26 7l-3.5 1.5L21 12l-1.5-3.5L16 7l3.5-1.5Z" stroke-width="2"/>'),
    dimensions:navSvg('<path d="m14 3 5 5-5 5-5-5Z M8 10l5 5-5 5-5-5Z M20 10l5 5-5 5-5-5Z M14 17l5 5-5 5-5-5Z" stroke-width="2.2"/>'),
    verification:navSvg('<path d="M13 4H7a3 3 0 0 0-3 3v17l6-5h11a3 3 0 0 0 3-3v-4"/><path d="m9 11 3 3 5-6"/><path d="m23 2 3 3-3 3-3-3Z" fill="currentColor" stroke="none"/>'),
    levels:navSvg('<path d="M4 4v17a3 3 0 0 0 3 3h17 M9 17l5-5 4 3 6-9 M19 6h5v5"/>'),
    calendar:navSvg('<rect x="4" y="6" width="20" height="18" rx="3"/><path d="M4 12h20 M9 3v6 M19 3v6"/><path d="m17 15 3 3-3 3-3-3Z" fill="currentColor" stroke="none"/>'),
    x:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>'
  };
  document.querySelectorAll('main .topbar,main header#overview').forEach(node=>node.remove());
  const sectionSpecs=[
    ['overview','市场概览',['.week-live-banner','.topbar','#overview','.hero','.market-overview'],'overview'],
    ['dimensions','五维状态',['.pulse-heading','.pulse-grid','#dimension-details'],'dimensions'],
    ['verification','叙事验证',['#verification'],'verification'],
    ['levels','操作点位',['.dashboard-chart-heading','.daily-trigger-row','.review-market'],'levels'],
    ['x-hot','X 高热',['#narrative'],'x'],
    ['x-frequent','X 高频',['.x-frequent-section'],'x'],
    ['calendar','事件日历',['#calendar'],'calendar']
  ];
  const main=q('main'),sectionRoot=document.createElement('div');sectionRoot.className='managed-sections';
  const sectionNodes=sectionSpecs.map(([key,label,selectors,icon])=>({key,label,nodes:selectors.map(q).filter(Boolean),icon}));
  const allShortcuts=sectionNodes.map(({key,label,nodes,icon})=>{if(!nodes.length)return null;const target=document.createElement('div');target.className='managed-section mobile-section-target';target.dataset.section=key;target.setAttribute('aria-label',label);nodes.forEach(node=>target.append(node));sectionRoot.append(target);return {key,label,target,icon};}).filter(Boolean);
  main.prepend(sectionRoot);
  const prefKey='nasdaq_dashboard_layout_v1',defaultOrder=allShortcuts.map(item=>item.key);
  let prefDoc=document;try{if(parent!==window&&parent.location.origin===location.origin)prefDoc=parent.document}catch{}
  // Reserve the header's initial space inside the scrolling document, never in the iframe viewport.
  // This space scrolls away naturally and stays unchanged when the header hides or reappears.
  const shellHeader=prefDoc!==document&&prefDoc.querySelector('.history-header');
  if(shellHeader){
    // A Home Screen app can restore an older shell while loading fresh inner assets.
    // Normalize that shell before reserving the header, so the space is never counted twice.
    if(!prefDoc.getElementById('mobile-shell-geometry')){
      const style=prefDoc.createElement('style');style.id='mobile-shell-geometry';
      style.textContent='@media(max-width:600px){body{display:block}.history-panel{position:fixed!important;inset:0!important;width:100%;height:100dvh!important;margin:0!important;padding:0!important;transition:none!important}.history-panel>.history-frame{position:absolute;inset:0;width:100%;height:100%!important}.history-header{position:fixed;top:0;left:0;right:0}html.mood-history-open .history-header,html.section-manager-open .history-header{display:none!important}}';
      prefDoc.head.append(style);
    }
    document.documentElement.classList.add('mobile-shell-content');
    let headerInset='';
    const syncHeaderInset=()=>{const height=shellHeader.getBoundingClientRect().height;if(height<=0)return;const value=height+'px';if(value!==headerInset){headerInset=value;document.documentElement.style.setProperty('--mobile-header-height',value)}};
    const headerObserver=new ResizeObserver(syncHeaderInset);headerObserver.observe(shellHeader);syncHeaderInset();
    window.addEventListener('pagehide',()=>headerObserver.disconnect(),{once:true});
  }
  const normalize=value=>({order:[...new Set([...(Array.isArray(value?.order)?value.order:[]),...defaultOrder])].filter(key=>defaultOrder.includes(key)),hidden:[...new Set(Array.isArray(value?.hidden)?value.hidden:[])].filter(key=>defaultOrder.includes(key))});
  const readPreference=()=>{try{const value=prefDoc.cookie.split('; ').find(row=>row.startsWith(prefKey+'='));return normalize(value?JSON.parse(decodeURIComponent(value.slice(prefKey.length+1))):null)}catch{return normalize(null)}};
  let preference=readPreference(),shortcuts=[],links=[],expanded=false,currentIndex=0,navScrolling=false;
  const nav=document.createElement('nav');nav.className='mobile-section-nav';nav.setAttribute('aria-label','板块快捷导航');
  const dots='<svg viewBox="0 0 28 28" aria-hidden="true" focusable="false"><circle cx="6" cy="14" r="2.3"/><circle cx="14" cy="14" r="2.3"/><circle cx="22" cy="14" r="2.3"/></svg>';
  const closeIcon=navSvg('<path d="m8 8 12 12 M20 8 8 20"/>');
  const manageIcon=navSvg('<path d="M5 7h18 M5 14h18 M5 21h18"/><rect x="9" y="4" width="5" height="6" rx="1" fill="white"/><rect x="17" y="11" width="5" height="6" rx="1" fill="white"/><rect x="6" y="18" width="5" height="6" rx="1" fill="white"/>');
  const refreshIcon=navSvg('<path d="M23 12a9 9 0 1 0 2 7 M23 5v7h-7" stroke-linecap="round" stroke-linejoin="round"/>');
  const topIcon=navSvg('<path d="m7 17 7-7 7 7 M14 10v12 M6 5h16" stroke-linecap="round" stroke-linejoin="round"/>');
  nav.innerHTML=`<div class="mobile-section-list" id="mobile-section-links" hidden></div><div class="mobile-section-stepper" aria-label="相邻板块"><button type="button" data-section-step="-1" aria-label="上一个板块">${navSvg('<path d="m7 17 7-7 7 7" stroke-linecap="round"/>')}</button><button type="button" data-section-step="1" aria-label="下一个板块">${navSvg('<path d="m7 11 7 7 7-7" stroke-linecap="round"/>')}</button></div><button type="button" class="mobile-section-toggle" aria-label="打开板块导航" aria-controls="mobile-section-links" aria-expanded="false">${dots}</button>`;
  const backdrop=document.createElement('div');backdrop.className='mobile-section-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');document.body.append(backdrop,nav);
  const stepper=nav.querySelector('.mobile-section-stepper'),previousStep=nav.querySelector('[data-section-step="-1"]'),nextStep=nav.querySelector('[data-section-step="1"]');
  const toggle=nav.querySelector('.mobile-section-toggle'),list=nav.querySelector('.mobile-section-list'),mobile=matchMedia('(max-width:600px)');
  const empty=document.createElement('div');empty.className='managed-empty';empty.textContent='当前板块已全部隐藏，可在「板块管理」中重新打开。';sectionRoot.after(empty);
  const updateCurrent=()=>{currentIndex=0;const threshold=mobile.matches?Math.min(160,innerHeight*.25):Math.min(220,innerHeight*.32);for(let i=0;i<shortcuts.length;i++)if(shortcuts[i].target.getBoundingClientRect().top<=threshold)currentIndex=i;const current=shortcuts[currentIndex];links.forEach(button=>{if(button.dataset.sectionKey===current?.key)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current')});previousStep.disabled=currentIndex<=0;nextStep.disabled=!shortcuts.length||currentIndex>=shortcuts.length-1;previousStep.title=shortcuts[currentIndex-1]?'上一个板块：'+shortcuts[currentIndex-1].label:'已到第一个板块';nextStep.title=shortcuts[currentIndex+1]?'下一个板块：'+shortcuts[currentIndex+1].label:'已到最后一个板块'};
  let lastHeaderY=Math.max(0,window.scrollY),headerTravel=0,headerDirection=0,headerChangeUntil=0;
  const setHeaderHidden=hidden=>{if(!mobile.matches||prefDoc===document)return;const root=prefDoc.documentElement;if(root.classList.contains('mobile-header-hidden')===hidden)return;root.classList.toggle('mobile-header-hidden',hidden);prefDoc.querySelector('.history-header')?.toggleAttribute('inert',hidden);headerChangeUntil=performance.now()+260};
  const updateHeader=()=>{const y=Math.max(0,Math.min(window.scrollY,Math.max(0,document.documentElement.scrollHeight-innerHeight))),delta=y-lastHeaderY;lastHeaderY=y;if(!mobile.matches||navScrolling||expanded||document.documentElement.matches('.section-manager-open,.mood-history-open'))return;if(y<=8){headerTravel=0;setHeaderHidden(false);return}if(performance.now()<headerChangeUntil||Math.abs(delta)<.5)return;const direction=Math.sign(delta);headerTravel=direction===headerDirection?headerTravel+Math.abs(delta):Math.abs(delta);headerDirection=direction;if(direction>0&&y>80&&headerTravel>=24){setHeaderHidden(true);headerTravel=0}else if(direction<0&&headerTravel>=10){setHeaderHidden(false);headerTravel=0}};

  const applyPreference=()=>{preference=normalize(preference);shortcuts=[];for(const key of preference.order){const item=allShortcuts.find(item=>item.key===key);sectionRoot.append(item.target);item.target.hidden=preference.hidden.includes(key);if(!item.target.hidden)shortcuts.push(item)}empty.hidden=shortcuts.length>0;
    list.innerHTML=shortcuts.map(item=>`<button type="button" class="mobile-section-link" data-section-key="${item.key}" aria-label="前往${item.label}" title="${item.label}"><span class="mobile-section-icon">${navIcons[item.icon]}</span><span class="mobile-section-label">${item.label}</span></button>`).join('')+`<button type="button" class="mobile-section-link" data-refresh-page aria-label="刷新当前页面"><span class="mobile-section-icon">${refreshIcon}</span><span class="mobile-section-label">刷新页面</span></button><button type="button" class="mobile-section-link" data-manage-sections aria-label="板块管理"><span class="mobile-section-icon">${manageIcon}</span><span class="mobile-section-label">板块管理</span></button>`;
    links=[...list.querySelectorAll('button')];updateCurrent();window.dispatchEvent(new Event('resize'));
  };
  const setOpen=(open,restore=false)=>{if(!mobile.matches){expanded=false;list.hidden=false;stepper.hidden=false;backdrop.hidden=true;nav.classList.remove('is-open');nav.classList.add('desktop-open');toggle.removeAttribute('aria-expanded');toggle.removeAttribute('aria-controls');toggle.setAttribute('aria-label','返回顶部');toggle.title='返回顶部';toggle.innerHTML=topIcon;if(restore)toggle.focus({preventScroll:true});return}nav.classList.remove('desktop-open');expanded=open;list.hidden=!open;stepper.hidden=open;backdrop.hidden=!open;nav.classList.toggle('is-open',open);toggle.setAttribute('aria-controls','mobile-section-links');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'收起板块导航':'打开板块导航');toggle.removeAttribute('title');toggle.innerHTML=open?closeIcon:dots;if(restore)toggle.focus({preventScroll:true});};
  toggle.addEventListener('click',event=>{if(!mobile.matches){window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});return}setOpen(!expanded);if(expanded&&event.detail===0)links[0]?.focus()});
  backdrop.addEventListener('click',()=>setOpen(false,true));
  nav.addEventListener('keydown',event=>{if(!mobile.matches)return;if(event.key==='Escape'){event.preventDefault();setOpen(false,true)}else if(expanded&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();const i=links.indexOf(document.activeElement);links[event.key==='Home'?0:event.key==='End'?links.length-1:(i+(event.key==='ArrowUp'?-1:1)+links.length)%links.length]?.focus()}});
  let cancelNavScroll=()=>{};
  function scrollToSection(target){
    cancelNavScroll();const start=window.scrollY,targetY=start+target.getBoundingClientRect().top-14;
    const hideHeader=targetY>start&&targetY>80;
    const inset=mobile.matches&&shellHeader&&!hideHeader?(parseFloat(document.documentElement.style.getPropertyValue('--mobile-header-height'))||0):0;
    const end=Math.max(0,Math.min(targetY-inset,document.documentElement.scrollHeight-innerHeight));
    setHeaderHidden(hideHeader);
    if(matchMedia('(prefers-reduced-motion:reduce)').matches){window.scrollTo({top:end,behavior:'instant'});return}
    navScrolling=true;const began=performance.now();let frame=0;const events=['wheel','touchstart','pointerdown','keydown'];
    const stop=()=>{navScrolling=false;lastHeaderY=Math.max(0,window.scrollY);headerTravel=0;cancelAnimationFrame(frame);events.forEach(type=>window.removeEventListener(type,stop));cancelNavScroll=()=>{}};
    cancelNavScroll=stop;events.forEach(type=>window.addEventListener(type,stop,{passive:true,once:true}));
    const tick=now=>{const progress=Math.min(1,(now-began)/280),ease=1-Math.pow(1-progress,3);window.scrollTo({top:start+(end-start)*ease,behavior:'instant'});if(progress<1)frame=requestAnimationFrame(tick);else stop()};frame=requestAnimationFrame(tick);
  }
  const goToSection=item=>{if(!item)return;setOpen(false);const target=item.target,previous=target.getAttribute('tabindex');target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.addEventListener('blur',()=>{if(previous===null)target.removeAttribute('tabindex');else target.setAttribute('tabindex',previous)},{once:true});scrollToSection(target)};
  list.addEventListener('click',event=>{if(event.target.closest('[data-refresh-page]')){setOpen(false);if(parent!==window){parent.postMessage({type:'dashboard-menu-refresh'},location.origin)}else{try{sessionStorage.setItem('dashboard-refresh-position',String(window.scrollY));sessionStorage.setItem('dashboard-refresh-notice','1')}catch{}location.reload()}return}if(event.target.closest('[data-manage-sections]')){openManager();return}const button=event.target.closest('[data-section-key]');if(button)goToSection(shortcuts.find(item=>item.key===button.dataset.sectionKey))});
  stepper.addEventListener('click',event=>{const button=event.target.closest('[data-section-step]');if(!button||button.disabled)return;updateCurrent();goToSection(shortcuts[currentIndex+Number(button.dataset.sectionStep)])});
  let scheduled=false;window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;updateCurrent();if(mobile.matches)updateHeader()})}},{passive:true});
  mobile.addEventListener('change',()=>{applyPreference();setOpen(false);updateCurrent();prefDoc.documentElement.classList.remove('mobile-header-hidden');prefDoc.querySelector('.history-header')?.removeAttribute('inert');lastHeaderY=Math.max(0,window.scrollY);headerTravel=0});

  const manager=document.createElement('dialog');manager.className='section-manager';manager.setAttribute('aria-labelledby','section-manager-title');
  manager.innerHTML='<header><button type="button" data-manager-back aria-label="返回页面">‹</button><div><h2 id="section-manager-title">板块管理</h2><p>选择显示内容，调整阅读顺序</p></div><button type="button" data-manager-reset>恢复默认</button></header><div class="section-manager-list"></div><footer><p role="status" class="section-manager-status">保存到此浏览器，下次打开自动沿用。</p><button type="button" data-manager-save>保存并返回</button></footer>';
  manager.querySelector('[data-manager-back]').innerHTML=navSvg('<path d="m17 6-8 8 8 8" stroke-linecap="round"/>');
  document.body.append(manager);let draft=normalize(preference),returnFocus=null;
  const renderManager=()=>{manager.querySelector('.section-manager-list').innerHTML=draft.order.map((key,index)=>{const item=allShortcuts.find(item=>item.key===key);return `<div class="section-manager-row" data-manage-key="${key}"><span class="section-manager-icon">${navIcons[item.icon]}</span><b>${item.label}</b><div class="section-order"><button type="button" data-move="-1" aria-label="上移${item.label}" ${index===0?'disabled':''}>↑</button><button type="button" data-move="1" aria-label="下移${item.label}" ${index===draft.order.length-1?'disabled':''}>↓</button></div><button type="button" class="section-switch" role="switch" aria-label="显示${item.label}" aria-checked="${!draft.hidden.includes(key)}"><span></span></button></div>`}).join('')};
  const setManagerMode=open=>{cancelNavScroll();setHeaderHidden(false);document.documentElement.classList.toggle('section-manager-open',open);prefDoc.documentElement.classList.toggle('section-manager-open',open)};
  window.addEventListener('pagehide',()=>{setManagerMode(false);prefDoc.documentElement.classList.remove('mobile-header-hidden');prefDoc.querySelector('.history-header')?.removeAttribute('inert')});
  function openManager(){returnFocus=document.activeElement;setOpen(false);draft=normalize(preference);renderManager();manager.querySelector('.section-manager-status').textContent='保存到此浏览器，下次打开自动沿用。';setManagerMode(true);manager.showModal();manager.querySelector('[data-manager-back]').focus({preventScroll:true})}
  manager.querySelector('[data-manager-back]').addEventListener('click',()=>manager.close());
  manager.addEventListener('close',()=>{setManagerMode(false);(returnFocus?.isConnected&&returnFocus.offsetParent?returnFocus:toggle).focus({preventScroll:true})});
  manager.querySelector('[data-manager-reset]').addEventListener('click',()=>{draft=normalize(null);renderManager();manager.querySelector('.section-manager-status').textContent='已恢复默认，保存后生效。'});
  manager.querySelector('.section-manager-list').addEventListener('click',event=>{const row=event.target.closest('[data-manage-key]');if(!row)return;const key=row.dataset.manageKey;if(event.target.closest('.section-switch')){draft.hidden=draft.hidden.includes(key)?draft.hidden.filter(k=>k!==key):[...draft.hidden,key];const button=row.querySelector('.section-switch');button.setAttribute('aria-checked',String(!draft.hidden.includes(key)))}else{const button=event.target.closest('[data-move]');if(!button)return;const i=draft.order.indexOf(key),j=i+Number(button.dataset.move);if(j<0||j>=draft.order.length)return;const positions=new Map([...manager.querySelectorAll('.section-manager-row')].map(row=>[row.dataset.manageKey,row.getBoundingClientRect().top]));[draft.order[i],draft.order[j]]=[draft.order[j],draft.order[i]];renderManager();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)for(const row of manager.querySelectorAll('.section-manager-row')){const offset=positions.get(row.dataset.manageKey)-row.getBoundingClientRect().top;if(offset)row.animate([{transform:'translateY('+offset+'px)'},{transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'})}manager.querySelector(`[data-manage-key="${key}"] [data-move="${button.dataset.move}"]:not(:disabled)`)?.focus({preventScroll:true})}});
  manager.querySelector('[data-manager-save]').addEventListener('click',()=>{const value=normalize(draft);try{prefDoc.cookie=prefKey+'='+encodeURIComponent(JSON.stringify(value))+'; Max-Age=31536000; Path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');const saved=readPreference();if(JSON.stringify(saved)!==JSON.stringify(value))throw Error('cookie unavailable');preference=value;applyPreference();manager.close();window.scrollTo({top:0,behavior:'instant'})}catch{manager.querySelector('.section-manager-status').textContent='浏览器未允许保存 Cookie，请允许后再试；设置尚未保存。'}});
  applyPreference();setOpen(false);
  if(parent===window){try{const saved=sessionStorage.getItem('dashboard-refresh-position'),notice=sessionStorage.getItem('dashboard-refresh-notice');if(saved!==null){sessionStorage.removeItem('dashboard-refresh-position');addEventListener('load',()=>{requestAnimationFrame(()=>window.scrollTo({top:Number(saved)||0,behavior:'instant'}))},{once:true})}if(notice==='1'){sessionStorage.removeItem('dashboard-refresh-notice');const toast=document.createElement('div');toast.className='mobile-refresh-toast';toast.role='status';toast.textContent='已更新';document.body.append(toast);requestAnimationFrame(()=>toast.classList.add('is-visible'));setTimeout(()=>toast.remove(),2500)}}catch{}}
})();

// Shared presentation for both viewport sizes; underlying dates and source links stay intact.
(() => {
 const reportYear=(()=>{try{return Number(JSON.parse(document.getElementById('live-week-data')?.textContent||'{}').start?.slice(0,4))||new Date().getFullYear()}catch{return new Date().getFullYear()}})();
 const beijing=date=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`};
 const eastern=(month,day,hour,minute)=>{const wall=Date.UTC(reportYear,Number(month)-1,Number(day),Number(hour),Number(minute));let utc=wall;for(let n=0;n<2;n++){const offset=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(new Date(utc)).find(p=>p.type==='timeZoneName').value.match(/GMT([+-]\d+)(?::(\d+))?/);utc=wall-(Number(offset?.[1]||0)*60+Math.sign(Number(offset?.[1]||0))*Number(offset?.[2]||0))*60000}return beijing(new Date(utc))};
 const formatDisplayTime=value=>String(value??'')
  .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})/g,s=>Number.isFinite(Date.parse(s))?beijing(new Date(s)):s)
  .replace(/\d{2}\/\d{2}\s+\d{2}:\d{2}\s*(?:美东|ET)\s*[\/／]\s*(\d{2}\/\d{2}\s+\d{2}:\d{2})\s*北京(?:时间)?/g,'$1')
  .replace(/\b\d{4}[-/](\d{2})[-/](\d{2})\b/g,'$1/$2')
  .replace(/(\d{1,2})月(\d{1,2})日/g,(_,m,d)=>m.padStart(2,'0')+'/'+d.padStart(2,'0'))
  .replace(/(\d{2})\/(\d{2})\s*(\d{2}):(\d{2})\s*(?:美东(?:时间)?|ET)/g,(_,m,d,h,t)=>eastern(m,d,h,t))
  .replace(/(\d{2}:\d{2})\s*北京(?:时间)?/g,'$1')
  .replace(/(\d{2}:\d{2}):\d{2}/g,'$1')
  .replace(/^(夜盘|盘前|盘中|盘后)\s*[·：:]?\s*(\d{2}\/\d{2}(?:\s+\d{2}:\d{2})?)/,'$2 $1')
  .replace(/(\d{2}\/\d{2}(?:\s+\d{2}:\d{2})?)\s*·\s*(夜盘|盘前|盘中|盘后)/g,'$1 $2')
  .replace(/(\d{2}\/\d{2})\s*(\d{2}:\d{2})/g,'$1 $2');
 const compactStamp=value=>{const text=formatDisplayTime(value),date=text.match(/\d{2}\/\d{2}(?:\s+\d{2}:\d{2})?/),session=text.match(/夜盘|盘前|盘中|盘后|收盘/);return date?[date[0],session?.[0]].filter(Boolean).join(' '):''};
 const sourceSelectors='.fineprint,.weight-method,.importance-legend,.direction-legend,.event-weight-note,.pulse-foot,.risk-source,#calendar>.note,.x-trend-evidence,.x-trend-caveat,.calendar-detail-links,.calendar-evidence,.calendar-progress-source,.event-detail-sources,.mood-day-sources,.mood-week-foot,.fed-hike-reading small,a.mobile-source-only';
 const matches=(root,selector)=>[...(root.nodeType===1&&root.matches(selector)?[root]:[]),...root.querySelectorAll?.(selector)||[]];
 const addStamp=(node,text)=>{if(!text)return;let stamp=node.previousElementSibling;if(!stamp?.matches('.mobile-info-stamp,.observation-stamp')){stamp=document.createElement('span');node.before(stamp)}stamp.classList.add('observation-stamp');stamp.textContent=text;return stamp};
 function unifyDisclosure(detail){
  if(detail.dataset.sourceUnified)return;detail.dataset.sourceUnified='true';
  const summary=detail.querySelector(':scope > summary');if(!summary)return;
  if(!detail.closest('.week-live-banner')){const source=detail.querySelector('.sub,.risk-source,.quote-reference')?.textContent||summary.textContent;addStamp(detail,compactStamp(source))}
  detail.classList.add('compact-info');detail.querySelector(':scope > .source-content')?.classList.add('compact-info-body');summary.textContent='来源与口径';detail.removeAttribute('open');detail.addEventListener('click',event=>event.stopPropagation());
 }
 function foldSources(root){
  for(const detail of matches(root,'details.compact-info,details.source-disclosure'))unifyDisclosure(detail);
  for(const node of matches(root,sourceSelectors)){
   if(!node.isConnected||node.closest('details.compact-info,details.source-disclosure')||node.dataset.sourceFolded)continue;
   node.dataset.sourceFolded='true';
   const stamp=compactStamp(node.textContent);addStamp(node,stamp);
   let host=node.closest('.metric,.risk-column,.chain-card,.x-trend-card,.x-topic-card,.calendar-detail,.calendar-event,.mood-week-history,.section,.managed-section')||document.querySelector('main');
   if(!host)continue;
   if(host.closest('button,a'))host=host.closest('.managed-section')||document.querySelector('main');
   let detail=host.querySelector(':scope > details.compact-info');
   if(!detail){detail=document.createElement('details');detail.className='compact-info provenance-fold';detail.dataset.sourceUnified='true';detail.innerHTML='<summary>来源与口径</summary><div class="compact-info-body"></div>';detail.addEventListener('click',event=>event.stopPropagation());host.append(detail)}
   detail.lastElementChild.append(node);
  }
 }
 function formatNodes(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){if(node.parentElement?.closest('script,style,code,pre,textarea,svg'))continue;const text=formatDisplayTime(node.nodeValue);if(text!==node.nodeValue)node.nodeValue=text}
 }
 function refresh(root=document.body){if(!root?.isConnected)return;formatNodes(root);foldSources(root)}
 window.DashboardPresentation={formatDisplayTime,compactStamp,refresh};
 refresh();
 const queued=new Set();let pending=false;
 new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')queued.add(record.target.parentElement);else for(const node of record.addedNodes)if(node.nodeType===1)queued.add(node)}if(!pending&&queued.size){pending=true;requestAnimationFrame(()=>{pending=false;const nodes=[...queued];queued.clear();for(const node of nodes)refresh(node)})}}).observe(document.body,{subtree:true,childList:true,characterData:true});
})();
