'use strict';
// Shared, accessible half-star scale. Importance is an editorial assessment, not probability.
window.DashboardUI = (() => {
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const valid=n=>Number.isFinite(n)&&n>=.5&&n<=3&&Number.isInteger(n*2);
 const normalize=r=>typeof r==='number'?{score:r,reason:''}:r||{};
 const high=r=>normalize(r).score===3?' priority-high':'';
 function stars(r){r=normalize(r);if(!valid(r.score))return '';const title=`重要性 ${r.score} / 3 星${r.reason?' · '+r.reason:''}`;const path='M12 2.2 15 8.3 21.8 9.3 16.9 14.1 18.1 20.9 12 17.7 5.9 20.9 7.1 14.1 2.2 9.3 9 8.3Z';
 return `<span class="importance-rating" role="img" aria-label="${esc(title)}" title="${esc(title)}" data-importance="${r.score}">${[0,1,2].map(i=>`<span class="importance-star"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".45"/></svg><svg viewBox="0 0 24 24" aria-hidden="true" style="clip-path:inset(0 ${100-Math.max(0,Math.min(1,r.score-i))*100}% 0 0)"><path d="${path}" fill="currentColor"/></svg></span>`).join('')}</span>`;
 }
 const lookup=(w,group,id,fallback)=>w?.importance?.[group]?.[id]||fallback;
 function emphasize(text,phrases=[]){const escaped=esc(text);const terms=[...phrases].filter(x=>typeof x==='string'&&x.length>1).sort((a,b)=>b.length-a.length);const pattern=terms.map(x=>esc(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');const numbers='[+−-]?\\d+(?:[,.]\\d+)*(?:%|万亿|亿|万|日线|bp|GW)';return escaped.replace(new RegExp(pattern?pattern+'|'+numbers:numbers,'g'),'<strong>$&</strong>');}
 function calendarImportance(e){if(valid(e.importance?.score))return e.importance;const text=e.event||'';
 if(/非农|CPI|FOMC|联储.*利率|中期选举|总统.*选举/i.test(text))return {score:3,reason:'可能影响整体利率与市场预期'};
 if(/财报/.test(text)&&/Apple|苹果|NVIDIA|英伟达|Microsoft|微软|Amazon|亚马逊|Alphabet|Google|谷歌|Meta/i.test(text))return {score:3,reason:'大型指数成分股财报，需核对当期影响'};
 if(/财报/.test(text))return {score:2,reason:'行业与个股催化；根据当周叙事调整'};
 if(/PPI|ISM|JOLTS|油价|美债/.test(text))return {score:2,reason:'重要宏观观察项；根据当期背景调整'};
 return {score:1.5,reason:'常规关注事件；等待当期影响评估'};
 }
 return {esc,valid,high,stars,lookup,emphasize,calendarImportance};
})();
