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
    panel.innerHTML=`<div class="mood-week-heading"><strong>交易日情绪</strong><span>${currentWeek?'本周与上周':M.start.slice(5).replace('-','/')+'–'+M.end.slice(5).replace('-','/')}</span></div><ol>${entries.join('')}</ol><p class="mood-week-foot">标为「收盘回溯」的日期依据同期收盘与已知事件整理。</p>`;
    const list=panel.querySelector('ol');
    const cards=[...list.querySelectorAll('li:not(.mood-week-boundary)')];
    const lastVisible=cards[Math.min(5,cards.length)-1];
    const panelMargin=()=>document.documentElement.clientWidth<480?4:10;
    function fitFive(){
      panel.style.setProperty('--mood-tile-width',tile.getBoundingClientRect().width+'px');
      list.style.maxHeight='none';
      // Week labels take space in the list but do not count as trading days.
      const height=lastVisible.getBoundingClientRect().bottom-list.getBoundingClientRect().top+list.scrollTop;
      list.style.maxHeight=Math.ceil(height)+'px';
    }
    document.body.append(panel);
    tile.tabIndex=0;tile.setAttribute('aria-haspopup','true');tile.setAttribute('aria-controls',panel.id);tile.setAttribute('aria-expanded','false');
    tile.setAttribute('aria-label','市场情绪，点击查看'+scope+'交易日情绪和 QQQ 收盘');
    let lastPointer;
    function place(){
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
    function show(){panel.hidden=false;list.scrollTop=0;tile.setAttribute('aria-expanded','true');fitFive();place()}
    function hide(){panel.hidden=true;tile.setAttribute('aria-expanded','false')}
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
})();
