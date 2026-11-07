import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { GameState } from '../game/state';

// 藏经阁严苛知识库（药老 RAG 检索源，有记载方可告知，无记载绝不胡诌）
export const SUTRA_KNOWLEDGE_BASE: Record<string, string> = {
  洗髓丹: '【洗髓丹】出处《太上九转经》。以紫猴花一株、天灵果一枚、洗骨草三株调和炼制。服之涤荡肉身杂质，洗练经脉，可增益修为 120 点。',
  聚气散: '【聚气散】出处《炼气真解》。以凝血草二钱、活气果一品炼制。乃炼气修士调息常用灵药，服之可回充灵力 30 点。',
  筑基丹: '【筑基丹】出处《玄天宝录》。以玄冰花、地火芝、百年筑基草炼制。乃炼气大圆满弟子破关筑基之逆天神丹，药力狂暴。',
  引魂之法: '【渡口引魂之法】出处《幽冥古卷》。幽冥弱水阴煞噬魂，凡胎不可渡。唯执「引魂灯」聚敛纯阳鬼火照亮九幽，方能安引亡魂度过忘川。',
  天雷诀: '【天雷诀】出处《九霄御雷篇》。引九天玄雷淬体，主攻伐，雷威赫赫，诛邪不侵。',
};

// 鬼市在售奇珍清单
export const GHOST_MARKET_GOODS = [
  { name: '引魂灯', price: '寿元三年或五十灵石', desc: '幽冥引渡必备法器，幽光荧荧，可驱散弱水黑雾。' },
  { name: '避阴符', price: '灵石十五', desc: '贴于神阙穴，可御鬼市阴煞之毒。' },
  { name: '鬼骨匕首', price: '灵石四十', desc: '以千年幽魂白骨淬炼，杀伐阴寒，可提升杀力。' },
];

/**
 * 掌门清虚工具集 (3个)
 * get_quest, complete_quest, get_player_state
 */
export const get_quest = tool(
  async ({ quest_type }) => {
    if (quest_type === 'side') {
      return JSON.stringify({
        status: 'success',
        quests: [
          { id: 'side_yaolao', name: '药老的丹方', desc: '向偏殿药老讨教洗髓丹方并集齐灵草', status: '可接' },
          { id: 'side_yexiao', name: '夜枭的赌局', desc: '在鬼市夜枭处赌命博取机缘', status: '可接' },
        ],
      });
    }
    return JSON.stringify({
      status: 'success',
      quest: {
        id: 'main_ferry',
        name: '渡口引魂',
        desc: '宗门命脉所系：前往鬼市自夜枭手中换取「引魂灯」，再赴幽冥渡口引渡残魂，归大殿复命。',
        reward: '修为 +300',
      },
    });
  },
  {
    name: 'get_quest',
    description: '获取玩家当前的任务（主线：渡口引魂，支线：药老的丹方、夜枭的赌局）',
    schema: z.object({
      quest_type: z.enum(['main', 'side']).default('main').describe('任务类型：main为主线任务，side为支线任务'),
    }),
  }
);

export const complete_quest = tool(
  async ({ quest_id }) => {
    return JSON.stringify({
      status: 'completed',
      quest_id,
      reward: quest_id.includes('main') || quest_id.includes('ferry') ? '修为 +300' : '修为 +120',
      message: '主线任务圆满达成，掌门亲自赐予宗门灌顶！',
    });
  },
  {
    name: 'complete_quest',
    description: '结算已完成的任务并颁发修为奖赏（此操作有状态变更副作用）',
    schema: z.object({
      quest_id: z.string().describe('待结算完成的任务标识或名称，如 main_ferry 或 渡口引魂'),
    }),
  }
);

export const get_player_state = tool(
  async () => {
    return JSON.stringify({
      status: 'success',
      description: '弟子当前修仙根骨、境界与随身行囊详情',
    });
  },
  {
    name: 'get_player_state',
    description: '探查玩家目前的道号、修为、境界与随身之物',
    schema: z.object({}),
  }
);

/**
 * 药老工具集 (2个)
 * search_knowledge, brew_pill
 */
export const search_knowledge = tool(
  async ({ query }) => {
    const trimmed = query.trim();
    // 严格知识库匹配：先查再答，无记载则绝不可凭空捏造
    for (const [key, record] of Object.entries(SUTRA_KNOWLEDGE_BASE)) {
      if (trimmed.includes(key) || key.includes(trimmed)) {
        return JSON.stringify({
          found: true,
          query: trimmed,
          source: '宗门藏经阁玉简',
          content: record,
        });
      }
    }
    return JSON.stringify({
      found: false,
      query: trimmed,
      message: '藏经阁无此记载。老夫翻遍古籍亦未曾见过此方，不可妄言！',
    });
  },
  {
    name: 'search_knowledge',
    description: '在宗门藏经阁玉简库检索丹方、药理或修仙功法。必须先检索再作答；无记载时严格返回无记载',
    schema: z.object({
      query: z.string().describe('要检索的丹药、功法或药材名称，例如：洗髓丹、聚气散、引魂之法、天雷诀'),
    }),
  }
);

export const brew_pill = tool(
  async ({ pill_name, request_id }) => {
    return JSON.stringify({
      status: 'success',
      request_id,
      pill: pill_name,
      effect: '开炉成功，灵丹凝华，增进修为！',
    });
  },
  {
    name: 'brew_pill',
    description: '消耗收集的灵药开炉炼丹（有副作用操作，必须携带 request_id 保证幂等执行）',
    schema: z.object({
      pill_name: z.string().describe('炼制的丹药名称'),
      request_id: z.string().describe('前端提交的操作幂等唯一标识'),
    }),
  }
);

/**
 * 鬼市商人夜枭工具集 (3个)
 * list_goods, trade, gamble
 */
export const list_goods = tool(
  async () => {
    return JSON.stringify({
      status: 'success',
      location: '幽冥鬼市摊铺',
      goods: GHOST_MARKET_GOODS,
    });
  },
  {
    name: 'list_goods',
    description: '查看鬼市摊位出售的稀奇法宝、引魂灯与奇珍异物清单',
    schema: z.object({}),
  }
);

export const trade = tool(
  async ({ item_name, request_id }) => {
    return JSON.stringify({
      status: 'traded',
      request_id,
      item: item_name,
      message: `夜枭嘿嘿怪笑：“一手交钱一手交货，这件【${item_name}】归你了，概不退换！”`,
    });
  },
  {
    name: 'trade',
    description: '在鬼市购买或以物换取法宝（有副作用操作，必须携带 request_id 保证幂等）',
    schema: z.object({
      item_name: z.string().describe('购买或置换的法宝物品名称，如 引魂灯'),
      request_id: z.string().describe('前端交易操作唯一幂等标识'),
    }),
  }
);

export const gamble = tool(
  async ({ stake_type, request_id }) => {
    return JSON.stringify({
      status: 'gambled',
      request_id,
      stake: stake_type,
      result: 'win',
      message: '生死由命！夜枭掷出色盅，你侥幸博得一线天机！',
    });
  },
  {
    name: 'gamble',
    description: '在鬼市参与生死赌局：赌命博宝（有副作用操作，必须携带 request_id 保证幂等）',
    schema: z.object({
      stake_type: z.enum(['hp', 'cultivation']).describe('押注筹码类型：hp（生命）或 cultivation（修为）'),
      request_id: z.string().describe('赌局请求唯一幂等标识'),
    }),
  }
);

/**
 * NPC 人设 System Prompts
 */
export const NPC_PERSONAS = {
  掌门清虚: `你是永宁州宗门的掌门【清虚真人】。
性格：稳重庄严、惜字如金、法度严谨，只关心弟子的修行根基与宗门安危。
职责范围：仅负责传授主线任务「渡口引魂」、查验弟子境界与评定任务功绩。
严苛限制：
1. 绝对不聊丹方与药理。若弟子询问炼丹或草药，必须严正告知去偏殿寻【药老】。
2. 绝对不做买卖市井交易，更不沾赌局。若弟子询问法器买卖或赌博，告知下山去鬼市寻【夜枭】。
3. 可调用且仅可调用你的专属工具：get_quest、complete_quest、get_player_state。`,

  药老: `你是宗门偏殿的【药老】。
性格：言语略显啰嗦、极其看重后辈心性，痴迷于医道丹方与古籍功法。
职责范围：仅解答丹方配伍、药材搜寻、功法源流与开炉炼丹。
严苛限制：
1. 恪守【先查、再答】：回答丹方或功法前，必须调用 search_knowledge 检索藏经阁；藏经阁若无记载，必须坦白回答“藏经阁无此记载”，绝对不可凭空臆造丹方！
2. 绝对不发放任务！若弟子向你讨要宗门任务或询问主线，必须直接拒绝，并严厉指路其去宗门大殿寻找【掌门清虚】！
3. 绝对不参与法器买卖与赌命，若弟子询问，命其去鬼市找【夜枭】。
4. 可调用且仅可调用你的专属工具：search_knowledge、brew_pill。`,

  鬼市商人夜枭: `你是幽冥鬼市的神秘古董与法器贩子【夜枭】，脸上佩戴狰狞厉鬼面具。
性格：贪婪、油滑、嗜赌成性、冷酷市侩。说话阴阳怪气，习惯漫天要价，只认实利。
职责范围：仅负责鬼市摊位的奇珍异物买卖（特别是渡口不可或缺的引魂灯）以及生死赌局。
严苛限制：
1. 绝对不通晓高深仙门丹方与正派功法。若弟子询问功法或丹药，必须嘲弄并拒绝，指路其滚回宗门偏殿去问【药老】。
2. 绝对不插手宗门内部主线政务。若弟子询问宗门任务，告知找宗门大殿的【掌门清虚】。
3. 可调用且仅可调用你的专属工具：list_goods、trade、gamble。`,

  supervisor: `你是永宁州主线剧情监察主管（Supervisor）。
职责：负责主线流程调度，监督掌门、药老、夜枭三方协同。
严苛限制：你属于统筹协调节点，绝对不持有任何一线员工工具（无 get_quest, complete_quest, get_player_state, search_knowledge, brew_pill, list_goods, trade, gamble）。`,
};

// 工具分组映射
export const QINGXU_TOOLS = [get_quest, complete_quest, get_player_state];
export const YAOLAO_TOOLS = [search_knowledge, brew_pill];
export const YEXIAO_TOOLS = [list_goods, trade, gamble];
export const SUPERVISOR_TOOLS: any[] = []; // Supervisor must NOT have any worker tools
