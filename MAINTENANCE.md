# 美股叙事跟踪｜页面逻辑与协作维护

正式页面：<https://vitaslam.github.io/nasdaq-narrative-dashboard/>  
内容与版式迭代：<https://nasdaq-narrative-tracker-vj.thatvitaslam.chatgpt.site/>

## 两个站点与一条数据主线

GPT 站点的有版本记录的数据是内容主源；公开 `/api/export` 提供 `revision`、`active_week`、各周记录与共用日历。GitHub 仓库的 `approved/renderer.mjs.gz` 是用户确认过的渲染器。GitHub Actions 拉取公开数据，用固定渲染器生成静态页面。仓库根目录生成的 HTML、`weeks/`、`api/`、CSS/JS 是**产物**，不可手改；下次同步会覆盖。`approved/snapshot.json` 只是发布时的备份，日常不作为最新数据源。

页面改版先在 GPT 站点验证；用户确认后才更换 GitHub 的渲染器。日常内容更新由数据工具写回 GPT 站点，再让 `data-revision.json` 触发 GitHub 同步。不要把两边分别编辑成两个版本。`/api/export` 是只读公开数据，不是写入接口。

Muse AI 可以在本仓库提交 `muse-feed.json`，作为**候选证据交接**；它不会在发布时直接覆盖 `/api/export`。北京时间 10:00、16:00、22:00 的更新任务核验并按稳定 ID 将新增内容写入 GPT 站点，成功后 GitHub 再同步。这样避免过期文件盖掉新数据、同一读数重复发布、历史周被改写。Muse 每两小时收集的材料可以批量进入下一次更新。

## 板块逻辑和维护入口

| 板块 | 页面规则 | 更新内容与入口 | 核对重点 |
| --- | --- | --- | --- |
| 顶部状态与立场 | 当前周时间、行情截止、内容更新时间分开；周内四档操作区间固定 | 周一开周制定 `weekly_plan`；日常只更新 `stance` 的条件状态与新证据 | 价格碰到区间不等于触发；不把期货/盘前价格当常规收盘 |
| 市场情绪 | 周一以上周五最后实际收盘为基准，结合周末消息；周二至五对照已存周一/周二；周五作结论 | `market_mood.baselines/current/conclusion` | 基准不回写；emoji 与一句归因是分析判断，须有证据与时间 |
| Dashboard 市场读数 | 第一行：情绪、NDX/QQQ、NDX 50/200 日均线、SPX；第二行：VIX/VXN、CNN、BofA、标普 CTA 卖出触发 | `market.bars` 追加 NDX/QQQ/SPX 常规收盘 OHLC；VIX/VXN 写有日期的观察；其他指标只在新报告出现时更新 | 来源与美股交易日期；均线由完整日线计算，不能手填偏离；历史折线按真实频率，hover 显示日期读数；缺值保留空白 |
| CTA | 只展示机构模型的标普卖出**触发点**，不是仓位敞口或实际卖盘 | `market.sentiment.CTA` 与历史观测 | 标明 SPX 现货或 ES 合约、机构、模型、报告日、来源及二手转述；不同合约点位不可混用 |
| 本周事件驱动 | 最多 4 项，本周权重合计 100%；已落地/未落地各带时间；左侧列表不填高亮底色 | `event_drivers` 同一 ID 更新结果；`event_details` 最多两项 | 百分比是本周叙事关注度估计，并非概率；未发生事件不可提前记结果 |
| 五维状态 | 盈利、宏观、趋势、估值、仓位权重独立合计 100%；3 星重点卡彩色底白字 | `dimensions` 五项及 `importance.dimensions` | 与上周固定权重比较；变化方向、证据和来源分开；星级与百分比独立 |
| 叙事变化与验证 | 左侧问题清单固定、可点击定位；仅右侧选中卡有外框。右侧最新在左、最多 6 条，末端停住 | `questions_upsert`、`answers_append`、`importance.questions/answers` | 新回答按 `question_id` 关联；旧回答不覆盖，新周继承原 ID/日期，历史归档不改 |
| 操作区间与主图 | NDX/QQQ 价格、50/200 日均线、ATR 和条件区间分开 | 周一开周才重算 `weekly_plan`；市场 bars 日常追加 | 图表数据截至实际收盘；周内区间固定，突发风险另做失效检查 |
| X 观点与标的影响 | 同话题归入一张卡，最新话题在左；可滑动，桌面 3 张半，最多 10 张，末端不循环 | Muse 重点交接 `x_topics_upsert`；更新任务核验后写入数据工具 | 原帖与推断分开；真实头像及核验来源；热度附观察时间和来源，缺失用 null；不把热度等同重要性 |
| 共用事件日历 | 切换历史周时跳到该周；两周一页、可前后翻；3 星高饱和底白字 | 唯一 `calendar_upsert`，不按周复制 | 北京时间与美东交易日期分开；实际结果必须有原始结果来源，市场反应明确时段 |
| 资料来源与历史周 | 归档保留原时间、证据和当期判断 | 发现错漏追加有日期的更正；周六确认最终收盘后冻结并开新周 | 不能把后来才知道的结果倒填成当时预测；不能清空未回答的问题 |

重要性满分 3 星，支持半星。顶部行情不显示星级；普通卡白底，重点的五维、右侧验证和日历卡按既定颜色突出。正文纯黑 regular，关键数字及判断用 bold。图表不显示横竖坐标，悬停提示放在图下并有竖向参考线。

## Muse AI 的交接文件

`muse-feed.json` 是短小的待核验材料，不是整周快照，也不改页面模板。每批写新 `batch_id`（例如 `muse:2026-11-02:16`）、当前 `week_id`、生成时间和来源；用原 `topic id` 追加同话题帖子，用稳定 `post id` 防重复。不要删除别人的话题，不复制整段旧文章。结构：

```json
{
  "schema_version": 1,
  "batch_id": "muse:2026-11-02:16",
  "week_id": "2026-11-02",
  "generated_at": "2026-11-02T08:00:00Z",
  "x_topics_upsert": [{
    "id": "agent-economics",
    "title": "Agent需求与服务成本",
    "summary": "应用效果与单位经济性，需要同时检验。",
    "posts": [{
      "id": "stable-post-id",
      "author": "@account",
      "published_at": "2026-11-02T07:30:00Z",
      "quote": "short original excerpt",
      "viewpoint": "对原帖的准确中文概述。",
      "views": null,
      "reposts": null,
      "replies": null,
      "observed_at": "2026-11-02T08:00:00Z",
      "source_url": "https://x.com/account/status/123",
      "metrics_source": "https://x.com/account/status/123",
      "verification": "原帖及计数的核验情况",
      "avatar_url": null,
      "avatar_source": null,
      "impact": [{"targets":"NDX / QQQ","direction":"分化","reason":"与原帖分开的分析推断及下一验证点。"}]
    }]
  }],
  "market_bars": {"NDX": [], "QQQ": [], "SPX": []},
  "volatility_readings": []
}
```

`market_bars` 的每条格式为 `{date:"YYYY-MM-DD",c:收盘,o:开盘,h:最高,l:最低,source_url:"https://..."}`，三种标的必须是**同一交易日期的完整常规时段收盘**，否则不提交新日。`volatility_readings` 的格式为 `{date:"YYYY-MM-DD",vix:{value,source_url},vxn:{value,source_url}}`，读取 Cboe 对应日期官方收盘；不根据图形估值。均线偏离由渲染代码从连续交易日收盘计算，不写在交接文件中。单独缺失的 VIX/VXN 留待下次，不能用旧日读数冒充今日。若源有修订，写一条带日期的更正说明，不静默改历史。

Muse 的流程：每两小时监控 X → 合并同话题 → 仅保留可溯源的新帖或热度变化 → 附时间和链接提交 `muse-feed.json`；完整美股收盘后补三指数与 VIX/VXN 读数。提交不会直接改线上内容。更新任务先读取这一小文件，按原帖、行情、交易日再次核验；新帖映射 `x_topics_upsert`，价格映射 `market.bars`，VIX/VXN 映射 `market.sentiment` 和 `market.sentiment_history`，再以一次 `dashboard_apply_daily_update` 写入。Muse 的分析观点不应自动提升为站点已确认的行情或政策结论。

## 每日发布与复核

1. 北京时间 10:00、16:00、22:00 的任务调用 `dashboard_update_context` 一次，读到 revision、当前周与增量摘要，再读取 `muse-feed.json` 的最新 `batch_id`。只查证自上次更新以来的材料。详见 [DAILY_UPDATE.md](DAILY_UPDATE.md)。
2. 将通过核验的材料连同其他新增证据一次写入 `dashboard_apply_daily_update`，使用 `expected_revision` 和稳定 `run_id`。未核验或同日冲突的读数跳过并报告，不以 GitHub 文件覆盖线上事实。写后再次读 revision 和数量。
3. revision 真正增加才更新 GitHub 的 `data-revision.json`。Actions 使用已确认渲染器从 `/api/export` 重新生成静态页；10:35、16:35、22:35 及后一小时有补偿同步。Actions 成功和 Pages build 完成后才称已发布。
4. 抽查正式页：当前周/历史周切换、数据截止日期、两个月折线与均线、X 头像与来源、左侧白底黑字、日历北京时间。异常时保留上一版，不发空值或错误页面。

内容日更不要运行 `build_history.py`、手改 `_site/`、重压缩渲染器或重建整个历史。只有页面逻辑经过用户确认才用 Sites 源重新生成 `approved/renderer.mjs.gz` 并发布。仓库维护者不需要用户电脑或浏览器在线。
