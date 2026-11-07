import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
  clampHp,
  clampMp,
  clampEnergy,
  clampCultivation,
  calculateRealm,
  applyDamage,
  addCultivation,
  move,
  recoverEnergyByMinutes,
} from '../lib/game/rules';
import {
  createInitialState,
  MAX_HP,
  MAX_MP,
  MAX_ENERGY,
  MAX_CULTIVATION,
  HALF_HP,
  Location,
} from '../lib/game/state';

describe('Property-Based Tests (PBT) - Numerical Invariants & Bounds', () => {
  it('Property: clampHp strictly produces integers in [0, 168]', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: 100000 }), (hp) => {
        const clamped = clampHp(hp);
        return clamped >= 0 && clamped <= MAX_HP && Number.isInteger(clamped);
      }),
      { numRuns: 1000 }
    );
  });

  it('Property: clampCultivation strictly produces integers in [0, 1500]', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: 100000 }), (cult) => {
        const clamped = clampCultivation(cult);
        return clamped >= 0 && clamped <= MAX_CULTIVATION && Number.isInteger(clamped);
      }),
      { numRuns: 1000 }
    );
  });

  it('Property: calculateRealm matches thresholds monotonicity (500 / 1500)', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 5000 }), (cult) => {
        const realm = calculateRealm(cult);
        if (cult >= 1500) return realm === '筑基';
        if (cult >= 500) return realm === '炼气中期';
        return realm === '炼气初期';
      }),
      { numRuns: 1000 }
    );
  });

  it('Property: addCultivation never exceeds MAX_CULTIVATION and never negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_CULTIVATION }),
        fc.integer({ min: -5000, max: 5000 }),
        (initialCult, delta) => {
          const state = { ...createInitialState(), cultivation: initialCult };
          const result = addCultivation(state, delta);
          return (
            result.cultivation >= 0 &&
            result.cultivation <= MAX_CULTIVATION &&
            result.realm === calculateRealm(result.cultivation)
          );
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('Property: applyDamage never produces negative HP, and zero HP defeat restores to half max', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_HP }),
        fc.integer({ min: 0, max: 2000 }),
        fc.integer({ min: 0, max: MAX_CULTIVATION }),
        (initialHp, damage, initialCult) => {
          const state = {
            ...createInitialState(),
            hp: initialHp,
            cultivation: initialCult,
            location: '鬼市' as const,
          };
          const result = applyDamage(state, damage);

          // 无论受到多大伤害，生命绝不可为负
          if (result.hp < 0 || result.hp > MAX_HP) return false;

          // 若伤害足以致命
          if (damage >= initialHp) {
            return (
              result.location === '宗门大殿' &&
              result.hp === HALF_HP &&
              result.cultivation === Math.max(0, initialCult - 50) &&
              result.realm === calculateRealm(result.cultivation)
            );
          } else {
            return result.hp === initialHp - damage && result.location === '鬼市';
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('Property: move always costs 1 energy and never allows moving at 0 energy', () => {
    const locations: Location[] = ['宗门大殿', '鬼市', '幽冥渡口'];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_ENERGY }),
        fc.constantFrom(...locations),
        (energy, targetLoc) => {
          const state = { ...createInitialState(), energy };
          const res = move(state, targetLoc);

          if (energy < 1) {
            return !res.success && res.state.energy === 0;
          } else {
            return res.success && res.state.energy === energy - 1 && res.state.location === targetLoc;
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Property: recoverEnergyByMinutes monotonic recovery capped at MAX_ENERGY', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_ENERGY }),
        fc.integer({ min: 0, max: 10000 }),
        (initialEnergy, minutes) => {
          const state = { ...createInitialState(), energy: initialEnergy };
          const result = recoverEnergyByMinutes(state, minutes);
          const gained = Math.floor(minutes / 10);
          const expected = Math.min(MAX_ENERGY, initialEnergy + gained);
          return result.energy === expected && result.energy <= MAX_ENERGY && result.energy >= initialEnergy;
        }
      ),
      { numRuns: 500 }
    );
  });
});
