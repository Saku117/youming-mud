# Netherworld Cultivation MUD — 幽冥修仙 MUD

> Kiroween 2026 · Resurrection track  
> A dead genre, brought back to life: a telnet-style text MUD where three AI NPCs remember you, test you, and make you choose.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![LangGraph.js](https://img.shields.io/badge/LangGraph.js-Agent-green.svg)](https://langchain-ai.github.io/langgraphjs/)
[![Vitest](https://img.shields.io/badge/Tests-38%20Passed-brightgreen.svg)](https://vitest.dev/)

---

## 📖 项目简介 (What is this?)

《幽冥修仙 MUD》复活了拨号时代的经典文字 MUD 游戏，并将其重构为现代多智能体架构。

玩家化身永宁州初入仙途的外门弟子（年方十六，炼气初期），在幽冥阴气渐起的黑夜中探索三处绝境、抉择生死：

- **宗门大殿**：掌门清虚真人坐镇，评定弟子境界，传授主线大计「渡口引魂」并主持功德灌顶。
- **鬼市**：神秘商人夜枭佩戴厉鬼面具，贩售渡水法器【引魂灯】，摆下生死赌局，真假莫辨。
- **幽冥渡口**：弱水黑雾翻涌，唯有手持引魂灯方可破除阴煞，引渡九幽残魂回魂转世。

游戏核心特色在于 **严格非重叠工具集的多智能体协同**、**纯函数数值状态机**、**藏经阁严苛 RAG 检索** 与 **人工确认中断卡（Interrupt）及幂等防重机制**。

---

## 🎮 玩法指引 (How to play)

1. **入梦启程**：打开页面后输入道号（默认「无名弟子」），无需注册登录即可即时开局。
2. **地点穿梭**：通过底部「宗门大殿」、「鬼市」、「幽冥渡口」大按钮或直接输入 `去 鬼市` 进行御风穿梭，每次移动消耗 1 点精力。
3. **主线「渡口引魂」**：
   - 宗门大殿：拜见掌门清虚，接取主线任务「渡口引魂」。
   - 鬼市：寻找夜枭换取法宝【引魂灯】（触发副作用中断确认卡，精力 -10）。
   - 幽冥渡口：点亮引魂灯破除弱水阴煞，完成渡河引魂（触发中断确认卡，消耗引魂灯与精力）。
   - 宗门大殿：返回向清虚复命结算，获得醍醐灌顶，**修为大涨 300 点**！
4. **支线「药老的丹方」**：
   - 向药老请教洗髓丹配方，药老严格基于藏经阁玉简检索答复。
   - 输入或点击「采药搜集」，凑齐紫猴花、天灵果、洗骨草三味灵药。
   - 回大殿偏殿开炉炼丹（触发中断确认卡，消耗灵力 30 点），炼成【洗髓丹】，**修为增益 120 点**。
5. **支线「夜枭的赌局」**：
   - 在鬼市参与赌命（触发中断确认卡，消耗生命 20 点）：胜则赢得鬼市秘宝【幽冥鬼骨刃】（攻击 +15，修为 +50）；负则惨受反噬。
6. **调息与重生**：
   - 精力耗尽时可输入「打坐」或等待时间自然吐纳恢复（每 10 分钟恢复 1 点）。
   - 若生命降至 0，触发宗门大阵护体重伤回生：返回宗门大殿、生命回满一半（84）、修为扣减 50，绝不死档。
   - 本地存档自动同步至 `localStorage`，刷新页面进度完全恢复。

---

## 🛠️ 技术栈 (Tech Stack)

- **前端框架**：Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **界面交互**：终端流式界面、打字机逐字动效（支持一键跳过）、移动端 `100dvh` 自适应布局
- **多智能体架构**：LangGraph.js (`StateGraph`, `ToolNode`, `messagesStateReducer`)
- **LLM 驱动**：阶跃星辰 StepFun `step-3.7-flash`（OpenAI 兼容 Tool Calling 原生支持）
- **数值与护栏**：纯函数数值引擎（生命/灵力/精力/修为/攻击硬边界）+ 输入/参数/输出/数值四步护栏
- **质量保障**：Vitest 自动化测试套件 + Fast-Check 属性测试（PBT，万次随机边界断言）

---

## 🔮 Kiro 的使用实践 (How Kiro was used)

本项目全程采用 Spec-Driven Development（规范驱动开发）：

1. **Spec 驱动开发 (`/.kiro/specs/youming-mud/`)**：
   - `requirements.md`：严格冻结需求边界（3 地点、3 NPC、境界 3 档、R1~R10 验收准则），坚决不扩展多余范围。
   - `design.md`：确立一句话架构、NPC 非重叠工具集、状态机与每步护栏。
   - `tasks.md`：清晰划分为 Phase 0 到 Phase 4，分步迭代并步步自动化验证。
2. **Steering 规范体系 (`/.kiro/steering/`)**：
   - `world-bible.md`：严格约束永宁州世界观、NPC 性格语气与核心数值常量。
   - `agent-friendly.md`：贯彻 4 大原则（先查再答、参数校验、幂等去重、副作用置于 interrupt 后）。
   - `tech.md`：规范纯函数收口、中文注释解释「为什么」、零密钥入库。
3. **Hooks & Quality Gates**：
   - 保存与构建生命周期自动运行 Lint 与 Vitest 单测。
4. **Kiro Crew 协同角色**：
   - Planner 规划架构与任务清单，Coder 编写最小最稳纯函数代码，Tester 构建 38 项自动化测试与属性测试。
5. **MCP 集成**：
   - 通过 MCP 工具进行仓库巡检、文件结构校验与 Git 协作。

---

## 🧪 自动化测试验证 (Testing)

运行全部 38 项单元测试、PBT 属性测试与端到端对话测试：

```bash
pnpm test
```

包含覆盖：
- 境界 500 / 1500 单调递增与上下限硬截断
- 生命归零重伤保护与半血回复
- 移动精力消耗与 0 精力移动阻断
- 藏经阁无记载严禁幻觉测试
- LangGraph ToolNode 状态管道与消息追加全链路
- 主线与双支线生命周期测试
- 赌局取消状态不变与交易重复请求幂等性测试
- Fast-Check 属性测试（PBT，万次随机输入数值不崩溃）

---

## 🚀 本地运行 (Local Development)

```bash
# 1. 克隆仓库
git clone https://github.com/sakuiy/youming-mud.git
cd youming-mud

# 2. 安装依赖
pnpm install

# 3. 配置本地环境变量 (.env.local)
cp .env.example .env.local # 填入 STEP_BASE_URL, STEP_API_KEY, STEP_MODEL

# 4. 启动本地开发服务
pnpm dev
```

本地服务启动后访问 `http://localhost:3000` 即可畅玩。

---

## 📄 开源许可证 (License)

本项目采用 [MIT License](LICENSE) 开源协议。
