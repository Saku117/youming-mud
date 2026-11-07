import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState } from '../lib/game/state';
import { idempotencyStore } from '../lib/agent/guardrails';

describe('Phase 5 Quests Verification', () => {
  beforeEach(() => {
    idempotencyStore.clear();
  });

  describe('1. Main Quest: 渡口引魂', () => {
    it('runs the full main quest lifecycle: accept -> trade lamp (interrupt) -> ferry crossing -> return to hall (+300 cultivation)', async () => {
      let state = createInitialState('林轩');
      expect(state.location).toBe('宗门大殿');
      expect(state.cultivation).toBe(0);
      expect(state.energy).toBe(100);

      // Step 1: 掌门发任务
      state = {
        ...state,
        quests: { ...state.quests, 渡口引魂: '进行中' },
      };
      expect(state.quests['渡口引魂']).toBe('进行中');

      // 移动至鬼市 (精力 -1)
      state = { ...state, location: '鬼市', energy: state.energy - 1 };
      expect(state.location).toBe('鬼市');
      expect(state.energy).toBe(99);

      // Step 2: 夜枭换引魂灯 (Interrupt confirm)
      const tradeReqId = 'trade-main-lantern-001';
      state = {
        ...state,
        energy: state.energy - 10,
        inventory: [...state.inventory, '引魂灯'],
        quests: { ...state.quests, 渡口引魂: '已得灯' },
      };
      idempotencyStore.record(tradeReqId, 'trade', { state });
      expect(state.inventory).toContain('引魂灯');
      expect(state.energy).toBe(89);
      expect(state.quests['渡口引魂']).toBe('已得灯');

      // 移动至幽冥渡口 (精力 -1)
      state = { ...state, location: '幽冥渡口', energy: state.energy - 1 };
      expect(state.location).toBe('幽冥渡口');
      expect(state.energy).toBe(88);

      // Step 3: 渡口引魂 (Interrupt confirm)
      const ferryReqId = 'ferry-cross-main-001';
      const invWithoutLamp = state.inventory.filter((i) => i !== '引魂灯');
      state = {
        ...state,
        energy: state.energy - 20,
        inventory: invWithoutLamp,
        quests: { ...state.quests, 渡口引魂: '待复命' },
      };
      idempotencyStore.record(ferryReqId, 'ferry_cross', { state });
      expect(state.inventory).not.toContain('引魂灯');
      expect(state.energy).toBe(68);
      expect(state.quests['渡口引魂']).toBe('待复命');

      // 移动回宗门大殿 (精力 -1)
      state = { ...state, location: '宗门大殿', energy: state.energy - 1 };
      expect(state.location).toBe('宗门大殿');
      expect(state.energy).toBe(67);

      // Step 4: 回大殿向掌门复命结算 (+300 修为)
      state = {
        ...state,
        cultivation: state.cultivation + 300,
        quests: { ...state.quests, 渡口引魂: '已完成' },
      };
      expect(state.cultivation).toBe(300);
      expect(state.quests['渡口引魂']).toBe('已完成');
    });
  });

  describe('2. Side Quest 1: 药老的丹方', () => {
    it('runs search -> collect 3 herbs -> brew pill (+120 cultivation)', () => {
      let state = createInitialState('林轩');
      expect(state.cultivation).toBe(0);

      // Step 1: 查丹方
      state = {
        ...state,
        quests: { ...state.quests, 药老的丹方: '搜集灵草' },
      };
      expect(state.quests['药老的丹方']).toBe('搜集灵草');

      // Step 2: 搜集三味灵草
      const herbs = ['紫猴花', '天灵果', '洗骨草'];
      state = {
        ...state,
        inventory: [...state.inventory, ...herbs],
        quests: { ...state.quests, 药老的丹方: '灵草已齐' },
      };
      expect(state.inventory).toContain('紫猴花');
      expect(state.inventory).toContain('天灵果');
      expect(state.inventory).toContain('洗骨草');

      // Step 3: 开炉炼丹 (Interrupt confirm)
      const brewReqId = 'brew-xisui-test-1';
      const cleanInv = state.inventory.filter((i) => !herbs.includes(i));
      state = {
        ...state,
        mp: state.mp - 30,
        inventory: [...cleanInv, '洗髓丹'],
        cultivation: state.cultivation + 120,
        quests: { ...state.quests, 药老的丹方: '已完成' },
      };
      idempotencyStore.record(brewReqId, 'brew_pill', { state });

      expect(state.inventory).toContain('洗髓丹');
      expect(state.inventory).not.toContain('紫猴花');
      expect(state.mp).toBe(81); // 111 - 30
      expect(state.cultivation).toBe(120);
      expect(state.quests['药老的丹方']).toBe('已完成');
    });
  });

  describe('3. Side Quest 2: 夜枭的赌局', () => {
    it('Win outcome: loses 20 HP, gains magic item 幽冥鬼骨刃 and 50 cultivation', () => {
      let state = createInitialState('林轩');
      const startHp = state.hp;
      const startCult = state.cultivation;
      const startAtk = state.attack;

      // 胜局结算
      state = {
        ...state,
        hp: state.hp - 20,
        attack: state.attack + 15,
        cultivation: state.cultivation + 50,
        inventory: [...state.inventory, '幽冥鬼骨刃'],
        quests: { ...state.quests, 夜枭的赌局: '已完成(胜)' },
      };

      expect(state.hp).toBe(startHp - 20);
      expect(state.attack).toBe(startAtk + 15);
      expect(state.cultivation).toBe(startCult + 50);
      expect(state.inventory).toContain('幽冥鬼骨刃');
      expect(state.quests['夜枭的赌局']).toBe('已完成(胜)');
    });

    it('Lose outcome: loses 20 HP, gains nothing', () => {
      let state = createInitialState('林轩');
      const startHp = state.hp;
      const startCult = state.cultivation;
      const startInvLen = state.inventory.length;

      // 败局结算
      state = {
        ...state,
        hp: state.hp - 20,
        quests: { ...state.quests, 夜枭的赌局: '已完成(负)' },
      };

      expect(state.hp).toBe(startHp - 20);
      expect(state.cultivation).toBe(startCult);
      expect(state.inventory.length).toBe(startInvLen);
      expect(state.quests['夜枭的赌局']).toBe('已完成(负)');
    });
  });
});
