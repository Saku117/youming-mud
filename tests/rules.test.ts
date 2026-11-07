import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  MAX_HP,
  HALF_HP,
  MAX_CULTIVATION,
  MAX_ENERGY,
} from '../lib/game/state';
import {
  calculateRealm,
  addCultivation,
  handleZeroHp,
  applyDamage,
  move,
  recoverEnergyByMinutes,
  clampHp,
  clampCultivation,
} from '../lib/game/rules';

describe('Game Rules - Numerical & Transition Invariants', () => {
  describe('Upgrade Thresholds (500 / 1500)', () => {
    it('should be 炼气初期 below 500 cultivation', () => {
      expect(calculateRealm(0)).toBe('炼气初期');
      expect(calculateRealm(499)).toBe('炼气初期');
    });

    it('should upgrade to 炼气中期 at exactly 500 cultivation', () => {
      expect(calculateRealm(500)).toBe('炼气中期');
      expect(calculateRealm(1499)).toBe('炼气中期');
    });

    it('should upgrade to 筑基 at 1500 cultivation', () => {
      expect(calculateRealm(1500)).toBe('筑基');
    });

    it('should never exceed MAX_CULTIVATION (1500) and never be negative', () => {
      const state = createInitialState();
      const upgraded = addCultivation(state, 2000);
      expect(upgraded.cultivation).toBe(MAX_CULTIVATION);
      expect(upgraded.realm).toBe('筑基');

      const negative = addCultivation(state, -100);
      expect(negative.cultivation).toBe(0);
      expect(clampCultivation(-50)).toBe(0);
      expect(clampCultivation(9999)).toBe(MAX_CULTIVATION);
    });
  });

  describe('HP 0 Handling', () => {
    it('should return to 宗门大殿, deduct 50 cultivation, and restore half max HP', () => {
      const state = {
        ...createInitialState(),
        location: '鬼市' as const,
        cultivation: 600,
        realm: '炼气中期' as const,
        hp: 10,
      };

      const result = applyDamage(state, 10);
      expect(result.location).toBe('宗门大殿');
      expect(result.hp).toBe(HALF_HP);
      expect(result.cultivation).toBe(550);
      expect(result.realm).toBe('炼气中期');
    });

    it('should never let cultivation or HP become negative when defeated', () => {
      const state = {
        ...createInitialState(),
        location: '幽冥渡口' as const,
        cultivation: 20,
        hp: 1,
      };

      const result = applyDamage(state, 50);
      expect(result.location).toBe('宗门大殿');
      expect(result.hp).toBe(HALF_HP);
      expect(result.cultivation).toBe(0);
      expect(result.realm).toBe('炼气初期');
      expect(clampHp(-10)).toBe(0);
    });

    it('should directly handle zero hp via handleZeroHp', () => {
      const state = {
        ...createInitialState(),
        location: '鬼市' as const,
        cultivation: 520,
        realm: '炼气中期' as const,
        hp: 0,
      };

      const result = handleZeroHp(state);
      expect(result.location).toBe('宗门大殿');
      expect(result.hp).toBe(HALF_HP);
      expect(result.cultivation).toBe(470);
      expect(result.realm).toBe('炼气初期'); // 520 - 50 = 470, falls back to 炼气初期
    });
  });

  describe('Move & Energy Cost', () => {
    it('should cost 1 energy and update location upon moving', () => {
      const state = createInitialState();
      expect(state.energy).toBe(100);
      expect(state.location).toBe('宗门大殿');

      const res = move(state, '鬼市');
      expect(res.success).toBe(true);
      expect(res.state.energy).toBe(99);
      expect(res.state.location).toBe('鬼市');
    });

    it('should fail to move when energy is 0 and keep location unchanged', () => {
      const state = {
        ...createInitialState(),
        energy: 0,
        location: '鬼市' as const,
      };

      const res = move(state, '幽冥渡口');
      expect(res.success).toBe(false);
      expect(res.state.energy).toBe(0);
      expect(res.state.location).toBe('鬼市');
      expect(res.reason).toContain('精力不足');
    });

    it('should recover 1 energy per 10 minutes up to MAX_ENERGY', () => {
      const state = {
        ...createInitialState(),
        energy: 50,
      };

      // 9 minutes: no recovery
      const res9 = recoverEnergyByMinutes(state, 9);
      expect(res9.energy).toBe(50);

      // 10 minutes: +1
      const res10 = recoverEnergyByMinutes(state, 10);
      expect(res10.energy).toBe(51);

      // 25 minutes: +2
      const res25 = recoverEnergyByMinutes(state, 25);
      expect(res25.energy).toBe(52);

      // over max cap
      const capped = recoverEnergyByMinutes(state, 1000);
      expect(capped.energy).toBe(MAX_ENERGY);
    });
  });
});
