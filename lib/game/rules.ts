import {
  GameState,
  Location,
  Realm,
  MAX_HP,
  MAX_MP,
  MAX_ENERGY,
  MAX_CULTIVATION,
  HALF_HP,
} from './state';

/**
 * 境界完全由修为单调映射决定，避免 NPC 对话或客户端状态产生分歧
 */
export function calculateRealm(cultivation: number): Realm {
  if (cultivation >= 1500) return '筑基';
  if (cultivation >= 500) return '炼气中期';
  return '炼气初期';
}

/**
 * 护栏：保障生命值严格处于 [0, MAX_HP]，绝不出现负生命与超上限
 */
export function clampHp(hp: number): number {
  if (Number.isNaN(hp)) return 0;
  return Math.min(MAX_HP, Math.max(0, Math.floor(hp)));
}

/**
 * 护栏：修为严格处于 [0, MAX_CULTIVATION]，防止越界或下溢
 */
export function clampCultivation(cultivation: number): number {
  if (Number.isNaN(cultivation)) return 0;
  return Math.min(MAX_CULTIVATION, Math.max(0, Math.floor(cultivation)));
}

/**
 * 护栏：精力处于 [0, MAX_ENERGY]
 */
export function clampEnergy(energy: number): number {
  if (Number.isNaN(energy)) return 0;
  return Math.min(MAX_ENERGY, Math.max(0, Math.floor(energy)));
}

/**
 * 护栏：灵力处于 [0, MAX_MP]
 */
export function clampMp(mp: number): number {
  if (Number.isNaN(mp)) return 0;
  return Math.min(MAX_MP, Math.max(0, Math.floor(mp)));
}

/**
 * 增加或扣减修为并自动刷新境界，边界被硬护栏限制
 */
export function addCultivation(state: GameState, amount: number): GameState {
  const nextCultivation = clampCultivation(state.cultivation + amount);
  return {
    ...state,
    cultivation: nextCultivation,
    realm: calculateRealm(nextCultivation),
  };
}

/**
 * 玩家生命归零时触发重伤回生机制：回大殿、扣50修为（不低于0）、生命回复至半满
 */
export function handleZeroHp(state: GameState): GameState {
  const nextCultivation = clampCultivation(state.cultivation - 50);
  return {
    ...state,
    location: '宗门大殿',
    hp: HALF_HP,
    cultivation: nextCultivation,
    realm: calculateRealm(nextCultivation),
  };
}

/**
 * 扣减生命值，若生命降至 0 则自动走重伤回宗门结算
 */
export function applyDamage(state: GameState, damage: number): GameState {
  if (damage <= 0) return state;
  const nextHp = clampHp(state.hp - damage);
  if (nextHp === 0) {
    return handleZeroHp({ ...state, hp: 0 });
  }
  return {
    ...state,
    hp: nextHp,
  };
}

/**
 * 移动到指定地点，消耗 1 点精力；精力不足时移动失败
 */
export function move(
  state: GameState,
  targetLocation: Location
): { success: boolean; state: GameState; reason?: string } {
  if (state.energy < 1) {
    return {
      success: false,
      state,
      reason: '精力不足，需打坐恢复后方可前行',
    };
  }

  return {
    success: true,
    state: {
      ...state,
      energy: clampEnergy(state.energy - 1),
      location: targetLocation,
    },
  };
}

/**
 * 按真实经过时间恢复精力（每10分钟恢复1点，上限100）
 */
export function recoverEnergyByMinutes(state: GameState, minutesPassed: number): GameState {
  if (minutesPassed <= 0) return state;
  const gained = Math.floor(minutesPassed / 10);
  if (gained <= 0) return state;
  return {
    ...state,
    energy: clampEnergy(state.energy + gained),
  };
}
