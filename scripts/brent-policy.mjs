export const BRENT_FALLBACK_LABEL='ICE 期货结算 · EIA 现货滞后兜底';
export const isEiaBrent=row=>/^https:\/\/(?:www\.)?eia\.gov\//.test(row?.source_url||'');
export const isIceBrent=row=>/^https:\/\/(?:www\.)?ice\.com\//.test(row?.source_url||'');
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
export function brentError(row,latestMarketDate,knownEiaDate){
 if(!Number.isFinite(row?.value)||row.value<=0||row.value>500||!validDate(row.asof))return 'Brent needs a positive dated reading';
 if(isEiaBrent(row))return row.price_basis&&row.price_basis!=='eia_spot'?'EIA Brent must use spot basis':null;
 if(!isIceBrent(row))return 'Brent source must be EIA, or ICE for a qualified stale-EIA fallback';
 if(row.source_label!==BRENT_FALLBACK_LABEL||row.price_basis!=='ice_front_month_settlement'||!row.contract?.trim())return 'ICE fallback needs the exact source_label, price_basis and actual front-month contract';
 if(!validDate(row.eia_asof)||!validDate(latestMarketDate)||row.asof>latestMarketDate)return 'ICE fallback needs latest verified EIA date and a completed market session';
 const eiaDate=[row.eia_asof,knownEiaDate].filter(validDate).sort().at(-1);
 if(Date.parse(latestMarketDate)-Date.parse(eiaDate)<=3*86400_000||row.asof<=eiaDate)return 'ICE fallback requires EIA spot lag greater than three calendar days';
 return null;
}
