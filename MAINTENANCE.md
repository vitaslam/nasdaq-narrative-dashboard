# 美股叙事跟踪｜页面逻辑与协作维护

正式页面：<https://vitaslam.github.io/nasdaq-narrative-dashboard/>  
内容与版式迭代：<https://nasdaq-narrative-tracker-vj.thatvitaslam.chatgpt.site/>

## 两个站点与一条数据主线

GPT 站点的 `/api/export` 是主体内容主源，提供 `revision`、`active_week`、各周记录与共用日历。Muse 在 `muse-feed.json` 主责 X 的「高频板块」和 NDX/QQQ/SPX、VIX/VXN、CNN、BofA、CTA 最新读数；GPT 主责「高热度话题」的选题、核验与补充。GitHub Actions 先拉 export，再按下述归属合并 feed，用仓库 `approved/renderer-parts.json` 指定、校验后重组的用户确认渲染器生成静态页面。清单的可选 `update` 记录公开文本补丁，构建同时校验补丁应用后的渲染器 SHA-256。仓库根目录生成的 HTML、`weeks/`、`api/`、CSS/JS 是**产物**，不可手改；下次同步会覆盖。`approved/snapshot.json` 只是发布时的备份，日常不作为最新数据源。

页面改版先在 GPT 站点验证；用户确认后才更换 GitHub 的渲染器。主体内容更新由数据工具写回 GPT 站点，再让 `data-revision.json` 触发 GitHub 同步；Muse 提交 `muse-feed.json` 也直接触发**同一条**构建发布管线。`/api/export` 是只读的主体数据，不包含构建期 Muse 合并结果；正式发布的合并数据可用 GitHub Pages 的 `/api/export.json` 核对。动手前先读根目录 `PUBLISH_LOG.md` 最新记录。

Muse 的合法 feed 在构建时直接合并对应周的高频 X 与读数，不等待 GPT 三轮人工吸收。Muse 自行核验原帖、热度、官方交易日与行情来源；我方对 X 可补充不同 topic/post ID，或沿用 Muse topic ID 追加不同 post ID。合并按 ID 增改、保留另一方未列出的帖子；同 ID 的 X 字段以 Muse 为准。OHLC 和 VIX/VXN 按日期合并，同日 Muse 提供的字段优先；CNN、BofA、CTA 按报告日期更新，Muse 同日或更新报告优先，旧报告不能回滚；其他字段全部以 export 为准。文件缺失或结构不合法时告警并保留上一批已验证 feed，不能让正常主体发布失败。

## 双方写入锁

Muse 和 GPT 开始**任何数据写入**（包括 `muse-feed.json`、GPT 站点的日常数据、`data-revision.json`）前，先读取本仓库的 `PUBLISH_LOCK.json` 与 `PUBLISH_LOG.md`。空锁或 `expires_at` 已过期才能抢锁：通过 GitHub `update_file` 带当前 `content_sha` 原子写入 `holder`（`Muse` 或 `GPT`）、随机唯一 `token`、`purpose`、`acquired_at`、`expires_at`（默认 45 分钟后）；写入后重新读取，确认 token 仍属于自己，**再**编辑和发布。若锁由对方持有且未过期，等待并重试，不能先写后补锁。两个代理同时抢同一个 `content_sha` 时只有一个能成功，失败方重新读取。超过 45 分钟的工作须在到期前带最新 `content_sha` 续租；过期接管前检查对方最近的提交和发布日志，避免抢走仍在进行的构建。完成或失败后用当前 `content_sha` 清空 holder/token/purpose/时间，确认 token 没被他人接管；不要释放别人的锁。生成静态页的 GitHub Actions 通过 `concurrency` 串行运行，只读原子提交的完整数据，不替代理拿写锁。若 GitHub 锁接口不可用，就暂停写入并说明阻塞。

## 板块逻辑和维护入口

| 板块 | 页面规则 | 更新内容与入口 | 核对重点 |
| --- | --- | --- | --- |
| 顶部状态与立场 | 顶部时间轴的周卡 hover 显示该周情绪、依据和 QQQ 周收盘浮卡；仪表盘情绪格可展开逐日记录，进行中的周含本周与前一周，归档只含该周已收盘的交易日。当前周状态条突出北京时间今天的月日与星期，下一行保留周范围、行情截止与内容更新时间；历史周状态条维持原日期。时间轴的第一行显示情绪 emoji 与周日期，第二行仅显示 QQQ 最后收盘读数（不重复小日期）；未选周卡白底淡边，左右箭头每次移动时间轴可视宽度的 50%，周卡点击才切换内容。仅在选中卡中心进入可视区域两侧各 30% 时自动平移，其他点选保留时间轴位置；状态条右侧的左右按钮切换整周页面。时间轴当前可见周在后台预取页面；切周保留旧内容至新周就绪，再用约 190ms 的双页面淡入淡出完成替换；可匹配卡片按身份和新旧坐标短距离滑动，无对应卡片淡出或淡入；失败则回退直接加载；并按原阅读板块的标题在屏幕上的精确 Y 坐标对齐新周同名标题；周 iframe 的加载路径须解析为绝对 URL 后对比，兼容 GitHub Pages 仓库子目录（例如在 X 区切周仍对齐 X 标题）；各周状态条等高且右侧按钮位置一致；周内四档操作区间固定 | 周一开周制定 `weekly_plan`；日常只更新 `stance` 的条件状态与新证据 | 价格碰到区间不等于触发；不把期货/盘前价格当常规收盘 |
| 市场情绪 | 周一以上周五最后实际收盘为基准，结合周末消息；周二至五对照已存周一/周二；周五作结论。卡片按偏多/观望/偏悲观着色，点击打开逐日情绪浮层，标明星期，进行中的周以“上周交易日”留白分组，历史周只显示该周实际交易日；每日至少一项有来源的事件归因或量化解释，点击单日切换所属周 | `market_mood.baselines/current/conclusion`；早期没有实时情绪记录的 9 月周按当期归档证据在 `data/mood-retrospective.json` 标明回溯判断 | 基准不回写；emoji 与一句归因是分析判断，须有证据与时间；QQQ 使用该周最后交易日收盘，不把回溯判断伪装成当日保存记录 |
| Dashboard 市场读数 | 第一行：情绪、NDX/QQQ、NDX 50/200 日均线、SPX 与 CTA 合并且 CTA 只占一行、走势在右侧；第二行：VIX/VXN、CNN、BofA、10Y/30Y 美债与布伦特原油。VIX 卡在 VXN 下加一行 VX1、VX2、Contango，不改卡片尺寸；最后一张卡左栏为 10Y 主读数与 30Y 小读数，右栏为 Brent 主读数，美元/桶在数字下方 | Muse 在 feed 提供 NDX/QQQ/SPX 常规收盘 OHLC、VIX/VXN，以及 `market_indicators` 的 CNN、BofA、CTA、UST10Y、UST30Y、Brent、FedHike、VXFutures；GPT 不日常更新这些读数 | Nasdaq 官方、WSJ 与 CBOE 对照、CBOE 官方 CSV；VX1/VX2 取同一天的前两个月度 VX 期货结算（排除周度合约），Contango = (VX2 / VX1 − 1) × 100%，负值为倒挂，页面标明观察日。CNN/BofA 必须保留原报告或明确次级归档及日期；均线与 ATR 从日线重算。卡片内的小走势图不显示“周频归档／周频报告”标签，利率能源卡不显示 CTA 缺样本提示；保持原卡片尺寸，仅 30Y >5.2% 或 Brent >$100 的数值标红 |
| CTA | 只展示机构模型的标普卖出**触发点**，不是仓位敞口或实际卖盘 | Muse 的 `market_indicators.CTA`，合并至 `snapshot.sentiment.CTA` 与历史观测；GPT 不日常维护 | 标明 SPX 现货或 ES 合约、机构、模型、报告日、来源及二手转述；不同合约点位不可混用 |
| 本周事件驱动 | 最多 4 项，本周权重合计 100%；已落地/未落地各带时间；左侧列表不填高亮底色 | `event_drivers` 同一 ID 更新结果；`event_details` 最多两项 | 百分比是本周叙事关注度估计，并非概率；未发生事件不可提前记结果 |
| 五维状态 | 盈利、宏观、趋势、估值、仓位权重独立合计 100%；3 星重点卡彩色底白字 | `dimensions` 五项及 `importance.dimensions` | 与上周固定权重比较；变化方向、证据和来源分开；星级与百分比独立 |
| 叙事变化与验证 | 左侧问题清单固定、可点击定位；仅右侧选中卡有外框。右侧最新在左、最多 6 条，末端停住 | `questions_upsert`、`answers_append`、`importance.questions/answers` | 新回答按 `question_id` 关联；旧回答不覆盖，新周继承原 ID/日期，历史归档不改 |
| 操作区间与主图 | NDX/QQQ 价格可选 1、3、6、12 个月，日 K 用红涨绿跌显示 OHLC，50/200 日均线继续用折线叠加；ATR 和条件区间分开 | 周一开周才重算 `weekly_plan`；市场 bars 日常追加 | 图表数据截至实际收盘；周内区间固定，突发风险另做失效检查 |
| X 高热度话题 | 独占上排，**每条帖子一张卡**，话题只作标题，不把不同博主放进同一卡；最新在前，三列瀑布流自动接到最短列，无翻页且不截取合格帖子；单帖达门槛自动从高频移入，不重复显示 | GPT 主责选题与补充；Muse 的帖子达到门槛也由渲染器自动归入此排 | 门槛为单帖 ≥100 万浏览，或 ≥1000 转发/评论；依据已核验快照，不以话题合计冒充单帖热度 |
| X 高频板块 | 独占下排，无卡片或帖子数量上限；@labubu_trader 作者卡长期置顶第一位，换周和增量发布后仍置顶。按小写 @账号归组，卡内帖子按时间倒序；卡片按最短列接续形成瀑布流，不按最长卡片撑出空白行 | Muse 主责经 `muse-feed.json` 累计提交；GPT 可以补充不重复的原帖 | 账号头像与名称放卡片顶部，每条帖子各自显示发布时间、原帖链接和原文中译；只列有证据的利好标的，没有就省略整行；热度只展示一项已记录指标，不推造数字；长帖可展开阅读全文 |
| 共用事件日历 | 切换历史周时跳到该周；两周一页、可前后翻；3 星及市值超过 5000 亿美元的公司财报高饱和底白字；点击事件后在同周周六、周日两格上方覆盖详情卡，不点仍显示日期；财报小卡只列总营收与 EPS 的预期/实际、一句业务看点和一个业绩表情；完整分项、指引、分时行情与叙事在右侧展开 | 唯一 `calendar_upsert`，不按周复制；财报市值名单随新公司过线核对 | 北京时间与美东交易日期分开；实际结果必须有原始结果来源，市场反应明确时段 |
| 资料来源与历史周 | 归档保留原时间、证据和当期判断 | 发现错漏追加有日期的更正；周六确认最终收盘后冻结并开新周 | 不能把后来才知道的结果倒填成当时预测；不能清空未回答的问题 |

重要性满分 3 星，支持半星。顶部行情不显示星级；普通卡白底，重点五维用类别色，右侧叙事验证卡用淡奶油色深字，日历重点卡用类别色白字。正文纯黑 regular，关键数字及判断用 bold。图表不显示横竖坐标，悬停提示放在图下并有竖向参考线。

## Muse AI 的交接文件

### 本轮改动小黄点与关键财报

页面卡片和日历事件右上角的小黄点表示该更新者**最近一轮实际改写的显示内容**，与星级、涨跌颜色无关。公开数据中的 `change_markers` 按贡献者分为 `GPT:{revision,at,keys}` 和 `Muse:{batch_id,at,keys}`；键名包括 `calendar:<事件id>`、`mood`、`dimension:<id>`、`question:<id>`、`answer:<id>`、`x:<post id>`、`x-author:@账号`、`trend:<趋势id>`、`metric:<NDX|QQQ|SPX|VIX|VXN|CNN|BofA|CTA|UST10Y|UST30Y|Brent|VXFutures>`、`events`、`strategy`。同一张卡被两方改动时可有两个小黄点。

GPT 通过站点 `dashboard_apply_daily_update` 按 patch 自动生成并替换自己的键集合；Muse **不要改 GPT 的集合**。Muse 仍提交现有 `muse-feed.json` 累计数据并用新的 `batch_id`；构建时将本批合并结果与上次发布的可见数据比较，产生新 `Muse` 键集合，只替换旧 Muse 点，不清除 GPT 点。相同批次的重建沿用现有 Muse 点；新批次即使没有可见变化，也应清空旧 Muse 点。不要往累计 feed 塞整站黄点或手工删除另一个代理的标记。检查 `/api/export.json` 的 `change_markers` 与页面卡片，确保来源归属正确。

关键财报当日由 GPT 立即完善共用日历；具体 `earnings_metrics` 逐项预期/实际、`guidance`、`reaction_phases` 按盘后/夜盘/盘前的出处与时间分别写，`narrative_impact` 先作有条件的即时分析，不留空白。Muse 的行情 feed 更新只负责其价格/指标与 X，不应覆盖 GPT 的日历解释。10 月按交易日补齐的情绪为回溯判断，不能冒称当时实时保存。

X 高频板块顶部有「趋势捕捉」。趋势卡单行等分，每页最多四张，超出可翻页。点选趋势后，页面按 `evidence_post_ids` 给每条对应的帖子添加底色。即使同一作者有多帖，也须分别填写对应的稳定 post ID。Muse 每次抓帖后复核本周**累计**原帖，寻找至少两位不同作者的独立帖子所支持的共同驱动（例如企业发债、电力与并网瓶颈）。通过 `weekly_trends` 累计提交最多 8 条，沿用稳定趋势 ID 并更新 `asof`、依据帖子 ID、简短结论、反例/不确定性与 `benefit_tags`。标签可写利好标的、行业或大盘，但要写清是潜在受益及所需条件；发债本身不自动利好，供电紧张也可能压制云厂商。避免把同一转载/同一消息源的多帖当成独立证据。趋势随帖子修正，周内 `tracking`，周末最终收盘核验后 `final`；历史周固定，不因新消息改写旧周判断。Muse 新批只改自己的趋势与 Muse 黄点；GPT 对初始趋势的黄点仍按 GPT 下一次更新清除。日历中的 `result_emoji` 表示业绩相对预期，`reaction_emoji` 表示观察到的价格反应，二者分开且须与数据一致。

`muse-feed.json` 是**本周累计版**，不是整周主体快照，也不改页面模板。高频的帖子与话题不设数量上限；按稳定 post ID 去重，不能靠截断凑上限。每批写新 `batch_id`（例如 `muse:2026-11-02:20`）、当前 `week_id`、生成时间和来源；**每次带上本周已提交的全部 Muse 话题与帖子，只增改不删减；新周换新文件**。同话题沿用原 topic ID，帖子用稳定 post ID 去重。仅保留内容和行情约束：quote ≤25 词，bars 与波动率各 ≤5 个交易日。高热度合格帖子与高频 feed 都不设数量上限。不删除 GPT 补充的话题或帖子。结构：

```json
{
  "schema_version": 1,
  "batch_id": "muse:2026-11-02:16",
  "week_id": "2026-11-02",
  "generated_at": "2026-11-02T08:00:00Z",
  "weekly_trends": [{"id":"ai-power-bottleneck","title":"AI 电力交付约束","summary":"多位作者指向并网与设备交付瓶颈；周内持续核验。","status":"tracking","asof":"2026-11-03T08:00:00Z","evidence_post_ids":["stable-post-id-1","stable-post-id-2"],"caveat":"项目许可与订单兑现仍待核验。","benefit_tags":["潜在利好：电力设备","潜在利好：燃料电池"]}],
  "x_topics_upsert": [{
    "id": "agent-economics",
    "title": "Agent需求与服务成本",
    "summary": "应用效果与单位经济性，需要同时检验。",
    "posts": [{
      "id": "stable-post-id",
      "author": "@account",
      "published_at": "2026-11-02T07:30:00Z",
      "quote": "short original excerpt",
      "viewpoint": "旧字段兼容；内部记录，不在卡面显示。",
      "translation_zh": "能核到完整原帖时逐句译出全部正文；不得把短引译文充当全文。",
      "translation_scope": "full",
      "translation_source_url": "https://x.com/account/status/123",
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
  "volatility_readings": [],
  "market_indicators": {"CNN": {"value": 26, "asof": "2026-10-30", "source_url": "https://..."}, "BofA": {"value": 7.1, "asof": "2026-10-30", "source_url": "https://..."}, "CTA": {"value": 7606, "asof": "2026-10-30", "data_kind": "sell_trigger", "scope": "ESZ6 futures", "institution": "BofA", "model": "机构模型名称", "source_url": "https://..."}, "UST10Y": {"value": 4.94, "asof": "2026-10-30", "source_url": "https://home.treasury.gov/..."}, "UST30Y": {"value": 5.31, "asof": "2026-10-30", "source_url": "https://home.treasury.gov/..."}, "Brent": {"value": 115.28, "asof": "2026-10-29", "source_url": "https://www.eia.gov/..."}, "FedHike": {"value": 72.4, "meeting": "2026-12-09", "asof": "2026-11-02", "source_url": "https://polymarket.com/event/...", "method": "25bp 与 50bp 以上加息结果概率求和"}, "VXFutures": {"vx1": 20.3603, "vx2": 19.7888, "asof": "2026-10-30", "front_expiry": "2026-11-18", "second_expiry": "2026-12-16", "source_url": "https://www.cboe.com/markets/us/futures/market-statistics/settlement/futures/daily"}}
}
```

`market_indicators` 可省略未取得新报告的键，不能用旧日报告假装今日读数。CNN 为 0–100、BofA 为 0–10，均需 `value`、报告/观察日 `asof`、`source_url`，可带 `prior/prior_asof`、`source_label`。CTA 只接受标普 500 的机构模型**卖出触发点**：`value`、`asof`、`data_kind:"sell_trigger"`、`scope`（明确 SPX 现货或 ES 合约及月份）、`institution`、`model`、`source_url` 必填；可附 `report_date`、`summary`、`confidence_note`、`unit`、`digits`。只有仓位预估而没有卖出点位时不提交 CTA；机构原报告和二手转述须在内部证据中分清。feed 合并到 `snapshot.sentiment`、`snapshot.asof_metrics` 和对应 `indicator_history`；旧日期不覆盖新日期。Muse 同时维护这三项及价格/波动读数；GPT 的 10/16/22 轮次不抓取也不写入 CNN、BofA、CTA，只在发现口径错误时协同更正。

`market_indicators.VXFutures` 用 Cboe 同一交易日的前两个月度 VX 期货结算，写 `vx1/vx2/asof/front_expiry/second_expiry/source_url`；不拿每周到期合约冒充 VX1。只在双合约都核验后提交，页面按 `(vx2 / vx1 - 1) × 100%` 计算并显示观察日（鼠标悬停或键盘聚焦可查看），负值意味着近月倒挂。旧日期不得覆盖新读数；GPT 已保存的 `snapshot.vix_monthly` 可供初始展示，Muse 新结算优先。期货结算与 VIX 现货不混写。

宏观与金融五维卡新增 Polymarket 会议加息概率。Muse 维护 `market_indicators.FedHike`：`meeting` 为实际会议日期，`value` 为该会议所有加息结果概率之和（25bp、50bp 以上等），`asof` 为读取日期，`source_url` 指向具体 Polymarket 事件，`method` 写明求和口径。当前关注 2026 年 12 月，随后随市场关注焦点更换 `meeting`，不得把单个 25bp 选项冒充全部加息概率。预测市场读数会变，必须显示读取日期，不作为联储官方预测。Muse 也接管 `UST10Y`、`UST30Y`、`Brent`，三项均需 `value/asof/source_url`；美债来自美国财政部每日收益率曲线，布伦特现货来自 EIA，不能以盘中期货混写。初次页面临时核验读数分别为 10/30 的 4.94%/5.31%、10/29 的 $115.28，Muse 新读数按日期覆盖。超过阈值只提示风险，不自动更改周度计划。\n\n`market_bars` 的每条格式为 `{date:"YYYY-MM-DD",c:收盘,o:开盘,h:最高,l:最低,source_url:"https://..."}`，三种标的必须是**同一交易日期的完整常规时段收盘**，否则不提交新日。`volatility_readings` 的格式为 `{date:"YYYY-MM-DD",vix:{value,source_url},vxn:{value,source_url}}`，读取 Cboe 对应日期官方收盘；不根据图形估值。均线偏离由渲染代码从连续交易日收盘计算，不写在交接文件中。单独缺失的 VIX/VXN 留待下次，不能用旧日读数冒充今日。若源有修订，写一条带日期的更正说明，不静默改历史。

11/03 对账记录：11/02 的 QQQ 图表末笔为 681.92，Nasdaq 历史日线收盘为 681.09（10/30 为 690.49）。情绪浮层按日线计算，Muse 下一批请用历史日线核对当日 OHLC 并补回累计 feed。依据见 [Nasdaq 历史日线](https://api.nasdaq.com/api/quote/QQQ/historical?assetclass=etf&fromdate=2026-11-02&todate=2026-11-02&limit=1)。

Muse 的流程：约每两小时监控 X → 同一博主可有多个话题/帖子，沿用稳定账号和 post ID → 只保留可溯源的新帖或热度变化 → 连同本周累计版提交 `muse-feed.json`；完整美股收盘后补三指数与 VIX/VXN；CNN、BofA 和 CTA 有新报告或可核验触发线时再更新。**绝不因缺译文过滤原帖。** X 的帖子集合以发布的 `api/export.json` 中 `week.x_topics` 为准；每次以当轮合并后的帖子集合为准（Muse :25 累计 8 话题、9 帖；GPT 原帖保留），高热度与高频均为瀑布流且不限合格帖子数量。保持稳定 topic/post ID、作者、链接和原先记录，不因版式拆分重新选帖或改写原有观点。

翻译先取得并逐句核对**完整原帖正文**，再写 `translation_zh`、`translation_scope:"full"` 和 `translation_source_url`；完整译文要保留数字、条件、限定语、列表、引用上下文和原帖中的链接，不加入二次解读。若原帖指向长文，仅译帖文时标 `translation_scope:"post_only"`；只有 ≤25 词短引时标 `"excerpt"`，不得把节选说成全文。旧 :22 批次的 8 条 `translation_zh` 是短引或概括，**不是完整原帖译文**；Muse 下批应按原帖逐条补核，仍保留所有旧帖。对于尚未核到全文的旧帖，卡片明确标“原帖全文未核实”，显示已有 `viewpoint` 原样记录作为过渡，不声称它是逐字译文；缺译文不会导致帖子消失。新帖若无法取得原文，可留在待核记录，不用概括句冒充 `full`。卡面不显示 quote、核验文字、热度来源或影响原因，这些仍必须留在数据中供审核。头像必须是该账号的真实头像；无法核实时用无肖像的字母占位，不冒充真人。`impact` 只有明确的利好方向才进入“利好标的”，其他方向在卡面省略整行。一个帖只展示一种热度：优先 views，缺失则 reposts，再缺则 replies，三者都缺则“热度待核验”。

**旧帖译文补核清单（先核对最新累计 feed 是否已补）**：Muse 下一批逐条核 `2116828613777699280`、`2116949911241630157`、`2117200746869371285`、`2117058592662757865`、`2116950855718998288`、`2117197031844561129`、`2117198149999902803`、`2117205453373677917` 的原帖全文，保留所有原有字段和 post ID，再补 `translation_scope` 与逐句译文。GPT 自己继续核 `deepseek-superagent-20261101`（原帖指长文）和 `zero-power`（原帖指文章），不得把链接文章或短标题的概括写成原帖逐字译文。GPT 站点预览会读取 GitHub 已发布的合并 X 数据，临时网络失败时用最近一次已发布的 13 帖副本兜底；GitHub 静态构建只用当轮 export 与本仓库 feed，不回读旧页面。

**晋级/回流**：任何高频帖的已核验单帖 views ≥1,000,000，或 reposts/replies ≥1,000，发布时自动进入高热度排，原高频作者卡不再显示该帖；同一作者的其他未达标帖仍在高频排。达到门槛后的帖子即使以后热度源暂时缺失，必须保留已核验峰值或原始快照，不能因缺值回流。GPT 定期复核晋级话题，独立寻找其他有原帖、真实热度与译文的高热话题，经 GPT 站点的 `x_topics_upsert` 加入；不同帖子用不同 ID，同 ID 内容 Muse feed 仍优先。热度是传播量，不等于标的利好已获证实。

五维状态卡的详情在卡片下方按高度滑开和收回；切换详情时连续改变高度，尊重系统减少动态效果设置。

X 卡面正文超过 180 字时默认折叠为前五行，点击“展开全文”才显示全部内容；“收起”可还原。折叠只改变呈现，不截断或改写数据。上排一帖一张卡；下排才按博主合并，不因同一话题把不同作者合到一张卡。

每次提交自动触发 Pages 构建。构建先由 `check-muse-feed.mjs` 做结构校验，再在 `scripts/export-pages.mjs` 按周与 ID 合并，重算 NDX/QQQ 的 SMA20/50/100/200 和 Wilder ATR14；VIX/VXN 合并进日期平行数组与最新读数。错误帖子逐条告警且不阻断其他合法帖子；整份文件不合法时用上一批合法文件兜底。文件不能把 X 推断自动提升成主体立场或政策结论。Muse 对直接发布的 X 与读数负核验责任；尤其检查 ID 编码日期与 `published_at` 的年份是否一致。

## 每日发布与复核

1. GPT 的北京时间 10:00、16:00、22:00 任务调用 `dashboard_update_context`，更新主体内容；不再读取或人工吸收 Muse feed。任务前可看 `PUBLISH_LOG.md` 最新一行避免重复。详见 [DAILY_UPDATE.md](DAILY_UPDATE.md)。
2. GPT 内容 revision 增加才更新 `data-revision.json`；Muse feed 变更由 `pages.yml` 的 push paths 直接触发。双方共用 `scripts/export-pages.mjs` 拉取 export、合并 Muse feed、渲染、提交静态产物、请求 Pages build。无变化时比较 export revision、渲染器与 feed 内容 SHA-256 并跳过。
3. `release.json` 分开记录 `data_revision`（GPT export 原始号）、`release_revision`（合并发布序号）、`muse_feed_batch`、`muse_feed_sha256` 和实际 `built_at`。每次构建提交自动追加 `PUBLISH_LOG.md`；它记录构建提交，是否上线还要看 Pages build 状态。Muse 更新不伪增 GPT 的 `data_revision`。发布日志由管线代写，双方不用再手动重复追加。
4. 抽查正式页：当前周/历史周切换、截止日期、一月日 K 与 50/200 日均线、X 头像、译文与分排、左侧白底黑字、日历北京时间。正式合并数据看 GitHub Pages `/api/export.json`，GPT 站点 `/api/export` 只含主体数据。异常时保留上一版，不发空值或错误页面。

内容日更不要运行 `build_history.py`、手改 `_site/`、重压缩渲染器或重建整个历史。只有页面逻辑经过用户确认才用 Sites 源重新生成压缩渲染器，按 `approved/renderer-parts.json` 的清单分片并发布。仓库维护者不需要用户电脑或浏览器在线。
