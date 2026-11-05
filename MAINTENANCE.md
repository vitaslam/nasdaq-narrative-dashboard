# 美股叙事跟踪｜页面逻辑与协作维护

## 夜盘、盘前、盘后行情（2026-11-04）

每轮抓取所有可取得的最新报价；夜盘、盘前、盘中、盘后都更新卡面，标出报价原始时点（北京时间）、交易时段、来源及延迟状态。抓取时间不得代替成交/报价时点。冻结收盘快照不是新行情；抓不到新报价保留最近核验值与真实日期。

GPT 用 `market.quotes`，Muse 用 `market_quotes`，按 QQQ/NDX/SPX/VIX/VXN/UST10Y/UST30Y/Brent/ES/NQ 分键。每项 `{value,asof,session,instrument,price_basis,source_url,source_label,delayed?}`；asof 为带时区的完整时间戳；session 为 overnight/premarket/regular/afterhours；cash 用于 ETF/现金指数，benchmark_yield 用于美债基准券收益率，futures 用于期货并必填实际 `contract`（如 2027-01）。来源有延迟须 delayed=true。旧时间戳不能覆盖新报价；相同数据/仅检索时间变化不打新黄点。

最新 QQQ 报价作为主值，附常规收盘参考；200日偏离随最新价重算，50/200日均线、图表日线、周基准仍用完整常规收盘。现金 SPX/NDX/VIX 不存在夜盘新值时保留实际收盘；ES/NQ 另列实际合约，不冒充现货指数。美债实时基准券与财政部日度恒定期限读数注明不同口径。Brent 最新期货报价独立显示合约、时间与来源，并保留 EIA 现货参考；实时行情不受“EIA 超3天才允许日结算兜底”的限制，但不得写入现货历史。以下 Brent 兜底规则只管理日度参考序列。


## Brent 现货与 ICE 兜底（2026-11-04）

主口径为 EIA Brent 现货，先核对 EIA Daily Prices 的 Wholesale Spot Petroleum Prices（https://www.eia.gov/TodayinEnergy/prices.php），再查历史序列；历史序列滞后不代表 Daily Prices 没有新读数。以最新已完整收盘的美股交易日为参照，只有最新可核验 EIA 现货日期落后超过 3 个自然日时，允许 ICE 布伦特实际近月合约的日结算价兜底。不能把行情站末笔/收盘价或小时价格冒充 ICE 官方结算。

Muse `market_indicators.Brent` 可用 eia.gov；兜底时可用 ice.com，并必须填 `source_label:"ICE 期货结算 · EIA 现货滞后兜底"`、`price_basis:"ice_front_month_settlement"`、`contract`（实际合约月份/代码）、`eia_asof`（最新核验现货日期），另有 `value/asof/source_url`。校验器按 feed 最近共同收盘日验证 >3 天，合并还核对已保存的较新 EIA 日期，防止累计旧资料误触发。EIA 行可填 `source_label:"EIA 现货"`、`price_basis:"eia_spot"`。卡片明确显示 source_label。

EIA 恢复且观察日期更新时按 asof 覆盖回现货；同日 EIA 现货优先于 ICE 兜底。替换时清除旧兜底标签和元数据，现货和兜底不并排，兜底不写入现货历史曲线。GPT 同日核验优先仍适用于同口径数据，不阻止 EIA 现货替代 ICE 兜底。

2026-11-04 核验：EIA Daily Prices 已发布 11/02 现货 107.39，不能继续用 10/27=123.10 认定所有 EIA 数据未更新；当日最近美股收盘为 11/03，现货仅差一天，因此当前不触发 ICE 兜底。104.34 可见于行情站历史收盘表，尚未取得对应 ICE 合约官方结算证据；不要硬写该值。


## 每轮抓取与收盘全页核查（2026-11-04）

每天北京时间 10:00、16:00、22:00 都先获取新行情、指标、公告、事件结果和市场反应，再与已发布内容比较；不能只看旧缓存、只跑任务或只改日期。10:00 在美股最近完整收盘后执行全页面核查，覆盖 Dashboard（CTA 除外）、事件驱动、五维卡面与展开详情、叙事问题和回答、共享日历及详情、行情图与 GPT 主责 X 内容。16:00/22:00 同样查新读数和已发生事件，实时/盘后/盘前与常规收盘分清，未开市不伪造新收盘。

有证据的新变化才改内容；无变化保留原文、原观察日期和原黄点时间，不为“每天更新”硬写硬改。CNN 是日常变化的 0–100 恐惧与贪婪指数，不能按周频停在旧读数；先查 CNN，官方不可取时主动交叉核对至少两个有日期的可靠归档并标明二手来源。美债查美国财政部最新交易日的 10Y/30Y；Brent 核对合约、结算/现货口径与日期，不把旧 EIA 现货和新期货结算混作连续读数。新读数同步到卡片、曲线、相关解释和来源。无新报告与未能取到数据必须区分。

叙事验证和日历每轮联动核查：财报/宏观结果已公布、后续交易时段已经结束时，检查旧“尚未发生/待收盘”描述；有新证据追加回答并更新关联问题状态，旧回答作为带日期历史记录保留；日历用同一事件 ID 更新结果、市场反应、叙事和展开详情。结果简报列明实际变化、已查无变化与缺失/失败，不能把部分成功称为全页完成。

## 小黄点按三小时保留（2026-11-04）

每个贡献者、每个键独立保存最近实质变动的 `key_times[key]`（ISO 时间）；`keys` 保持可展示键列表，`at` 仅是该贡献者最近一次处理时间。下一次该贡献者更新时，只清理距对应键变动已满三小时的旧点；不足三小时继续保留。同一内容再次实质变化才重置该键时间。无变化检查、相同 patch、新抓取批次但无实质变化都不能重置时钟；新批次不再整体清空旧点。页面打开、刷新及相同批次重建不触发到时消失。

GPT 和 Muse 只清理自己的到期点，互不覆盖，趋势黄点仍归 Muse。旧结构没有 key_times 时沿用原 at 迁移。小黄点覆盖行情与派生均线、事件/五维卡面与详情、问题/回答、日历卡片与详情、X 帖子和趋势；指向小黄点可见最近变化时间。黄点表示实际变化，不表示“查过”。日常写入自动比较前后内容，只给实际变化的对象打点；仅日期检查或 note 不制造新点。


## X 每周承接窗口（2026-11-04）

每个周一的新周，X 高热度和高频板块只承接上周五、周六、周日的原帖，按 `published_at` 转为 America/New_York 日期判断；边界为上周五 00:00（含）至本周一 00:00（不含）。不因观察时间、抓取时间或热度更新而把上周一至周四的旧帖带入。固定按星期五处理，遇休市也不自动扩到星期四。

新周内继续累计本周一至周日的新帖，按稳定 post ID 去重，不滚动淘汰本周早些时候的帖子。`dashboard_open_week` 自动筛选可承接原帖；Muse 在新周更换 `week_id` 和累计 feed，包含合格的周五/周末承接帖及本周新帖。新周提前于周六建立时，后续周末原帖直接补入新周。构建期再次过滤窗口以防累计旧 feed 把早期帖子加回来。上周历史记录原样保留，归档周不再接收 feed 改写。

趋势内容继续由 Muse 维护：新周根据这个窗口内的原帖重新确认，不把上周整套趋势结论或 final 状态直接当成本周结论。必须仍有至少两位作者的独立合格帖子支持；趋势排序和每页四张的翻页规则保持。@labubu_trader 仅在有帖的单日内优先排列，Polymarket 仍只进高频作者卡，GPT/Muse 黄点归属不变。


正式页面：<https://vitaslam.github.io/nasdaq-narrative-dashboard/>  
内容与版式迭代：<https://nasdaq-narrative-tracker-vj.thatvitaslam.chatgpt.site/>

## 每轮主动核查范围（2026-11-04）

GPT 每轮主动核查整个顶部 Dashboard，只有 CTA 继续由 Muse 独立维护。包括市场情绪及逐日归因、NDX/QQQ/SPX 收盘和涨跌、50/200 日均线与偏离、VIX/VXN、VX1/VX2/Contango、CNN、BofA、10Y/30Y 美债、Brent。不能因为 Muse 也提供行情就跳过。使用独立来源核验后通过 `market` 更新；均线和图表从连续日线计算。CNN/BofA 按最新可核验报告频率；没有新报告保留观察日期，检查时间不得冒充数据日期。所有时间注明时区，盘后/夜盘/盘前与常规收盘分开。

「本周事件驱动」和 earnings/macro/trend/valuation/position 五维，每张卡面和展开详情都必须逐项检查。同步核对读数、观察日期、状态、比较基准、叙事权重、星级、事实、来源、图表说明、市场反应及后续验证条件。事件已落地就及时补结果和实际反应；部分财报已发布时分清已发布与仍待公布，不能整个事件继续笼统写“待落地”。行情已更新时，同时核对头部摘要与立场的时态，不能仍写“尚未开盘”。维度资料未发布或无同口径数据时保留真实日期/待核验，不能为了更新而编数字或只改日期。卡面和详情必须描述同一观察期，同一数字一致。每轮在 note/结果简报注明已覆盖 Dashboard（CTA 除外）、事件驱动及五维卡面与详情；有缺项明确指出，不把只更新日历称为整轮完成。

只提交实际变化，保留周内固定点位、历史归档和已保存基准。GPT 仅累计自己的新变化黄点并清理满三小时的旧点，Muse 黄点保持；趋势内容与趋势黄点仍由 Muse 独立维护。`market` 写入会自动记录 `snapshot.gpt_verified_market`：同交易日/报告日已由 GPT 核验的行情不会被 Muse 累计旧值覆盖，Muse 的更新日期读数仍可补充；CTA 不受此保护规则影响。

## 两个站点与一条数据主线

GPT 站点的 `/api/export` 是主体内容主源，提供 `revision`、`active_week`、各周记录与共用日历。Muse 在 `muse-feed.json` 主责 X 的「高频板块」、趋势捕捉和 CTA；GPT 主责其余 Dashboard 读数、全部事件与五维卡面/详情，以及「高热度话题」的选题、核验与补充。GitHub Actions 先拉 export，再按下述归属合并 feed，用仓库 `approved/renderer-parts.json` 指定、校验后重组的用户确认渲染器生成静态页面。清单的 `update` 按顺序列出公开文本补丁，构建校验每一步重建后的渲染器 SHA-256。仓库根目录生成的 HTML、`weeks/`、`api/`、CSS/JS 是**产物**，不可手改；下次同步会覆盖。`approved/snapshot.json` 只是发布时的备份，日常不作为最新数据源。

页面改版先在 GPT 站点验证；用户确认后才更换 GitHub 的渲染器。主体内容更新由数据工具写回 GPT 站点，再让 `data-revision.json` 触发 GitHub 同步；Muse 提交 `muse-feed.json` 也直接触发**同一条**构建发布管线。`/api/export` 是只读的主体数据，不包含构建期 Muse 合并结果；正式发布的合并数据可用 GitHub Pages 的 `/api/export.json` 核对。动手前先读根目录 `PUBLISH_LOG.md` 最新记录。

Muse 的合法 feed 在构建时直接合并对应周的高频 X 与读数，不等待 GPT 三轮人工吸收。Muse 自行核验原帖、热度、官方交易日与行情来源；我方对 X 可补充不同 topic/post ID，或沿用 Muse topic ID 追加不同 post ID。合并按 ID 增改、保留另一方未列出的帖子；同 ID 的 X 字段以 Muse 为准。OHLC 和 VIX/VXN 按日期合并；GPT 日更写入的交易日/报告日由 `snapshot.gpt_verified_market` 自动记录，同日 GPT 核验值优先，Muse 累计旧值不能回滚。Muse 尚未由 GPT 核验的读数与更新日期读数继续补充。CNN、BofA、利率、Brent、FedHike、VXFutures 同理按观察/报告日更新；CTA 始终由 Muse 维护，Muse 同日或更新报告优先。旧报告不能回滚；其他字段全部以 export 为准。文件缺失或结构不合法时告警并保留上一批已验证 feed，不能让正常主体发布失败。

## 双方写入锁

Muse 和 GPT 开始**任何数据写入**（包括 `muse-feed.json`、GPT 站点的日常数据、`data-revision.json`）前，先读取本仓库的 `PUBLISH_LOCK.json` 与 `PUBLISH_LOG.md`。空锁或 `expires_at` 已过期才能抢锁：通过 GitHub `update_file` 带当前 `content_sha` 原子写入 `holder`（`Muse` 或 `GPT`）、随机唯一 `token`、`purpose`、`acquired_at`、`expires_at`（默认 45 分钟后）；写入后重新读取，确认 token 仍属于自己，**再**编辑和发布。若锁由对方持有且未过期，等待并重试，不能先写后补锁。两个代理同时抢同一个 `content_sha` 时只有一个能成功，失败方重新读取。超过 45 分钟的工作须在到期前带最新 `content_sha` 续租；过期接管前检查对方最近的提交和发布日志，避免抢走仍在进行的构建。完成或失败后用当前 `content_sha` 清空 holder/token/purpose/时间，确认 token 没被他人接管；不要释放别人的锁。生成静态页的 GitHub Actions 通过 `concurrency` 串行运行，只读原子提交的完整数据，不替代理拿写锁。若 GitHub 锁接口不可用，就暂停写入并说明阻塞。

## 板块逻辑和维护入口

| 板块 | 页面规则 | 更新内容与入口 | 核对重点 |
| --- | --- | --- | --- |
| 顶部状态与立场 | 顶部时间轴的周卡 hover 显示该周情绪、依据和 QQQ 周收盘浮卡；仪表盘情绪格可展开逐日记录，进行中的周含本周与前一周，归档只含该周已收盘的交易日。当前周状态条突出北京时间今天的月日与星期，下一行保留周范围、行情截止与内容更新时间；历史周状态条维持原日期。时间轴的第一行显示情绪 emoji 与周日期，第二行仅显示 QQQ 最后收盘读数（不重复小日期）；未选周卡白底淡边，左右箭头每次移动时间轴可视宽度的 50%，周卡点击才切换内容。仅在选中卡中心进入可视区域两侧各 30% 时自动平移，其他点选保留时间轴位置；状态条右侧的左右按钮切换整周页面。时间轴当前可见周在后台预取页面；切周保留旧内容至新周就绪，再用约 190ms 的双页面淡入淡出完成替换；可匹配卡片按身份和新旧坐标短距离滑动，无对应卡片淡出或淡入；失败则回退直接加载；并按原阅读板块的标题在屏幕上的精确 Y 坐标对齐新周同名标题；周 iframe 的加载路径须解析为绝对 URL 后对比，兼容 GitHub Pages 仓库子目录（例如在 X 区切周仍对齐 X 标题）；各周状态条等高且右侧按钮位置一致；周内四档操作区间固定 | 周一开周制定 `weekly_plan`；日常只更新 `stance` 的条件状态与新证据 | 价格碰到区间不等于触发；不把期货/盘前价格当常规收盘 |
| 市场情绪 | 周一以上周五最后实际收盘为基准，结合周末消息；周二至五对照已存周一/周二；周五作结论。卡片按偏多/观望/偏悲观着色，点击打开逐日情绪浮层，标明星期，进行中的周以“上周交易日”留白分组，历史周只显示该周实际交易日；浮层按五张完整卡的实际高度排版，短周按实际天数。进行中和归档使用同一套卡片宽度、字号与留白，依次显示日期、情绪、归因、正文、整行 QQQ 收盘条及下方的来源链接；进行中的周可滚动回看其余交易日；每日至少一项有来源的事件归因或量化解释，点击单日切换所属周 | `market_mood.baselines/current/conclusion`；早期没有实时情绪记录的 9 月周按当期归档证据在 `data/mood-retrospective.json` 标明回溯判断 | 基准不回写；emoji 与一句归因是分析判断，须有证据与时间；QQQ 使用该周最后交易日收盘，不把回溯判断伪装成当日保存记录 |
| Dashboard 市场读数 | 第一行：情绪、NDX/QQQ、NDX 50/200 日均线、SPX 与 CTA 合并且 CTA 只占一行、走势在右侧；第二行：VIX/VXN、CNN、BofA、10Y/30Y 美债与布伦特原油。VIX 卡在 VXN 下加一行 VX1、VX2、Contango，不改卡片尺寸；最后一张卡左栏为 10Y 主读数与 30Y 小读数，右栏为 Brent 主读数，美元/桶在数字下方 | GPT 每轮独立核验并更新除 CTA 外的所有读数，包括 NDX/QQQ/SPX、VIX/VXN、CNN/BofA、美债、Brent、FedHike 与 VXFutures。Muse 可提供补充，CTA 继续由 Muse 独立维护 | Nasdaq 官方、WSJ 与 CBOE 对照、CBOE 官方 CSV；VX1/VX2 取同一天的前两个月度 VX 期货结算（排除周度合约），Contango = (VX2 / VX1 − 1) × 100%，负值为倒挂，页面标明观察日。CNN/BofA 必须保留原报告或明确次级归档及日期；均线与 ATR 从日线重算。卡片内的小走势图不显示“周频归档／周频报告”标签，利率能源卡不显示 CTA 缺样本提示；保持原卡片尺寸，仅 30Y >5.2% 或 Brent >$100 的数值标红 |
| CTA | 只展示机构模型的标普卖出**触发点**，不是仓位敞口或实际卖盘 | Muse 的 `market_indicators.CTA`，合并至 `snapshot.sentiment.CTA` 与历史观测；GPT 不日常维护 | 标明 SPX 现货或 ES 合约、机构、模型、报告日、来源及二手转述；不同合约点位不可混用 |
| 本周事件驱动 | 最多 4 项，本周权重合计 100%；已落地/未落地各带时间；左侧列表不填高亮底色 | GPT 每轮主动核查 `event_drivers` 卡面与 `event_details` 展开内容，同一 ID 及时更新落地结果；详情最多两项 | 百分比是本周叙事关注度估计，并非概率；未发生事件不可提前记结果 |
| 五维状态 | 盈利、宏观、趋势、估值、仓位权重独立合计 100%；3 星重点卡彩色底白字 | GPT 每轮逐项核查 `dimensions` 五项卡面、`detail_blocks` 详情及 `importance.dimensions`，读数/时态/结果/叙事/来源同步 | 与上周固定权重比较；变化方向、证据和来源分开；星级与百分比独立 |
| 叙事变化与验证 | 左侧问题清单固定、可点击定位；仅右侧选中卡有外框。右侧最新在左、最多 6 条，末端停住 | `questions_upsert`、`answers_append`、`importance.questions/answers` | 新回答按 `question_id` 关联；旧回答不覆盖，新周继承原 ID/日期，历史归档不改 |
| 操作区间与主图 | NDX/QQQ 价格可选 1、3、6、12 个月，日 K 用红涨绿跌显示 OHLC，相邻交易周之间以淡色纵向虚线分隔，50/200 日均线继续用折线叠加；ATR 和条件区间分开 | 周一开周才重算 `weekly_plan`；市场 bars 日常追加 | 图表数据截至实际收盘；周内区间固定，突发风险另做失效检查 |
| X 高热度话题 | 独占上排，**每条帖子一张卡**，话题只作标题，不把不同博主放进同一卡；最新在前，三列瀑布流自动接到最短列，无翻页且不截取合格帖子；除 Polymarket 外，单帖达门槛自动从高频移入，每帖仅展示一次 | GPT 主责选题与补充；Muse 的非 Polymarket 帖子达到门槛也自动归入此排 | 门槛为单帖 ≥100 万浏览，或 ≥1000 转发/评论；依据已核验快照，不以话题合计冒充单帖热度 |
| X 高频板块 | 独占下排，默认完整显示最近两个有帖的北京时间日期，更早帖子以半透明渐隐预览并由下方按钮展开／收起，折叠不删除数据；无卡片或帖子数量上限；按北京时间原帖发布日期与小写 @账号归组，跨日不合并。日期倒序；@labubu_trader 仅在该日有帖时排该日作者首位，没有新帖不跨日置顶，不生成空作者卡。其余作者按该日最新帖子排序，卡内帖子按时间倒序；卡片按最短列接续形成瀑布流，不按最长卡片撑出空白行 | Muse 主责经 `muse-feed.json` 累计提交；GPT 可以补充不重复的原帖 | 账号头像与名称放卡片顶部，每条帖子各自显示发布时间、原帖链接和原文中译；只列有证据的利好标的，没有就省略整行；热度只展示一项已记录指标，不推造数字；长帖可展开阅读全文 |
| 共用事件日历 | 切换历史周时跳到该周；两周一页、可前后翻；3 星及市值超过 5000 亿美元的公司财报高饱和底白字；点击事件后在同周周六、周日两格上方覆盖详情卡，不点仍显示日期；财报小卡只列总营收与 EPS 的预期/实际、一句业务看点和一个业绩表情；完整分项、指引、分时行情与叙事在右侧展开 | 唯一 `calendar_upsert`，不按周复制；财报市值名单随新公司过线核对 | 北京时间与美东交易日期分开；实际结果必须有原始结果来源，市场反应明确时段 |
| 资料来源与历史周 | 归档保留原时间、证据和当期判断 | 发现错漏追加有日期的更正；周六确认最终收盘后冻结并开新周 | 不能把后来才知道的结果倒填成当时预测；不能清空未回答的问题 |

重要性满分 3 星，支持半星。顶部行情不显示星级；普通卡白底，重点五维用类别色，右侧叙事验证卡用淡奶油色深字，日历重点卡用类别色白字。正文纯黑 regular，关键数字及判断用 bold。图表不显示横竖坐标，悬停提示放在图下并有竖向参考线。

## Muse AI 的交接文件

### 本轮改动小黄点与关键财报

页面卡片和日历事件右上角的小黄点表示该更新者**最近实质改写、且尚未在后续更新中按三小时时长清理的显示内容**，与星级、涨跌颜色无关。公开数据中的 `change_markers` 按贡献者分为 `GPT:{revision,at,keys,key_times}` 和 `Muse:{batch_id,at,keys,key_times}`；键名包括 `calendar:<事件id>`、`mood`、`price-chart`、`dimension:<id>`、`question:<id>`、`answer:<id>`、`x:<post id>`、`x-author:@账号`、`trend:<趋势id>`、`metric:<NDX|QQQ|SPX|VIX|VXN|CNN|BofA|CTA|UST10Y|UST30Y|Brent|VXFutures>`、`events`、`strategy`。同一张卡被两方改动时可有两个小黄点。

GPT 通过站点 `dashboard_apply_daily_update` 按实际变化自动累计自己的键集合并按键时间清理到期点；Muse **不要改 GPT 的集合**。Muse 仍提交现有 `muse-feed.json` 累计数据并用新的 `batch_id`；构建时将本批合并结果与上次发布的可见数据比较，累计新 `Muse` 键并为实际变化记时间，只清理满三小时的 Muse 旧点，不清除 GPT 点。相同批次重建沿用现有 Muse 点；新批次没有可见变化时保留不足三小时的点、不重置时间。不要往累计 feed 塞整站黄点或手工删除另一个代理的标记。检查 `/api/export.json` 的 `change_markers` 与页面卡片，确保来源归属正确。

**趋势捕捉由 Muse 独立维护。** Muse 用本周的 `weekly_trends` 更新选题、证据、受益标签及定稿状态，并通过自己的批次管理 `trend:<id>` 黄点。GPT 日更只读，周归档保留 Muse 已发布的状态。存量 GPT 趋势标记由 GPT 在主体数据源清理。

关键财报当日由 GPT 立即完善共用日历；具体 `earnings_metrics` 逐项预期/实际、`guidance`、`reaction_phases` 按盘后/夜盘/盘前的出处与时间分别写，`narrative_impact` 先作有条件的即时分析，不留空白。Muse 的行情 feed 更新只负责其价格/指标与 X，不应覆盖 GPT 的日历解释。10 月按交易日补齐的情绪为回溯判断，不能冒称当时实时保存。

X 高频板块顶部有「趋势捕捉」。趋势总数不设上限，按 `asof` 从新到旧排列，最新在左；时间相同保留原有顺序。单行每页最多四张，不足四张（包括末页）按实际张数等分整行。超过四张才显示左右翻页，首尾停止、不循环，不截断累计趋势。点选趋势后，页面按 `evidence_post_ids` 给每条对应的帖子添加底色。即使同一作者有多帖，也须分别填写对应的稳定 post ID。Muse 每次抓帖后复核本周**累计**原帖，寻找至少两位不同作者的独立帖子所支持的共同驱动（例如企业发债、电力与并网瓶颈）。通过 `weekly_trends` 累计提交全部已核验趋势，不设数量上限；沿用稳定趋势 ID 并更新 `asof`、依据帖子 ID、简短结论、反例/不确定性与 `benefit_tags`。`asof` 记录该趋势内容或证据的最近实质更新时间，无变化的趋势不随抓取批次统一刷新时间，以保持最新趋势靠左。标签可写利好标的、行业或大盘，但要写清是潜在受益及所需条件；发债本身不自动利好，供电紧张也可能压制云厂商。避免把同一转载/同一消息源的多帖当成独立证据。趋势随帖子修正，周内 `tracking`，周末最终收盘核验后 `final`；历史周固定，不因新消息改写旧周判断。趋势卡只显示 Muse 按三小时时长规则保留的黄点。日历中的 `result_emoji` 表示业绩相对预期，`reaction_emoji` 表示观察到的价格反应，二者分开且须与数据一致。

`muse-feed.json` 是**本周累计版**，不是整周主体快照，也不改页面模板。高频的帖子与话题不设数量上限；按稳定 post ID 去重，不能靠截断凑上限。每批写新 `batch_id`（例如 `muse:2026-11-02:20`）、当前 `week_id`、生成时间和来源；**周内带上本周窗口内已提交的全部 Muse 话题与帖子，只增改不删减；新周换新文件，只承接上周五及周末，再累计本周新帖**。同话题沿用原 topic ID，帖子用稳定 post ID 去重。仅保留内容和行情约束：quote ≤25 词，bars 与波动率各 ≤5 个交易日。高热度合格帖子与高频 feed 都不设数量上限。不删除 GPT 补充的话题或帖子。结构：

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

`market_indicators` 可省略未取得新报告的键，不能用旧日报告假装今日读数。CNN 为 0–100、BofA 为 0–10，均需 `value`、报告/观察日 `asof`、`source_url`，可带 `prior/prior_asof`、`source_label`。CTA 只接受标普 500 的机构模型**卖出触发点**：`value`、`asof`、`data_kind:"sell_trigger"`、`scope`（明确 SPX 现货或 ES 合约及月份）、`institution`、`model`、`source_url` 必填；可附 `report_date`、`summary`、`confidence_note`、`unit`、`digits`。只有仓位预估而没有卖出点位时不提交 CTA；机构原报告和二手转述须在内部证据中分清。feed 合并到 `snapshot.sentiment`、`snapshot.asof_metrics` 和对应 `indicator_history`；旧日期不覆盖新日期。GPT 的每轮更新主动核验价格/波动与 CNN、BofA；只有 CTA 留给 Muse。无新报告保留原观察日期，不以检查时间替代。

`market_indicators.VXFutures` 用 Cboe 同一交易日的前两个月度 VX 期货结算，写 `vx1/vx2/asof/front_expiry/second_expiry/source_url`；不拿每周到期合约冒充 VX1。只在双合约都核验后提交，页面按 `(vx2 / vx1 - 1) × 100%` 计算并显示观察日（鼠标悬停或键盘聚焦可查看），负值意味着近月倒挂。旧日期不得覆盖新读数；GPT 已保存的 `snapshot.vix_monthly` 可供初始展示，Muse 新结算优先。期货结算与 VIX 现货不混写。

宏观与金融五维卡新增 Polymarket 会议加息概率。Muse 维护 `market_indicators.FedHike`：`meeting` 为实际会议日期，`value` 为该会议所有加息结果概率之和（25bp、50bp 以上等），`asof` 为读取日期，`source_url` 指向具体 Polymarket 事件，`method` 写明求和口径。当前关注 2026 年 12 月，随后随市场关注焦点更换 `meeting`，不得把单个 25bp 选项冒充全部加息概率。预测市场读数会变，必须显示读取日期，不作为联储官方预测。GPT 每轮也主动核验 `UST10Y`、`UST30Y`、`Brent`，Muse 可提供补充；三项均需 `value/asof/source_url`；美债来自美国财政部每日收益率曲线，布伦特现货来自 EIA，不能以盘中期货混写。初次页面临时核验读数分别为 10/30 的 4.94%/5.31%、10/29 的 $115.28；后续按真实日期更新，GPT 同日核验值优先。超过阈值只提示风险，不自动更改周度计划。\n\n`market_bars` 的每条格式为 `{date:"YYYY-MM-DD",c:收盘,o:开盘,h:最高,l:最低,source_url:"https://..."}`，三种标的必须是**同一交易日期的完整常规时段收盘**，否则不提交新日。`volatility_readings` 的格式为 `{date:"YYYY-MM-DD",vix:{value,source_url},vxn:{value,source_url}}`，读取 Cboe 对应日期官方收盘；不根据图形估值。均线偏离由渲染代码从连续交易日收盘计算，不写在交接文件中。单独缺失的 VIX/VXN 留待下次，不能用旧日读数冒充今日。若源有修订，写一条带日期的更正说明，不静默改历史。

11/03 对账记录：11/02 的 QQQ 图表末笔为 681.92，Nasdaq 历史日线收盘为 681.09（10/30 为 690.49）。情绪浮层按日线计算，Muse 下一批请用历史日线核对当日 OHLC 并补回累计 feed。依据见 [Nasdaq 历史日线](https://api.nasdaq.com/api/quote/QQQ/historical?assetclass=etf&fromdate=2026-11-02&todate=2026-11-02&limit=1)。

Muse 的流程：约每两小时监控 X → 同一博主可有多个话题/帖子，沿用稳定账号和 post ID → 只保留可溯源的新帖或热度变化 → 连同本周累计版提交 `muse-feed.json`；完整美股收盘后补三指数与 VIX/VXN；CNN、BofA 和 CTA 有新报告或可核验触发线时再更新。**绝不因缺译文过滤原帖。** X 的帖子集合以发布的 `api/export.json` 中 `week.x_topics` 为准；每次以当轮合并后的帖子集合为准（Muse :25 累计 8 话题、9 帖；GPT 原帖保留），高热度与高频均为瀑布流且不限合格帖子数量。保持稳定 topic/post ID、作者、链接和原先记录，不因版式拆分重新选帖或改写原有观点。

翻译先取得并逐句核对**完整原帖正文**，再写 `translation_zh`、`translation_scope:"full"` 和 `translation_source_url`；完整译文要保留数字、条件、限定语、列表、引用上下文和原帖中的链接，不加入二次解读。若原帖指向长文，仅译帖文时标 `translation_scope:"post_only"`；只有 ≤25 词短引时标 `"excerpt"`，不得把节选说成全文。旧 :22 批次的 8 条 `translation_zh` 是短引或概括，**不是完整原帖译文**；Muse 下批应按原帖逐条补核，仍保留所有旧帖。对于尚未核到全文的旧帖，卡片明确标“原帖全文未核实”，显示已有 `viewpoint` 原样记录作为过渡，不声称它是逐字译文；缺译文不会导致帖子消失。新帖若无法取得原文，可留在待核记录，不用概括句冒充 `full`。卡面不显示 quote、核验文字、热度来源或影响原因，这些仍必须留在数据中供审核。头像必须是该账号的真实头像；无法核实时用无肖像的字母占位，不冒充真人。`impact` 只有明确的利好方向才进入“利好标的”，其他方向在卡面省略整行。一个帖只展示一种热度：优先 views，缺失则 reposts，再缺则 replies，三者都缺则“热度待核验”。

**旧帖译文补核清单（先核对最新累计 feed 是否已补）**：Muse 下一批逐条核 `2116828613777699280`、`2116949911241630157`、`2117200746869371285`、`2117058592662757865`、`2116950855718998288`、`2117197031844561129`、`2117198149999902803`、`2117205453373677917` 的原帖全文，保留所有原有字段和 post ID，再补 `translation_scope` 与逐句译文。GPT 自己继续核 `deepseek-superagent-20261101`（原帖指长文）和 `zero-power`（原帖指文章），不得把链接文章或短标题的概括写成原帖逐字译文。GPT 站点预览会读取 GitHub 已发布的合并 X 数据，临时网络失败时用最近一次已发布的 13 帖副本兜底；GitHub 静态构建只用当轮 export 与本仓库 feed，不回读旧页面。

**晋级/回流**：Polymarket 市场事件和 Polymarket 系列账号的原帖始终只在高频作者卡展示，沿用原帖 ID 与作者。Muse 继续按原分组累计提交，市场成交额不填入浏览、转发或评论字段。其他作者在自己的 X 原帖中提及 Polymarket，仍按该帖的真实热度归类。其余高频帖的已核验单帖 views ≥1,000,000，或 reposts/replies ≥1,000，发布时自动进入高热度排，原高频作者卡不再显示该帖；同一作者的其他未达标帖仍在高频排。达到门槛后的帖子即使以后热度源暂时缺失，必须保留已核验峰值或原始快照，不能因缺值回流。GPT 定期复核晋级话题，独立寻找其他有原帖、真实热度与译文的高热话题，经 GPT 站点的 `x_topics_upsert` 加入；不同帖子用不同 ID，同 ID 内容 Muse feed 仍优先。热度是传播量，不等于标的利好已获证实。

五维状态卡的详情在卡片下方按高度滑开和收回；切换详情时连续改变高度，尊重系统减少动态效果设置。

X 卡面正文超过 180 字时默认折叠为前五行，点击“展开全文”才显示全部内容；“收起”可还原。折叠只改变呈现，不截断或改写数据。上排一帖一张卡；下排才按博主合并，不因同一话题把不同作者合到一张卡。

每次提交自动触发 Pages 构建。构建先由 `check-muse-feed.mjs` 做结构校验，再在 `scripts/export-pages.mjs` 按周与 ID 合并，重算 NDX/QQQ 的 SMA20/50/100/200 和 Wilder ATR14；VIX/VXN 合并进日期平行数组与最新读数。错误帖子逐条告警且不阻断其他合法帖子；整份文件不合法时用上一批合法文件兜底。文件不能把 X 推断自动提升成主体立场或政策结论。Muse 对直接发布的 X 与读数负核验责任；尤其检查 ID 编码日期与 `published_at` 的年份是否一致。

## 每日发布与复核

1. GPT 的北京时间 10:00、16:00、22:00 任务调用 `dashboard_update_context`，更新主体内容；不再读取或人工吸收 Muse feed。任务前可看 `PUBLISH_LOG.md` 最新一行避免重复。详见 [DAILY_UPDATE.md](DAILY_UPDATE.md)。
2. GPT 内容 revision 增加才更新 `data-revision.json`；Muse feed 变更由 `pages.yml` 的 push paths 直接触发。双方共用 `scripts/export-pages.mjs` 拉取 export、合并 Muse feed、渲染、提交静态产物、请求 Pages build。无变化时比较 export revision、渲染器与 feed 内容 SHA-256 并跳过。
3. `release.json` 分开记录 `data_revision`（GPT export 原始号）、`release_revision`（合并发布序号）、`muse_feed_batch`、`muse_feed_sha256` 和实际 `built_at`。每次构建提交自动追加 `PUBLISH_LOG.md`；它记录构建提交，是否上线还要看 Pages build 状态。Muse 更新不伪增 GPT 的 `data_revision`。发布日志由管线代写，双方不用再手动重复追加。
4. 抽查正式页：当前周/历史周切换、截止日期、一月日 K 与 50/200 日均线、X 头像、译文与分排、左侧白底黑字、日历北京时间。正式合并数据看 GitHub Pages `/api/export.json`，GPT 站点 `/api/export` 只含主体数据。异常时保留上一版，不发空值或错误页面。

内容日更不要运行 `build_history.py`、手改 `_site/`、重压缩渲染器或重建整个历史。只有页面逻辑经过用户确认才用 Sites 源重新生成压缩渲染器，按 `approved/renderer-parts.json` 的清单分片并发布。仓库维护者不需要用户电脑或浏览器在线。


