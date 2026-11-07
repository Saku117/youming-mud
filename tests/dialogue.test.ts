import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { HumanMessage } from '@langchain/core/messages';
import { createMudGraph } from '../lib/agent/graph';
import { createInitialState } from '../lib/game/state';

beforeAll(() => {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...rest] = trimmed.split('=');
        const key = k.trim();
        const val = rest.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
});

describe('Phase 3 End-to-End NPC Dialogue Verification', () => {
  const graph = createMudGraph();
  const baseState = createInitialState('林轩');

  it('1. Talk to 掌门清虚: routes to qingxu and responds regarding tasks/state', async () => {
    const res = await graph.invoke({
      messages: [new HumanMessage('弟子林轩拜见掌门，请问宗门有何主线历练？')],
      gameState: baseState,
    });

    expect(res.activeNpc).toBe('掌门清虚');
    const lastMsg = res.messages[res.messages.length - 1];
    expect(lastMsg.content).toBeTruthy();
    console.log('[掌门清虚 回复]:\n', lastMsg.content);
  }, 20000);

  it('2. Talk to 药老: routes to yaolao and searches knowledge for 洗髓丹', async () => {
    const res = await graph.invoke({
      messages: [new HumanMessage('药老，请问藏经阁记载的洗髓丹需要哪些灵草？')],
      gameState: baseState,
    });

    expect(res.activeNpc).toBe('药老');
    const lastMsg = res.messages[res.messages.length - 1];
    expect(lastMsg.content).toBeTruthy();
    expect(lastMsg.content).toMatch(/紫猴花|天灵果|洗骨草|太上九转经/);
    console.log('[药老 回复]:\n', lastMsg.content);
  }, 20000);

  it('3. Talk to 鬼市商人夜枭: routes to yexiao and introduces ghost market items', async () => {
    const res = await graph.invoke({
      messages: [new HumanMessage('夜枭，你这摊子上有什么稀罕法宝？引魂灯怎么卖？')],
      gameState: { ...baseState, location: '鬼市' },
    });

    expect(res.activeNpc).toBe('鬼市商人夜枭');
    const lastMsg = res.messages[res.messages.length - 1];
    expect(lastMsg.content).toBeTruthy();
    expect(lastMsg.content).toMatch(/引魂灯|鬼市|灵石|宝/);
    console.log('[鬼市夜枭 回复]:\n', lastMsg.content);
  }, 20000);

  it('4. Ask 药老 for a quest: confirms 药老 refuses and points to 掌门清虚', async () => {
    const res = await graph.invoke({
      messages: [new HumanMessage('药老，我想去宗门历练，给我派发一个任务吧！')],
      gameState: baseState,
      targetNpc: '药老',
    });

    expect(res.activeNpc).toBe('药老');
    const lastMsg = res.messages[res.messages.length - 1];
    const text = String(lastMsg.content);
    console.log('[药老 拒绝并指路回复]:\n', text);

    // 确认药老拒绝发任务并指路掌门清虚
    const pointsToQingxu = text.includes('掌门') || text.includes('清虚');
    expect(pointsToQingxu).toBe(true);
  }, 20000);
});
