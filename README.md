# Netherworld Cultivation MUD — 幽冥修仙 MUD

> Kiroween 2026 · Resurrection track
> A dead genre, brought back to life: a text MUD where three AI NPCs remember you, test you, and make you choose.

## What is this?

Netherworld Cultivation MUD resurrects the telnet-era text MUD — a genre that died with dial-up — and rebuilds it for the age of agents.

You wake up in Yongning Prefecture as a 16-year-old outer disciple, at the very bottom of the cultivation ladder. There is no open world to grind and no quest marker to follow. There are only three places, three people, and your choices:

- **The Sect Hall**, where Sect Master Qingxu gives you the main quest and judges whether you are ready to advance.
- **The Ghost Market**, where the trader Yexiao will sell you anything — including a soul-lantern you may not survive paying for.
- **The Nether Ferry**, where the main quest ends, if you make it that far.

Each NPC is a LangGraph agent with its own memory and its own non-overlapping toolset. Qingxu only handles quests. Yaolao, the old alchemist, only answers from a strict RAG knowledge base of pill recipes and cultivation manuals — if it is not in the archive, he says so instead of inventing it. Yexiao only trades.

High-stakes actions — gambling your life for a treasure, brewing an unknown pill, crossing the ferry — pause for human confirmation via LangGraph interrupt. Cancel, and nothing changes. Confirm, and the trade is idempotent: the same request can never charge you twice.

## Tech

- Next.js + TypeScript + LangGraph.js
- Terminal-style UI, typewriter narrative
- Deterministic rules engine for HP / spirit / energy / cultivation / realms — Qi Refining to Foundation Establishment

## How Kiro was used

- Spec-driven development in `.kiro/specs/youming-mud/` — requirements, design, tasks
- Steering docs in `.kiro/steering/` — world bible, agent-friendly principles, tech stack
- Hooks: lint + game-rule tests on save
- Kiro Crew: planner / coder / tester
- MCP for repository work

## Status

🚧 In progress for Kiroween 2026. Submission deadline: Dec 4, 2026 14:00 PT.

See [PLAN.md](PLAN.md) for scope and timeline, and [DESCRIPTION.md](DESCRIPTION.md) for the full Devpost description.
