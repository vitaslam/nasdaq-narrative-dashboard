import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeMuseFeed} from '../scripts/merge-muse-feed.mjs';
const date='2026-11-02';
const data=()=>({
 weeks:{
  [date]:{
   start:date,
   snapshot:{
    bars:{QQQ:[{date,c:681.09}],NDX:[],SPX:[]},
    sentiment:{CNN:{asof:date,value:27},VIX:{asof:date,value:21.15},VXFutures:{asof:date,vx1:20,vx2:21}},
    volatility:{dates:[date],vix:[21.15],vxn:[31.64]},
    gpt_verified_market:{
     bars:{QQQ:{[date]:'checked'}},
     sentiment:{CNN:{asof:date},VIX:{asof:date},VXFutures:{asof:date}},
     volatility:{[date]:{vix:'checked',vxn:'checked'}}
    }
   }
  }
 }
});
const feed=(asof=date)=>({batch_id:'muse:fixture',week_id:date,x_topics_upsert:[],market_bars:{QQQ:[{date:asof,c:682}],NDX:[],SPX:[]},volatility_readings:[{date:asof,vix:{value:22},vxn:{value:33}}],market_indicators:{CNN:{asof,value:28},CTA:{asof,value:7554},VXFutures:{asof,vx1:22,vx2:23}}});
test('Same-date cumulative feed cannot undo GPT verification; CTA remains Muse-owned',()=>{
 const original=data(),result=mergeMuseFeed(original,feed()).data.weeks[date].snapshot;
 assert.equal(result.bars.QQQ[0].c,681.09);assert.equal(result.sentiment.CNN.value,27);assert.equal(result.sentiment.VIX.value,21.15);
 assert.deepEqual(result.volatility,{dates:[date],vix:[21.15],vxn:[31.64]});assert.equal(result.sentiment.VXFutures.vx1,20);assert.equal(result.sentiment.CTA.value,7554);
 assert.equal(original.weeks[date].snapshot.sentiment.CTA,undefined);
});
test('Newer observations supplement GPT-verified dates and legacy feeds keep working',()=>{
 const original=data(),result=mergeMuseFeed(original,feed('2026-11-03')).data.weeks[date].snapshot;
 assert.equal(result.bars.QQQ.at(-1).date,'2026-11-03');assert.equal(result.sentiment.CNN.value,28);assert.equal(result.sentiment.VIX.value,22);assert.equal(result.sentiment.VXFutures.vx1,22);
 assert.deepEqual(result.volatility.vix,[21.15,22]);
 delete original.weeks[date].snapshot.gpt_verified_market;
 assert.equal(mergeMuseFeed(original,feed()).data.weeks[date].snapshot.bars.QQQ[0].c,682);
});
