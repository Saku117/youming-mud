# Tasks — 幽冥修仙 MUD

> 排期：11-07 ~ 11-11 只准备不写业务代码；11-12 起动手；11-30 出 MVP；12-01 ~ 12-03 录视频交表。
> 每步做完就跑一遍，不要攒到最后。

## Phase 0 — 准备（11-07 ~ 11-11，面试冲刺周）
- [ ] 在 Devpost Resources 页申请 4000 免费 Kiro credits（截止 12-02 04:00 北京时间）
- [ ] 在 Devpost 点 Enter a Submission，先存草稿
- [ ] 新建公开 GitHub 仓库（建议名 `youming-mud`），加 MIT license
- [ ] 把本目录整个 `.kiro/` 推到仓库根目录，确认没进 `.gitignore`
- [ ] 在 Kiro 里打开仓库，确认能读到 spec 和 steering

## Phase 1 — 骨架（11-12 ~ 11-16）
- [ ] `pnpm create next-app`：Next.js + TypeScript + Tailwind，跑通 `pnpm dev`
- [ ] 写 `lib/game/state.ts` + `lib/game/rules.ts`：状态类型、升级、移动、重伤规则
- [ ] 写 `tests/rules.test.ts`：升级阈值 500 / 1500、生命为 0 回大殿修为 -50
- [ ] 写终端 UI：`Terminal.tsx`（打字机 + 跳过）+ `StatusBar.tsx`（生命/灵力/精力/修为）
- [ ] 写 `app/api/play/route.ts` 空壳：先回固定开场剧情，不调模型，验证前后端通
- [ ] 验收：打开页面能创建角色、能走 3 个地点、精力扣 1、刷新不丢档

## Phase 2 — Agent（11-17 ~ 11-23）
- [ ] 接 step_5_preview，跑通一次 LangGraph 调用
- [ ] 写 `lib/agent/graph.ts`：Router 分流 → 3 NPC，Supervisor 只用于主线多步
- [ ] 写 `lib/agent/npcs.ts`：3 NPC 人设 + 工具集，工具互不重叠（见 design）
- [ ] 写 `lib/game/knowledge.ts`：10 条丹方 / 功法，药老 RAG 只查这个库
- [ ] 写 `lib/agent/guardrails.ts`：参数 schema 校验 + 每步护栏
- [ ] 写 `ConfirmCard.tsx` + interrupt：赌命 / 炼丹 / 渡口引魂先弹窗确认
- [ ] 幂等：`trade` / `gamble` / `brew_pill` 带 `requestId`，同一 ID 只执行一次
- [ ] 验收：3 个 NPC 各跑通一次对话；问药老要任务会被拒并指路；取消交易状态不变

## Phase 3 — 剧情 + 数值（11-24 ~ 11-30，MVP）
- [ ] 主线「渡口引魂」全流程跑通：接任务 → 换灯 → 引魂 → 结算 +300 修为
- [ ] 支线 1「药老的丹方」跑通：查丹方 → 集药 → 炼丹 +120 修为
- [ ] 支线 2「夜枭的赌局」跑通：赢得法器 / 输扣生命，两种结果都测
- [ ] 写 `tests/rules.property.test.ts`：PBT 测修为、交易价格、掉落不崩（不出现负数 / 超上限）
- [ ] 部署 Vercel，线上不用登录就能玩到通关
- [ ] 验收：从开场到通关完整走一遍，手机上也能玩

## Phase 4 — 提交（12-01 ~ 12-03）
- [ ] 写 README：怎么玩、用了 Kiro 哪些功能（spec / steering / hooks / Crew / MCP / PBT）
- [ ] 写 Devpost 提交说明：功能 + Kiro 使用说明 + GitHub 链接 + 线上地址
- [ ] 录演示视频 < 3 分钟：开场 → 和 3 NPC 各说一句话 → 一次 interrupt 确认 → 通关结算，传 YouTube 公开
- [ ] 最后检查：`/.kiro` 在仓库里、license 可见、线上地址能打开
- [ ] 提交，截止 12-05 06:00 北京时间

## 砍掉也不心疼（时间不够先砍这些）
- 打字机动画、地点插画、音效
- 支线 2（只留主线 + 支线 1 也能交）
- PBT（先保单测，PBT 有时间再补）
