# Netherworld Cultivation MUD — Devpost Description

## Tagline
A dead genre, brought back to life: a text MUD where three AI NPCs remember you, test you, and make you choose.

## Description

Netherworld Cultivation MUD resurrects the telnet-era text MUD — a genre that died with dial-up — and rebuilds it for the age of agents.

You wake up in Yongning Prefecture as a 16-year-old outer disciple, at the very bottom of the cultivation ladder. There is no open world to grind and no quest marker to follow. There are only three places, three people, and your choices:

- **The Sect Hall**, where Sect Master Qingxu gives you the main quest and judges whether you are ready to advance.
- **The Ghost Market**, where the trader Yexiao will sell you anything — including a soul-lantern you may not survive paying for.
- **The Nether Ferry**, where the main quest ends, if you make it that far.

Each NPC is a LangGraph agent with its own memory and its own non-overlapping toolset. Qingxu only handles quests. Yaolao, the old alchemist, only answers from a strict RAG knowledge base of pill recipes and cultivation manuals — if it is not in the archive, he says so instead of inventing it. Yexiao only trades. Ask the wrong NPC for the wrong thing and they will send you to the right one, in character.

High-stakes actions — gambling your life for a treasure, brewing an unknown pill, crossing the ferry — pause for human confirmation via LangGraph interrupt. Cancel, and nothing changes. Confirm, and the trade is idempotent: the same request can never charge you twice.

Built with Next.js + TypeScript + LangGraph.js, with a terminal-style UI, a typewriter narrative, and a deterministic rules engine for HP, spirit, energy, cultivation, and realms — from Qi Refining to Foundation Establishment. The rules are pure functions, covered by unit and property-based tests, so the numbers never lie even when the NPCs do.

Kiro shaped the whole build: spec-driven development in `.kiro/specs/`, steering docs for the world bible and agent-friendly principles, hooks that run lint and game-rule tests on save, Kiro Crew for planner / coder / tester, and MCP for repository work.

Old tech, new agents. One life, three NPCs, and a ferry that only runs at night.
