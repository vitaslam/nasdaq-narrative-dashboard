// Keep this retention contract in sync with the Site runtime.
export function advanceChangeMarkers(previous,keys,at,meta={}){
 const key_times={},now=Date.parse(at);
 for(const key of previous?.keys||[]){const stamp=previous.key_times?.[key]||previous.at;const time=Date.parse(stamp);if(!Number.isFinite(time)||now-time<3*3600_000)key_times[key]=Number.isFinite(time)?stamp:at}
 for(const key of keys)key_times[key]=at;
 return {...previous,...meta,at,keys:Object.keys(key_times),key_times};
}
