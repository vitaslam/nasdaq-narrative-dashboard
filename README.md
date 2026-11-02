# 美股叙事跟踪

正式查看：[GitHub Pages](https://vitaslam.github.io/nasdaq-narrative-dashboard/)

页面迭代：[GPT 站点](https://nasdaq-narrative-tracker-vj.thatvitaslam.chatgpt.site)

## 发布约定

布局和功能先在 GPT 站点讨论、预览，用户确认后才替换本仓库的已确认渲染器。当前版包含清晰正文、重点卡分类色、半星重要性、周一对照上周五情绪、50/200日均线、图下悬浮读数、比例评分条、十月事件日历和可横向滑动的 X 观点卡片。

每日北京时间 10:00、16:00、22:00 的原有任务继续更新数据，并通过 GitHub 插件提交小型 data-revision.json 触发发布。[每日增量维护规范](DAILY_UPDATE.md)规定只读新数据、只写变化字段，无需电脑或浏览器在线。Muse AI 的 X 观点与市场读数先交接到 [muse-feed.json](muse-feed.json)，经下一次更新任务核验后写入 GPT 站点，避免仓库旧文件覆盖线上事实。各板块逻辑、字段、职责和发布检查见 [维护手册](MAINTENANCE.md)。GitHub Actions 另于北京时间 10:35、16:35、22:35（各有一小时后补偿）同步公开数据，在 GitHub 内用本仓库 `approved/renderer.mjs.gz` 渲染并发布。不会下载或执行 GPT 站点的新代码。Actions 定时执行可能延迟；数据获取失败会保留上次部署。

## 构建

Node.js 22，无外部 npm 依赖：

```sh
node scripts/export-pages.mjs
```

首次发布可使用已核对快照：`node scripts/export-pages.mjs --snapshot`。`approved/snapshot.json` 是本次发布的数据备份；日常工作流使用公开 `/api/export` 数据。

压缩渲染器是已确认的固定模板、历史报告、头像与前端代码。可用 `gzip -dc approved/renderer.mjs.gz > renderer.mjs` 查看。压缩仅为减少重复历史页面的存储体积。源模板与编译脚本在 Sites 源仓库维护；GitHub 的渲染器只在用户确认设计变更后替换。

星级为分析估计，满分3星，支持半星；五维与验证重点采用分类色，左侧事件占比和问题清单保持白底可读。它与事件或五维百分比独立。CNN、BofA 等按实际记录频率绘图，缺失数据留空。历史内容和周计划保持原记录口径。

Pages 保留现有 main 分支根目录发布模式。云端脚本提交静态页面后，通过官方 Pages builds API 请求构建；不需要修改浏览器设置或保存个人访问令牌。数据版本及渲染器哈希均未变化时跳过重建和发布。
