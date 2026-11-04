const url=s=>typeof s==='string'&&/^https:\/\/[^\s]+$/.test(s);
export function quoteError(key,row,now=Date.now()){
 if(!['QQQ','NDX','SPX','VIX','VXN','UST10Y','UST30Y','Brent','ES','NQ'].includes(key))return 'Unsupported quote instrument';
 if(!row||!Number.isFinite(row.value)||row.value<=0||!/(?:Z|[+-]\d\d:\d\d)$/.test(row.asof||'')||!Number.isFinite(Date.parse(row.asof))||Date.parse(row.asof)>now+60000)return 'Quote needs a positive value and actual timestamp with timezone';
 if(!['overnight','premarket','regular','afterhours'].includes(row.session)||!url(row.source_url)||!row.source_label?.trim()||!row.instrument?.trim()||!row.price_basis?.trim())return 'Quote needs session, instrument, price basis and source';
 if((['ES','NQ'].includes(key)||row.price_basis.includes('future'))&&!row.contract?.trim())return 'Futures quote requires actual contract';
 if(['QQQ','NDX','SPX','VIX','VXN'].includes(key)&&row.price_basis!=='cash')return 'Cash quote cannot be replaced by futures';
 if(['UST10Y','UST30Y'].includes(key)&&(row.value>20||row.price_basis!=='benchmark_yield'))return 'Treasury quote requires benchmark yield';
 if(row.delayed!=null&&typeof row.delayed!=='boolean')return 'delayed must be boolean';
 return null;
}
