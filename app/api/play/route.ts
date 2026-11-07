import { NextRequest, NextResponse } from 'next/server';
import { GameState, Location, createInitialState } from '@/lib/game/state';
import { move, recoverEnergyByMinutes, addCultivation, applyDamage } from '@/lib/game/rules';
import {
  validateInput,
  validateOutput,
  enforceNumericBounds,
  idempotencyStore,
} from '@/lib/agent/guardrails';
import { createMudGraph } from '@/lib/agent/graph';
import { HumanMessage } from '@langchain/core/messages';
import { ConfirmActionData } from '@/components/ConfirmCard';

const OPENING_STORY = `【幽冥篇·初入仙途】
永宁州，夜幕低垂，阴气渐起。你自果林边的小宗门醒来，身为刚入门的外门弟子，年方十六，初踏仙路。
宗门大殿内孤灯摇曳，掌门清虚端坐其上；山门外鬼市暗流涌动；更远处幽冥渡口的引魂灯依稀可见。
前路凶吉难料，唯有自身修为方为立足之本。`;

const LOCATION_DESCRIPTIONS: Record<Location, string> = {
  宗门大殿: `【宗门大殿】
殿内青烟缭绕，肃穆清冷。掌门清虚真人闭目盘坐，法相庄严。
偏殿隐隐传来药香，药老正埋首于经卷丹方之中。
可在此拜见掌门或向药老请教丹方。`,
  鬼市: `【鬼市】
四周阴雾缭绕，幽幽绿火在两侧摊位跳跃。商贾皆戴厉鬼面具，窃窃私语不绝于耳。
鬼市商人夜枭正倚在摊旁，眼角斜睨着过往修士。
可在此寻夜枭置办引魂灯或赌命博取法宝。`,
  幽冥渡口: `【幽冥渡口】
黑水滔滔，阴风刺骨。渡口边立着一根斑驳引魂石柱，彼岸阴森莫测。
若无引魂灯照路，凡胎肉身难渡弱水。此处乃是幽冥渡魂之要津。`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, name, targetLocation, command, state, confirmData } = body as {
      action?: string;
      name?: string;
      targetLocation?: Location;
      command?: string;
      state?: GameState;
      confirmData?: ConfirmActionData;
    };

    // 1. 初始化新角色 / 开场固定剧情
    if (action === 'init' || !state) {
      const initial = createInitialState(name?.trim() || '无名弟子');
      return NextResponse.json({
        success: true,
        narrative: OPENING_STORY,
        state: initial,
        speaker: '说书人',
      });
    }

    // 2. 确认执行中断的关键副作用操作 (Interrupt Confirmation + 幂等防重)
    if (action === 'confirm' && confirmData) {
      const { requestId, type } = confirmData;

      // 幂等防重校验：同一 requestId 若已执行过，则直接返回上次执行状态，绝不重复扣费！
      if (idempotencyStore.has(requestId)) {
        const cached = idempotencyStore.get(requestId)!;
        return NextResponse.json({
          success: true,
          idempotent: true,
          narrative: `【天道印记 · 幂等生效】此笔操作此前已由法印记录（requestId: ${requestId}），未再扣除额外代价。`,
          state: cached.response.state,
        });
      }

      let updated = { ...state };
      let narrative = '';

      if (type === 'gamble') {
        // 赌局：扣 20 生命，若存活则修为 +50
        updated = applyDamage(updated, 20);
        if (updated.hp > 0) {
          updated = addCultivation(updated, 50);
          narrative = '【生死赌局 · 结算】色盅揭开！阴火剧震，你虽损耗了 20 点生命，但机缘巧合窥得一丝天机，修为增益 50 点！';
        } else {
          narrative = '【生死赌局 · 结算】煞气蚀骨！你抵受不住赌局反噬重伤倒地，神魂受挫，已被宗门大阵接引回大殿修养。';
        }
      } else if (type === 'trade') {
        // 交易引魂灯：扣 10 精力，行囊增加「引魂灯」
        updated = {
          ...updated,
          energy: Math.max(0, updated.energy - 10),
          inventory: updated.inventory.includes('引魂灯')
            ? updated.inventory
            : [...updated.inventory, '引魂灯'],
          quests: {
            ...updated.quests,
            渡口引魂: updated.quests['渡口引魂'] === '已完成' ? '已完成' : '进行中',
          },
        };
        narrative = '【鬼市交易 · 达成】夜枭冷笑数声，将一盏散发幽幽绿火的【引魂灯】递到你手中：“一手交钱一手交货，走好不送！”（行囊已添置引魂灯）';
      } else if (type === 'brew_pill') {
        // 炼丹：消耗 30 灵力，获得洗髓丹并增进 120 修为
        updated = {
          ...updated,
          mp: Math.max(0, updated.mp - 30),
          inventory: [...updated.inventory, '洗髓丹'],
        };
        updated = addCultivation(updated, 120);
        narrative = '【开炉炼丹 · 功成】药炉三转，紫气氤氲！药老拂袖收火，一枚圆滚滚的【洗髓丹】落入玉盘之中。服之药力化开，经络齐畅，修为猛增 120 点！';
      } else if (type === 'ferry_cross') {
        // 渡口引魂：消耗引魂灯与 20 精力，完成主线，修为 +300
        const filteredInv = updated.inventory.filter((item) => item !== '引魂灯');
        updated = {
          ...updated,
          energy: Math.max(0, updated.energy - 20),
          inventory: filteredInv,
          quests: {
            ...updated.quests,
            渡口引魂: '已完成',
          },
        };
        updated = addCultivation(updated, 300);
        narrative = '【渡口引魂 · 大圆满】引魂灯幽芒刺破忘川黑雾，九幽残魂随你法诀安然引渡！天地生出祥瑞，天道功德灌体，主线大功告成，修为大涨 300 点！';
      }

      // 数值护栏拦截
      const finalState = enforceNumericBounds(updated);

      // 记录幂等缓存
      idempotencyStore.record(requestId, type, { state: finalState, narrative });

      return NextResponse.json({
        success: true,
        narrative,
        state: finalState,
      });
    }

    // 3. 地点移动
    if (action === 'move' && targetLocation) {
      if (state.location === targetLocation) {
        return NextResponse.json({
          success: true,
          narrative: `你已身在【${targetLocation}】。\n\n${LOCATION_DESCRIPTIONS[targetLocation]}`,
          state,
        });
      }

      const moveRes = move(state, targetLocation);
      if (!moveRes.success) {
        return NextResponse.json({
          success: false,
          narrative: `【行动受阻】${moveRes.reason || '无法移动'}`,
          state,
        });
      }

      const bounded = enforceNumericBounds(moveRes.state);
      return NextResponse.json({
        success: true,
        narrative: `你御风潜行，消耗 1 点精力，抵达了【${targetLocation}】。\n\n${LOCATION_DESCRIPTIONS[targetLocation]}`,
        state: bounded,
      });
    }

    // 4. 指令输入处理（含输入护栏与有副作用操作的 Interrupt 拦截）
    if (command) {
      // 输入护栏检验
      const inputCheck = validateInput(command);
      if (!inputCheck.valid) {
        return NextResponse.json({
          success: false,
          narrative: `【道心不稳 · 指令受拒】${inputCheck.reason}`,
          state,
        });
      }

      const trimmed = command.trim();

      // (A) 触发生死赌局 -> 必须通过 interrupt 确认卡
      if (/赌命|赌局|赌一把|押注/.test(trimmed)) {
        const requestId = `gamble-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const confirmData: ConfirmActionData = {
          type: 'gamble',
          title: '夜枭的生死赌局',
          description: '夜枭摇晃着黑骨色盅，目光阴鸷：“小道友，生死有命，富贵在天，可敢与我赌一把？”',
          cost: '生命 20 点（若生命归零将重伤回大殿并扣减修为）',
          gain: '增益修为 50 点，并得一缕幽冥天机',
          requestId,
        };
        return NextResponse.json({
          success: true,
          interrupt: true,
          confirmData,
          narrative: '夜枭狞笑着摆开黑骨色盅，此乃生死赌局，需神魂立誓后方可开盅。',
          state,
        });
      }

      // (B) 触发买引魂灯 -> 必须通过 interrupt 确认卡
      if (/买灯|换灯|引魂灯|交易/.test(trimmed)) {
        const requestId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const confirmData: ConfirmActionData = {
          type: 'trade',
          title: '鬼市置办引魂灯',
          description: '从夜枭摊位购置关键主线法器【引魂灯】，渡口渡魂必备。',
          cost: '精力 10 点，并交付三年阳寿或灵石',
          gain: '获得法器【引魂灯】，开启主线渡口引魂',
          requestId,
        };
        return NextResponse.json({
          success: true,
          interrupt: true,
          confirmData,
          narrative: '夜枭抚摸着惨绿的引魂灯，开出了沉甸甸的价码，请三思而行。',
          state,
        });
      }

      // (C) 触发开炉炼丹 -> 必须通过 interrupt 确认卡
      if (/炼丹|炼洗髓丹|开炉/.test(trimmed)) {
        const requestId = `brew-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const confirmData: ConfirmActionData = {
          type: 'brew_pill',
          title: '药老开炉炼洗髓丹',
          description: '药老引三昧真火开炉，以紫猴花、天灵果、洗骨草炼制洗髓灵丹。',
          cost: '灵力 30 点',
          gain: '获得【洗髓丹】，涤荡经脉，增益修为 120 点',
          requestId,
        };
        return NextResponse.json({
          success: true,
          interrupt: true,
          confirmData,
          narrative: '药老正色拂袖：“起炉耗费心神灵力，开炉不可中辍，你可当真做好了准备？”',
          state,
        });
      }

      // (D) 触发渡口引魂 -> 必须通过 interrupt 确认卡
      if (/引魂|渡魂|渡口引魂|过河|渡河/.test(trimmed)) {
        if (!state.inventory.includes('引魂灯')) {
          return NextResponse.json({
            success: false,
            narrative: '【无法引魂】幽冥弱水阴煞翻涌！你手中未持【引魂灯】，凡胎肉身难渡弱水，请先赴鬼市寻夜枭置办引魂灯！',
            state,
          });
        }
        const requestId = `ferry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const confirmData: ConfirmActionData = {
          type: 'ferry_cross',
          title: '幽冥渡口引渡残魂',
          description: '燃起纯阳鬼火引魂灯，直面弱水阴煞，引渡九幽亡魂回魂转世。',
          cost: '消耗法器【引魂灯】，精力 20 点',
          gain: '达成主线「渡口引魂」，宗门重赏，修为 +300 点',
          requestId,
        };
        return NextResponse.json({
          success: true,
          interrupt: true,
          confirmData,
          narrative: '弱水惊涛拍岸，冷煞袭体。引魂灯在狂风中明灭不定，踏出此步即是主线大决战！',
          state,
        });
      }

      // 移动快捷指令
      if (trimmed.includes('大殿') || trimmed.includes('宗门')) {
        const moveRes = move(state, '宗门大殿');
        return NextResponse.json({
          success: moveRes.success,
          narrative: moveRes.success
            ? `你前往【宗门大殿】（精力 -1）。\n\n${LOCATION_DESCRIPTIONS['宗门大殿']}`
            : `【行动受阻】${moveRes.reason}`,
          state: enforceNumericBounds(moveRes.state),
        });
      }

      if (trimmed.includes('鬼市')) {
        const moveRes = move(state, '鬼市');
        return NextResponse.json({
          success: moveRes.success,
          narrative: moveRes.success
            ? `你前往【鬼市】（精力 -1）。\n\n${LOCATION_DESCRIPTIONS['鬼市']}`
            : `【行动受阻】${moveRes.reason}`,
          state: enforceNumericBounds(moveRes.state),
        });
      }

      if (trimmed.includes('渡口') || trimmed.includes('幽冥')) {
        const moveRes = move(state, '幽冥渡口');
        return NextResponse.json({
          success: moveRes.success,
          narrative: moveRes.success
            ? `你前往【幽冥渡口】（精力 -1）。\n\n${LOCATION_DESCRIPTIONS['幽冥渡口']}`
            : `【行动受阻】${moveRes.reason}`,
          state: enforceNumericBounds(moveRes.state),
        });
      }

      // 打坐恢复
      if (trimmed.includes('打坐') || trimmed.includes('休息')) {
        const updated = recoverEnergyByMinutes(state, 50);
        const recovered = updated.energy - state.energy;
        return NextResponse.json({
          success: true,
          narrative: `你收摄心神，引天地灵气归体打坐片刻，精力恢复了 ${recovered} 点。`,
          state: enforceNumericBounds(updated),
        });
      }

      // 其它普通对话或查询，交由 LangGraph 处理
      try {
        const graph = createMudGraph();
        const graphResult = await graph.invoke({
          messages: [new HumanMessage(trimmed)],
          gameState: state,
        });

        const lastMsg = graphResult.messages[graphResult.messages.length - 1];
        const outCheck = validateOutput(lastMsg?.content);
        return NextResponse.json({
          success: true,
          narrative: outCheck.sanitized,
          state: enforceNumericBounds(graphResult.gameState || state),
          activeNpc: graphResult.activeNpc,
        });
      } catch {
        return NextResponse.json({
          success: true,
          narrative: `此处是【${state.location}】。\n你尝试施为：“${trimmed}”，四周阴风不息。\n提示：可前往【宗门大殿】、【鬼市】、【幽冥渡口】，或输入“打坐”、“买灯”、“炼丹”、“赌命”。`,
          state,
        });
      }
    }

    return NextResponse.json({
      success: true,
      narrative: LOCATION_DESCRIPTIONS[state.location],
      state,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : '未知异常';
    return NextResponse.json(
      { success: false, error: errMessage, narrative: '灵力紊乱，稍后再试。' },
      { status: 500 }
    );
  }
}
