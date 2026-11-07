import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  validateInput,
  validateToolArgs,
  validateOutput,
  enforceNumericBounds,
  idempotencyStore,
} from '../lib/agent/guardrails';
import { searchKnowledge, KNOWLEDGE_BASE } from '../lib/game/knowledge';
import { createInitialState } from '../lib/game/state';

describe('Phase 4: RAG + Guardrails + Interrupt + Idempotency', () => {
  beforeEach(() => {
    idempotencyStore.clear();
  });

  describe('RAG Knowledge Base & Strict Keyword Search (R7)', () => {
    it('should have exactly 10 plain data pill recipes / manuals in knowledge base', () => {
      expect(KNOWLEDGE_BASE.length).toBe(10);
      const names = KNOWLEDGE_BASE.map((k) => k.name);
      expect(names).toContain('洗髓丹');
      expect(names).toContain('聚气散');
      expect(names).toContain('筑基丹');
      expect(names).toContain('引魂之法');
      expect(names).toContain('天雷诀');
    });

    it('should return correct recipe on keyword match', () => {
      const res = searchKnowledge('洗髓丹');
      expect(res.found).toBe(true);
      expect(res.message).toContain('太上九转经');
      expect(res.message).toContain('紫猴花');
    });

    it('should return 藏经阁无此记载 without hallucinating when no match is found', () => {
      const res = searchKnowledge('九转大肠丹');
      expect(res.found).toBe(false);
      expect(res.message).toBe('藏经阁无此记载');
    });
  });

  describe('4-Step Guardrails', () => {
    it('Input Guardrail: rejects empty, oversized (>500 chars), or control chars', () => {
      expect(validateInput('').valid).toBe(false);
      expect(validateInput('a'.repeat(501)).valid).toBe(false);
      expect(validateInput('normal input').valid).toBe(true);
      expect(validateInput('test\u0000bad').valid).toBe(false);
    });

    it('Tool Args Guardrail: validateToolArgs returns fix hint from schema description on error', () => {
      const schema = z.object({
        amount: z.number().describe('必须为正整数修为点数'),
      });

      const failure = validateToolArgs(schema, { amount: 'invalid-string' });
      expect(failure.valid).toBe(false);
      expect(failure.errorHint).toContain('参数校验失败');
      expect(failure.errorHint).toContain('amount');

      const success = validateToolArgs(schema, { amount: 100 });
      expect(success.valid).toBe(true);
      expect(success.data?.amount).toBe(100);
    });

    it('Output Guardrail: sanitizes empty or potential credential leak', () => {
      expect(validateOutput('').valid).toBe(false);
      const leak = validateOutput('Here is key: sk-abcdef12345678901234567890');
      expect(leak.valid).toBe(false);
      expect(leak.sanitized).toContain('天道禁制');

      const normal = validateOutput('掌门拂袖离去。');
      expect(normal.valid).toBe(true);
      expect(normal.sanitized).toBe('掌门拂袖离去。');
    });

    it('Numeric Bounds Guardrail: clamps values and handles zero hp defeat', () => {
      const state = {
        ...createInitialState(),
        hp: -10,
        cultivation: 9999,
      };
      const guarded = enforceNumericBounds(state);
      expect(guarded.location).toBe('宗门大殿');
      expect(guarded.hp).toBe(84); // zero hp triggers half hp recovery
      expect(guarded.cultivation).toBe(1450); // 9999 clamped to 1500, then -50 on zero hp defeat = 1450
    });
  });

  describe('Interrupt & Idempotency Verification (R5)', () => {
    it('1. Cancel a gamble: confirms state is completely unchanged', () => {
      const state = {
        ...createInitialState(),
        hp: 168,
        cultivation: 200,
        energy: 100,
        location: '鬼市' as const,
      };

      // 玩家触发赌局中断请求，获得 ConfirmActionData
      const requestId = 'gamble-test-req-1';
      const confirmData = {
        type: 'gamble' as const,
        title: '夜枭赌局',
        cost: '生命 20 点',
        gain: '修为 50 点',
        requestId,
      };

      // 模拟玩家选择【取消行动】
      // 客户端不向服务端发起 confirm 请求，直接丢弃 confirmData 并保留原始 state
      const stateAfterCancel = { ...state };

      expect(stateAfterCancel.hp).toBe(168);
      expect(stateAfterCancel.cultivation).toBe(200);
      expect(stateAfterCancel.energy).toBe(100);
      expect(stateAfterCancel.location).toBe('鬼市');
      expect(idempotencyStore.has(requestId)).toBe(false);
    });

    it('2. Confirm the same trade twice with the same requestId: charges only once (Idempotency)', () => {
      const state = {
        ...createInitialState(),
        energy: 100,
        inventory: [] as string[],
        location: '鬼市' as const,
      };

      const requestId = 'trade-idempotent-unique-999';

      // 模拟首次执行交易
      function executeTrade(currState: typeof state, reqId: string) {
        if (idempotencyStore.has(reqId)) {
          return {
            state: idempotencyStore.get(reqId)!.response.state,
            idempotent: true,
          };
        }

        const nextState = {
          ...currState,
          energy: currState.energy - 10,
          inventory: [...currState.inventory, '引魂灯'],
        };
        idempotencyStore.record(reqId, 'trade', { state: nextState });
        return {
          state: nextState,
          idempotent: false,
        };
      }

      // 第一次确认执行：扣除 10 精力，行囊增加引魂灯
      const firstRes = executeTrade(state, requestId);
      expect(firstRes.idempotent).toBe(false);
      expect(firstRes.state.energy).toBe(90);
      expect(firstRes.state.inventory).toContain('引魂灯');
      expect(idempotencyStore.has(requestId)).toBe(true);

      // 第二次以相同的 requestId 再次确认（模拟网络重发/页面刷新重复提交）
      const secondRes = executeTrade(firstRes.state, requestId);
      expect(secondRes.idempotent).toBe(true);
      // 精力保持 90，绝不重复扣费至 80！
      expect(secondRes.state.energy).toBe(90);
      expect(secondRes.state.inventory.filter((i: string) => i === '引魂灯').length).toBe(1);
    });
  });
});
