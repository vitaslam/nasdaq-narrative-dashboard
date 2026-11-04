import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceChangeMarkers} from '../scripts/change-markers.mjs';
test('Different item clocks survive batches and only expired items clear',()=>{
 const prior={batch_id:'old',at:'2026-11-04T02:00:00Z',keys:['old','recent','changed'],key_times:{old:'2026-11-04T00:00:00Z',recent:'2026-11-04T01:00:01Z',changed:'2026-11-04T02:00:00Z'}};
 const next=advanceChangeMarkers(prior,['changed','new'],'2026-11-04T04:00:00Z',{batch_id:'new'});
 assert.deepEqual(next.keys,['recent','changed','new']);assert.equal(next.key_times.recent,prior.key_times.recent);assert.equal(next.key_times.changed,next.at);assert.equal(prior.key_times.changed,'2026-11-04T02:00:00Z');
 const empty=advanceChangeMarkers(next,[],'2026-11-04T04:00:01Z',{batch_id:'no-visible-change'});
 assert.deepEqual(empty.keys,['changed','new']);assert.equal(empty.key_times.changed,next.at);
});
test('Legacy dots inherit original timestamp, not migration time',()=>{
 const prior={batch_id:'old',at:'2026-11-04T01:00:00Z',keys:['legacy']};
 const kept=advanceChangeMarkers(prior,[],'2026-11-04T03:59:59Z');assert.equal(kept.key_times.legacy,prior.at);
 assert.deepEqual(advanceChangeMarkers(kept,[],'2026-11-04T04:00:00Z').keys,[]);
});
