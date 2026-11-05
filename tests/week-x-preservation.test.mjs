import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveWeekX} from '../scripts/preserve-week-x.mjs';
import {mergeMuseFeed} from '../scripts/merge-muse-feed.mjs';

const id = '2026-11-02';
const post = (name, author) => ({id:name,author,published_at:'2026-11-03T15:00:00Z',observed_at:'2026-11-04T15:00:00Z'});
const snapshot = () => ({bars:{QQQ:[],NDX:[],SPX:[]},sentiment:{},volatility:{dates:[],vix:[],vxn:[]}});
const week = (topics=[],trends=[]) => ({start:id,status:'active',snapshot:snapshot(),x_topics:topics,x_trends:trends});

test('Weekly trend cards and older posts survive a partial feed and Site export', () => {
  const oldPosts=[post('a','@one'),post('b','@two')];
  const prior={active_week:id,weeks:{[id]:week([{id:'election',posts:oldPosts}],[{id:'election-trend',evidence_post_ids:['a','b'],summary:'Earlier phase'}])}};
  const current={active_week:id,weeks:{[id]:week()}};
  preserveWeekX(current,prior);
  const feed={batch_id:'new',week_id:id,x_topics_upsert:[{id:'new',posts:[post('c','@three'),post('d','@four')]}],weekly_trends:[{id:'new-trend',evidence_post_ids:['c','d']}],market_bars:{QQQ:[],NDX:[],SPX:[]},volatility_readings:[]};
  const result=mergeMuseFeed(current,feed).data.weeks[id];
  assert.deepEqual(result.x_topics.flatMap(t=>t.posts.map(p=>p.id)),['a','b','c','d']);
  assert.deepEqual(result.x_trends.map(t=>t.id),['election-trend','new-trend']);
  assert.equal(result.x_trends[0].summary,'Earlier phase');
  const next={active_week:'2026-11-09',weeks:{'2026-11-09':week()}};
  preserveWeekX(next,prior);
  assert.deepEqual(next.weeks['2026-11-09'].x_trends,[]);
});
