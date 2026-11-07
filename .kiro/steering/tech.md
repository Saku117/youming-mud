# Tech — 技术栈与规范

- 前端：Next.js（App Router）+ TypeScript + Tailwind
- Agent：LangGraph.js，模型阶跃星辰 step_5_preview（tool calling 已验证可用）
- 部署：Vercel；`STEP_API_KEY` 只放 Vercel 环境变量，不进仓库、不进前端
- 包管理：pnpm
- 测试：Vitest 单测 + PBT（修为 / 交易 / 掉落）
- 代码规范：
  - 所有数值计算收口到 `lib/game/rules.ts`（纯函数），不许 NPC / UI 里现算
  - 工具参数都有 zod / schema，校验不过直接拒
  - 中文注释写「为什么」，不写「是什么」
- Kiro 使用：
  - 先写 spec 再写代码，需求变了先改 spec
  - Hooks：保存时跑 lint + 数值单测
  - Crew：planner / coder / tester 分工，别让一个 agent 又写又测
