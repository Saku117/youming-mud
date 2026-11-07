# Kiroween 2026 — Resurrection 修仙 MUD

工作名：《幽冥修仙 MUD》 / Netherworld Cultivation MUD
赛道：Resurrection（复活 telnet 时代文字 MUD）
截止：2026-12-05 06:00 北京时间（12-04 14:00 PT）
免费 credits：4000 Kiro credits，2026-12-02 04:00 北京时间前在 Resources 页申请

## 一句话
复活已死的文字 MUD：玩家在永宁州醒来，靠和三个有记忆的 AI NPC 对话、做抉择、修炼，从炼气初期一路摸向筑基，关键生死抉择必须人工确认。

## 锁定的范围（别再扩）
- 3 个地点：宗门大殿 / 鬼市 / 幽冥渡口
- 3 个 NPC，各一套不重叠的工具：
  - 掌门清虚 — 主线任务、发任务、推进剧情（Supervisor 式，全场指挥）
  - 药老 — RAG 查丹方 / 功法、炼丹（只查资料、不发任务）
  - 鬼市商人夜枭 — 交易、赌命换宝（高风险操作走 interrupt 人工确认，幂等）
- 1 条主线 + 2 条支线；境界只做到炼气初期 → 炼气中期 → 筑基（3 档）
- 状态沿用同修录那套：生命 / 灵力 / 精力 / 修为 / 攻击，数值规则写死、可测
- 前端：Next.js + TypeScript，终端式 UI（打字机 + 暗色鬼火配色），部署 Vercel
- 后端 Agent：LangGraph.js，模型用阶跃星辰 step_5_preview（已验证 tool calling 可用）

## 不做清单
不做多人联机、不做 3D、不做语音、不做开放大地图、不做第 4 个 NPC、不做第 4 个地点。
代码全新写：世界观、数值可以借同修录的思路，旧仓库代码不能直接搬（新项目才合规）。

## Kiro 要秀的东西（评委看这块）
- `.kiro/specs/`：spec 驱动，先写需求 → 设计 → 任务，再让 Kiro 实现
- `.kiro/steering/`：世界观 bible + agent-friendly 原则（search_knowledge、validateToolArgs、幂等、interrupt 后才做副作用）
- Hooks：保存时自动跑 lint / 数值单测 / 生成 changelog 草稿
- Kiro Crew：planner / coder / tester 分工
- MCP：接 GitHub / 文件系统，方便查资料和管仓库
- PBT：修为、交易价格、掉落概率做属性测试，防数值崩

## 提交清单（对照 Devpost）
- [ ] 公开 GitHub 仓库，根目录有 `/.kiro`（别进 .gitignore）
- [ ] 开源 license 文件，About 栏可见
- [ ] 能跑的线上地址（Vercel），测试账号写进提交表（只给评委看）
- [ ] 文字说明 + Kiro 使用说明（用了哪些功能、怎么帮上忙）
- [ ] 演示视频 < 3 分钟，YouTube 公开

## 排期
- 11-07 ~ 11-11 面试冲刺周：只做准备，不写业务代码
  - 领 4000 免费 credits、建 Devpost 草稿、建空的公开 GitHub 仓库 + `/.kiro`
- 11-12 ~ 11-16：spec + 终端 UI + 状态机（生命/灵力/精力/修为）
- 11-17 ~ 11-23：3 个 NPC Agent + 主线任务链跑通
- 11-24 ~ 11-30：支线、数值 PBT、部署 Vercel、修 bug
- 12-01 ~ 12-03：录演示视频、写提交说明、交表
- 12-05 06:00：截止

## 下一步（等你一句话）
1. 定仓库名（建议 `youming-mud` / `netherworld-mud`）
2. 我帮你搭 spec 骨架：`.kiro/specs/youming-mud/requirements.md` + `design.md` + `tasks.md`，你直接在 Kiro 里接着写
