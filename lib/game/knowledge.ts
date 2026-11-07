export interface KnowledgeItem {
  id: string;
  name: string;
  type: '丹方' | '功法' | '要义';
  ingredients: string[];
  effect: string;
  source: string;
  description: string;
}

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'xisui_dan',
    name: '洗髓丹',
    type: '丹方',
    ingredients: ['紫猴花一株', '天灵果一枚', '洗骨草三株'],
    effect: '涤荡肉身杂质，洗练经脉，增益修为 120 点',
    source: '太上九转经',
    description: '外门弟子伐毛洗髓之无上圣品，服之经脉通畅，真气充盈。',
  },
  {
    id: 'juqi_san',
    name: '聚气散',
    type: '丹方',
    ingredients: ['凝血草二钱', '活气果一品'],
    effect: '调和气血，即刻恢复 30 点灵力',
    source: '炼气真解',
    description: '炼气期修士吐纳打坐常用灵药，气血亏虚时效果显著。',
  },
  {
    id: 'zhuji_dan',
    name: '筑基丹',
    type: '丹方',
    ingredients: ['玄冰花一朵', '地火芝一株', '百年筑基草三钱'],
    effect: '助炼气大圆满修士破关筑基，奠定道基',
    source: '玄天宝录',
    description: '夺天地造化之丹，药力极为狂暴，未达炼气大圆满切忌轻尝。',
  },
  {
    id: 'yinhun_fa',
    name: '引魂之法',
    type: '要义',
    ingredients: ['引魂灯一盏', '纯阳鬼火一簇'],
    effect: '照破幽冥弱水阴煞，安引亡魂度过忘川',
    source: '幽冥古卷',
    description: '幽冥渡口水深千尺，阴煞噬魂，凡胎不可渡。唯执引魂灯可开辟生路。',
  },
  {
    id: 'tianlei_jue',
    name: '天雷诀',
    type: '功法',
    ingredients: ['引九天玄雷淬体'],
    effect: '主攻伐，雷威赫赫，杀力提升 15 点，诛邪不侵',
    source: '九霄御雷篇',
    description: '正道阳刚至极之神通，对阴魂恶煞有摧枯拉朽之威。',
  },
  {
    id: 'butian_wan',
    name: '补天芝丸',
    type: '丹方',
    ingredients: ['九叶灵芝半片', '太阴玄参一两'],
    effect: '固本培元，恢复生命 80 点',
    source: '丹道本草',
    description: '疗伤圣药，重伤垂危之际服之可护住心脉不绝。',
  },
  {
    id: 'youhun_huxin',
    name: '幽魂护心丹',
    type: '丹方',
    ingredients: ['幽冥鬼草三株', '黄泉白骨花一朵'],
    effect: '抵御鬼市阴煞噬体，防御倍增',
    source: '冥河异闻录',
    description: '以幽冥死气炼生机，专御阴毒入体。',
  },
  {
    id: 'huichun_san',
    name: '回春散',
    type: '丹方',
    ingredients: ['金银花两钱', '清心草一株'],
    effect: '平抚体内浮躁心魔，恢复 20 点精力',
    source: '百草经',
    description: '气定神清，调息宁气之常备散剂。',
  },
  {
    id: 'lianxi_shu',
    name: '敛息术',
    type: '功法',
    ingredients: ['闭合周身七经八脉'],
    effect: '隐匿灵力波动如同凡木，避开强敌神识探查',
    source: '玄影真经',
    description: '行走鬼市等凶险之地必备之保命秘术。',
  },
  {
    id: 'taixu_naqi',
    name: '太虚纳气诀',
    type: '功法',
    ingredients: ['引幽冥阴阳二气归于气海'],
    effect: '日常打坐运转大周天，精力恢复效率提升',
    source: '太虚入门篇',
    description: '永宁州立派基础心法，中正平和，绵延不绝。',
  },
];

/**
 * 严格基于 knowledge.ts 的纯关键字匹配检索
 * 不使用向量嵌入（StepFun 无公开向量模型，严禁凭空臆造）
 */
export function searchKnowledge(query: string): {
  found: boolean;
  item?: KnowledgeItem;
  message: string;
} {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      found: false,
      message: '藏经阁无此记载',
    };
  }

  // 严格按名称或关键字匹配
  for (const item of KNOWLEDGE_BASE) {
    if (trimmed.includes(item.name) || item.name.includes(trimmed)) {
      return {
        found: true,
        item,
        message: `【${item.name}】出处《${item.source}》。配方/要义：${item.ingredients.join('、')}。功效：${item.effect}。`,
      };
    }
  }

  return {
    found: false,
    message: '藏经阁无此记载',
  };
}
