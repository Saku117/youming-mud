export type Realm = '炼气初期' | '炼气中期' | '筑基';
export type Location = '宗门大殿' | '鬼市' | '幽冥渡口';
export type QuestStatus =
  | '未接'
  | '进行中'
  | '已得灯'
  | '待复命'
  | '搜集灵草'
  | '灵草已齐'
  | '已完成'
  | '已完成(胜)'
  | '已完成(负)'
  | string;

export interface GameState {
  name: string;
  realm: Realm;
  hp: number; // 生命，上限 168
  mp: number; // 灵力，上限 111
  energy: number; // 精力，上限 100，每 10 分钟 +1
  cultivation: number; // 修为，500 升中期、1500 筑基
  attack: number;
  location: Location;
  quests: Record<string, QuestStatus>;
  inventory: string[];
}

export const MAX_HP = 168;
export const MAX_MP = 111;
export const MAX_ENERGY = 100;
export const MAX_CULTIVATION = 1500;
export const HALF_HP = Math.floor(MAX_HP / 2); // 84

export const INITIAL_STATE: Readonly<GameState> = {
  name: '无名弟子',
  realm: '炼气初期',
  hp: MAX_HP,
  mp: MAX_MP,
  energy: MAX_ENERGY,
  cultivation: 0,
  attack: 10,
  location: '宗门大殿',
  quests: {},
  inventory: [],
};

export function createInitialState(name: string = '无名弟子'): GameState {
  return {
    ...INITIAL_STATE,
    name,
    quests: {},
    inventory: [],
  };
}
