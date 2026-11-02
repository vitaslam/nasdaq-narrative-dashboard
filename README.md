# 美股叙事跟踪

正式查看：[GitHub Pages](https://vitaslam.github.io/nasdaq-narrative-dashboard/)

页面迭代：[GPT 站点](https://nasdaq-narrative-tracker-vj.thatvitaslam.chatgpt.site)

## 发布约定

布局和功能先在 GPT 站点讨论、预览，用户确认后才替换本仓库的已确认渲染器。当前版包含清晰正文、重点卡分类色、半星重要性、周一对照上周五情绪、50/200日均线、图下悬浮读数、比例评分条、十月事件日历和可横向滑动的 X 观点卡片。

每日北京时间 10:00、16:00、22:00 的任务更新 GPT 主体内容，通过小型 `data-revision.json` 触发发布。Muse AI 主责 X 观点与 NDX/QQQ/SPX、VIX/VXN 读数，提交[本周累计版 muse-feed.json](muse-feed.json)后直接触发**同一条** GitHub Actions 管线。构建先拉 `/api/export`，再按 ID/日期合并 Muse 数据，用 `approved/renderer.mjs.gz` 渲染。GPT 任务不再逐条人工搬运 Muse feed。双方写入前按[仓库写入锁](PUBLISH_LOCK.json)的协议串行操作。各板块职责、核验与冲突规则见[维护手册](MAINTENANCE.md)，每日主体更新见[增量规范](DAILY_UPDATE.md)，双方构建提交见[发布日志](PUBLISH_LOG.md)。10:35、16:35、22:35 及后一小时补偿同步；电脑或浏览器无需在线。

## 构建

Node.js 22，无外部 npm 依赖：

```sh
node scripts/export-pages.mjs
```

首次发布可使用已核对快照：`node scripts/export-pages.mjs --snapshot`。`approved/snapshot.json` 是本次发布的数据备份；日常工作流使用公开 `/api/export` 数据。

压缩渲染器是已确认的固定模板、历史报告、头像与前端代码。可用 `gzip -dc approved/renderer.mjs.gz > renderer.mjs` 查看。压缩仅为减少重复历史页面的存储体积。源模板与编译脚本在 Sites 源仓库维护；GitHub 的渲染器只在用户确认设计变更后替换。

星级为分析估计，满分3星，支持半星；五维与验证重点采用分类色，左侧事件占比和问题清单保持白底可读。它与事件或五维百分比独立。CNN、BofA 等按实际记录频率绘图，缺失数据留空。历史内容和周计划保持原记录口径。

Pages 保留现有 main 分支根目录发布模式。云端脚本提交静态页面后，通过官方 Pages builds API 请求构建；不需要修改浏览器设置或保存个人访问令牌。export revision、渲染器哈希及 Muse feed 内容哈希均未变化时跳过重建和发布。`release.json` 分别记录主体 `data_revision`、合并 `release_revision`、`muse_feed_batch` 和实际构建时间；正式页的 `/api/export.json` 是合并后的公开数据。
