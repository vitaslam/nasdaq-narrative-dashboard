// Keep the published active week's X record when the Site export or a new feed
// contains only the latest additions. A new active week starts independently.
export function preserveWeekX(current, previous) {
  const id = current.active_week;
  if (!id || id !== previous?.active_week) return current;
  const week = current.weeks?.[id], prior = previous.weeks?.[id];
  if (week?.status !== 'active' || prior?.status !== 'active') return current;

  const topics = new Map((prior.x_topics || []).map(topic => [topic.id, topic]));
  for (const topic of week.x_topics || []) {
    const older = topics.get(topic.id);
    const posts = new Map((older?.posts || []).map(post => [post.id, post]));
    for (const post of topic.posts || []) posts.set(post.id, {...posts.get(post.id), ...post});
    topics.set(topic.id, {...older, ...topic, posts: [...posts.values()]});
  }
  week.x_topics = [...topics.values()];

  const trends = new Map((prior.x_trends || []).map(trend => [trend.id, trend]));
  for (const trend of week.x_trends || []) trends.set(trend.id, {...trends.get(trend.id), ...trend});
  week.x_trends = [...trends.values()];
  return current;
}
