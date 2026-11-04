import test from 'node:test';
import assert from 'node:assert/strict';
import {brentError,BRENT_FALLBACK_LABEL} from '../scripts/brent-policy.mjs';
import {quoteError} from '../scripts/market-quotes.mjs';
import {mergeMuseFeed} from '../scripts/merge-muse-feed.mjs';
const ice={value:104.34,asof:'2026-11-03',source_url:'https://www.ice.com/products/219/Brent-Crude-Futures/data',source_label:BRENT_FALLBACK_LABEL,price_basis:'ice_front_month_settlement',contract:'2027-01',eia_asof:'2026-10-27'};
test('Brent daily fallback requires stale EIA, real ICE source and explicit basis',()=>{
 assert.equal(brentError(ice,'2026-11-03'),null);
 assert.match(brentError({...ice,eia_asof:'2026-10-31'},'2026-11-03'),/greater than three/);
 assert.match(brentError(ice,'2026-11-03','2026-11-02'),/greater than three/);
 assert.ok(brentError({...ice,source_label:''},'2026-11-03'));
 assert.ok(brentError({...ice,source_url:'https://www.investing.com/commodities/brent-oil-historical-data'},'2026-11-03'));
});
const fixture=()=>({weeks:{'2026-11-02':{start:'2026-11-02',status:'active',snapshot:{bars:{NDX:[{date:'2026-11-03',c:1}],QQQ:[],SPX:[]},sentiment:{Brent:{value:123.1,asof:'2026-10-27',source_url:'https://www.eia.gov/dnav/pet/'}},indicator_history:{Brent:[{date:'2026-10-27',value:123.1,source_url:'https://www.eia.gov/dnav/pet/'}]}}}}});
const feed=row=>({week_id:'2026-11-02',x_topics_upsert:[],market_bars:{NDX:[],QQQ:[],SPX:[]},volatility_readings:[],market_indicators:{Brent:row}});
test('Fallback stays out of spot history and later EIA restores spot without stale metadata',()=>{
 const fallback=mergeMuseFeed(fixture(),feed(ice)).data;
 assert.equal(fallback.weeks['2026-11-02'].snapshot.sentiment.Brent.value,104.34);
 assert.equal(fallback.weeks['2026-11-02'].snapshot.indicator_history.Brent.length,1);
 const spot={value:107.39,asof:'2026-11-03',source_url:'https://www.eia.gov/TodayinEnergy/prices.php'};
 const snap=mergeMuseFeed(fallback,feed(spot)).data.weeks['2026-11-02'].snapshot;
 assert.equal(snap.sentiment.Brent.price_basis,'eia_spot');assert.equal(snap.sentiment.Brent.contract,undefined);assert.equal(snap.sentiment.Brent.source_label,'EIA 现货');assert.equal(snap.indicator_history.Brent.length,2);
});
test('Live futures are separate quotes and do not need stale EIA; older quotes cannot roll them back',()=>{
 const row={value:102.89,asof:'2026-11-04T04:49:35Z',session:'overnight',instrument:'ICE Brent',price_basis:'futures',contract:'2027-01',source_url:'https://www.interactivebrokers.com/',source_label:'IBKR / ICE',delayed:true};
 assert.equal(quoteError('Brent',row,Date.parse('2026-11-04T05:00:00Z')),null);assert.ok(quoteError('Brent',{...row,contract:''}));assert.ok(quoteError('SPX',row));
 const f=feed(null);f.market_quotes={Brent:row};const first=mergeMuseFeed(fixture(),f).data;f.market_quotes.Brent={...row,value:105,asof:'2026-11-04T03:00:00Z'};
 const snap=mergeMuseFeed(first,f).data.weeks['2026-11-02'].snapshot;assert.equal(snap.quotes.Brent.value,102.89);assert.equal(snap.sentiment.Brent.value,123.1);assert.equal(snap.indicator_history.Brent.length,1);
});
