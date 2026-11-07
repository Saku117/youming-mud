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
可在此拜见掌门接取主线、结算功德，或向药老请教丹方。`,
  鬼市: `【鬼市】
四周阴雾缭绕，幽幽绿火在两侧摊位跳跃。商贾皆戴厉鬼面具，窃窃私语不绝于耳。
鬼市商人夜枭正倚在摊旁，眼角斜睨着过往修士。
可在此置办引魂灯或赌命博取法器。`,
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
      const { requestId, type, payload } = confirmData;

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
        // 支线2：夜枭的赌局（支持胜/负两类结果测试）
        const forcedOutcome = payload?.outcome;
        const isWin = forcedOutcome ? forcedOutcome === 'win' : Math.random() < 0.6;

        updated = applyDamage(updated, 20);

        if (isWin) {
          if (updated.hp > 0) {
            const hasItem = updated.inventory.includes('幽冥鬼骨刃');
            updated = {
              ...updated,
              attack: updated.attack + 15,
              inventory: hasItem ? updated.inventory : [...updated.inventory, '幽冥鬼骨刃'],
              quests: {
                ...updated.quests,
                夜枭的赌局: '已完成(胜)',
              },
            };
            updated = addCultivation(updated, 50);
            narrative = '【生死赌局 · 大胜】色盅揭开，阴火长明！你承受了 20 点气血损耗，但侥幸博得头彩，夜枭愿赌服输，将极品法宝【幽冥鬼骨刃】抛入你怀中！（攻击 +15，修为 +50）';
          } else {
            narrative = '【生死赌局 · 重伤】色盅揭开煞气反噬！你气血枯竭重伤倒地，神魂受挫，已被宗门大阵接引回大殿修养。';
          }
        } else {
          updated = {
            ...updated,
            quests: {
              ...updated.quests,
              夜枭的赌局: '已完成(负)',
            },
          };
          if (updated.hp > 0) {
            narrative = '【生死赌局 · 惜败】色盅揭开，骨骰呈凶煞之象！夜枭桀桀怪笑，幽冥煞气席卷而来，你损耗了 20 点生命，颗粒无收！';
          } else {
            narrative = '【生死赌局 · 重伤】你未能抗过赌局反噬，气血归零，重伤败退回宗门大殿。';
          }
        }
      } else if (type === 'trade') {
        // 主线步骤2：鬼市换取引魂灯
        updated = {
          ...updated,
          energy: Math.max(0, updated.energy - 10),
          inventory: updated.inventory.includes('引魂灯')
            ? updated.inventory
            : [...updated.inventory, '引魂灯'],
          quests: {
            ...updated.quests,
            渡口引魂: '已得灯',
          },
        };
        narrative = '【鬼市交易 · 达成】夜枭冷笑数声，将一盏散发幽幽绿火的【引魂灯】递到你手中：“一手交钱一手交货，引魂去吧，走好不送！”（行囊已添置引魂灯，主线推进至：前往幽冥渡口）';
      } else if (type === 'brew_pill') {
        // 支线1：药老开炉炼洗髓丹
        const nextInv = updated.inventory.filter(
          (item) => item !== '紫猴花' && item !== '天灵果' && item !== '洗骨草'
        );
        updated = {
          ...updated,
          mp: Math.max(0, updated.mp - 30),
          inventory: [...nextInv, '洗髓丹'],
          quests: {
            ...updated.quests,
            药老的丹方: '已完成',
          },
        };
        updated = addCultivation(updated, 120);
        narrative = '【开炉炼丹 · 功成】药炉三转，紫气氤氲！药老拂袖收火，一枚圆滚滚的【洗髓丹】落入玉盘之中。服之药力化开，经络齐畅，修为猛增 120 点！';
      } else if (type === 'ferry_cross') {
        // 主线步骤3：幽冥渡口引魂
        const filteredInv = updated.inventory.filter((item) => item !== '引魂灯');
        updated = {
          ...updated,
          energy: Math.max(0, updated.energy - 20),
          inventory: filteredInv,
          quests: {
            ...updated.quests,
            渡口引魂: '待复命',
          },
        };
        narrative = '【渡口引魂 · 告捷】引魂灯幽芒刺破忘川黑雾，九幽残魂随你法诀安然引渡！渡口弱水渐平，阴煞退去。请速速御风回【宗门大殿】，向掌门清虚复命结算功德！';
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

    // 4. 指令输入处理（主线/支线剧情 + 护栏 + Interrupt 拦截）
    if (command) {
      const inputCheck = validateInput(command);
      if (!inputCheck.valid) {
        return NextResponse.json({
          success: false,
          narrative: `【道心不稳 · 指令受拒】${inputCheck.reason}`,
          state,
        });
      }

      const trimmed = command.trim();

      // (1) 主线「渡口引魂」：掌门发任务
      if (/接任务|主线|渡口引魂/.test(trimmed) && state.location === '宗门大殿') {
        const questStatus = state.quests['渡口引魂'];
        if (questStatus === '待复命') {
          // 主线步骤4：回大殿结算
          const completedState = enforceNumericBounds({
            ...state,
            quests: { ...state.quests, 渡口引魂: '已完成' },
          });
          const awarded = addCultivation(completedState, 300);
          return NextResponse.json({
            success: true,
            narrative: `【主线结算 · 功德圆满】\n掌门清虚真人微微颔首，目露赞许之色：“善！渡口九幽残魂得以安息，宗门气运大定！本座依约为你醍醐灌顶！”\n纯阳灵力自顶门灌入，周身经脉齐鸣，修为大涨 300 点！（当前境界：${awarded.realm}，修为：${awarded.cultivation}）`,
            state: awarded,
          });
        }

        if (questStatus === '已完成') {
          return NextResponse.json({
            success: true,
            narrative: '掌门清虚温言道：“主线任务「渡口引魂」你已圆满达成，道基稳固。好生打坐修习，早日破关筑基！”',
            state,
          });
        }

        const nextQuests = { ...state.quests, 渡口引魂: '进行中' as const };
        return NextResponse.json({
          success: true,
          narrative: '【主线接取 · 渡口引魂】\n掌门清虚神色凝重：“永宁州阴阳紊乱，幽冥渡口残魂滞留。命你前往【鬼市】寻夜枭置办【引魂灯】，再赴【幽冥渡口】引渡残魂，事成后归大殿复命！宗门赐你灌顶修为 300 点！”',
          state: { ...state, quests: nextQuests },
        });
      }

      // (2) 主线「渡口引魂」：回大殿结算
      if (/结算|复命|交任务/.test(trimmed) && state.location === '宗门大殿') {
        if (state.quests['渡口引魂'] === '待复命') {
          const completedState = enforceNumericBounds({
            ...state,
            quests: { ...state.quests, 渡口引魂: '已完成' },
          });
          const awarded = addCultivation(completedState, 300);
          return NextResponse.json({
            success: true,
            narrative: `【主线结算 · 功德圆满】\n掌门清虚真人拂尘轻扫，灌顶灵力沛然而至：“九幽残魂引渡归寂，宗门无忧矣！此 300 点修为赐予你，愿你道心坚定，早日筑基！”（当前境界：${awarded.realm}）`,
            state: awarded,
          });
        }
        if (state.quests['渡口引魂'] === '已完成') {
          return NextResponse.json({
            success: true,
            narrative: '掌门清虚闭目微阖：“任务已然结算，勿复多言，且自修行去吧。”',
            state,
          });
        }
      }

      // (3) 支线1「药老的丹方」：搜集灵草
      if (/采药|搜集灵草|采灵草|摘草/.test(trimmed)) {
        const needed = ['紫猴花', '天灵果', '洗骨草'];
        const currentInv = new Set(state.inventory);
        for (const herb of needed) currentInv.add(herb);

        const updated = {
          ...state,
          inventory: Array.from(currentInv),
          quests: {
            ...state.quests,
            药老的丹方: '灵草已齐',
          },
        };
        return NextResponse.json({
          success: true,
          narrative: '【采药搜集 · 齐备】你在后山药圃与阴阳绝壁处探寻良久，采得【紫猴花】一株、【天灵果】一枚、【洗骨草】三株！药材已备齐，可去大殿偏殿寻药老开炉炼丹！',
          state: updated,
        });
      }

      // (4) 触发买引魂灯 -> Interrupt 确认卡
      if (/买灯|换灯|引魂灯|置办引魂灯/.test(trimmed)) {
        if (state.location !== '鬼市') {
          return NextResponse.json({
            success: false,
            narrative: '此处乃是【' + state.location + '】，夜枭不在身前。请先前往【鬼市】再行置办引魂灯！',
            state,
          });
        }
        const requestId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const confirmData: ConfirmActionData = {
          type: 'trade',
          title: '鬼市置办引魂灯',
          description: '自夜枭摊位换取关键主线法器【引魂灯】，渡口渡魂必备之物。',
          cost: '精力 10 点，三年阳寿或灵石',
          gain: '获得法宝【引魂灯】，推进主线「渡口引魂」',
          requestId,
        };
        return NextResponse.json({
          success: true,
          interrupt: true,
          confirmData,
          narrative: '夜枭提着一盏幽幽磷火的引魂灯，嘴角扯出一抹诡异冷笑：“小道友，想要此灯，可想清楚了？”',
          state,
        });
      }

      // (5) 触发渡口引魂 -> Interrupt 确认卡
      if (/引魂|渡魂|渡口引魂|渡河/.test(trimmed)) {
        if (state.location !== '幽冥渡口') {
          return NextResponse.json({
            success: false,
            narrative: '此处非弱水绝境，需前往【幽冥渡口】方可行引魂之事！',
            state,
          });
        }
        if (!state.inventory.includes('引魂灯')) {
          return NextResponse.json({
            success: false,
            narrative: '【无法引魂】幽冥弱水阴煞噬骨！行囊中未见【引魂灯】，凡体肉身触之即溃。请先前往【鬼市】寻夜枭置办引魂灯！',
            state,
          });
        }
        const requestId = `ferry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const confirmData: ConfirmActionData = {
          type: 'ferry_cross',
          title: '幽冥渡口引渡残魂',
          description: '高举引魂灯破开弱水黑雾，施展法印接引万千滞留残魂。',
          cost: '消耗法宝【引魂灯】，精力 20 点',
          gain: '主线「渡口引魂」大功告成，待回大殿向掌门复命（修为 +300）',
          requestId,
        };
        return NextResponse.json({
          success: true,
          interrupt: true,
          confirmData,
          narrative: '弱水狂浪滔天，鬼哭狼嚎。引魂灯幽火暴涨，正是渡魂吉时，是否点燃法印？',
          state,
        });
      }

      // (6) 触发开炉炼丹 -> Interrupt 确认卡
      if (/炼丹|炼洗髓丹|开炉/.test(trimmed)) {
        if (state.location !== '宗门大殿') {
          return NextResponse.json({
            success: false,
            narrative: '丹炉设在【宗门大殿】偏殿药老处，请先返回大殿！',
            state,
          });
        }
        const hasHerbs =
          state.inventory.includes('紫猴花') &&
          state.inventory.includes('天灵果') &&
          state.inventory.includes('洗骨草');
        if (!hasHerbs) {
          return NextResponse.json({
            success: false,
            narrative: '药老扫了眼你的袖口，连连摆手：“灵药尚未凑齐！洗髓丹需紫猴花、天灵果、洗骨草，且去输入“采药”寻齐药材再来！”',
            state,
          });
        }
        const requestId = `brew-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const confirmData: ConfirmActionData = {
          type: 'brew_pill',
          title: '药老开炉炼制洗髓丹',
          description: '开三昧真火融炼三大灵草，洗练肉身浊气。',
          cost: '消耗紫猴花、天灵果、洗骨草，损耗 30 点灵力',
          gain: '炼得【洗髓丹】，涤荡经络，修为增益 120 点',
          requestId,
        };
        return NextResponse.json({
          success: true,
          interrupt: true,
          confirmData,
          narrative: '药老拂袖启炉，炉膛地火腾起数尺，沉声问你是否下料开炉？',
          state,
        });
      }

      // (7) 触发夜枭赌局 -> Interrupt 确认卡
      if (/赌命|赌局|赌一把|押注/.test(trimmed)) {
        if (state.location !== '鬼市') {
          return NextResponse.json({
            success: false,
            narrative: '此处并无赌摊，请前往【鬼市】寻找商人夜枭参与赌局！',
            state,
          });
        }
        const requestId = `gamble-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const confirmData: ConfirmActionData = {
          type: 'gamble',
          title: '夜枭的生死赌局',
          description: '夜枭摇动黑骨色盅，与你对赌幽冥机缘。',
          cost: '损耗生命 20 点（若生命为 0 则重伤回大殿，修为 -50）',
          gain: '胜则获鬼市秘宝【幽冥鬼骨刃】（攻击 +15，修为 +50）；负则白白折损气血',
          requestId,
        };
        return NextResponse.json({
          success: true,
          interrupt: true,
          confirmData,
          narrative: '夜枭阴森怪笑：“色盅既落，生死难料。小辈，当真敢押上性命搏一把？”',
          state,
        });
      }

      // 移动快捷指令
      if (trimmed.includes('大殿') || trimmed.includes('宗门')) {
        const moveRes = move(state, '宗门大殿');
        return NextResponse.json({
          success: moveRes.success,
          narrative: moveRes.success
            ? `你御风回到【宗门大殿】（精力 -1）。\n\n${LOCATION_DESCRIPTIONS['宗门大殿']}`
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
          narrative: `此处是【${state.location}】。\n你尝试施为：“${trimmed}”，四周阴风不息。\n提示：可前往【宗门大殿】、【鬼市】、【幽冥渡口】，或输入“接任务”、“置办引魂灯”、“采药”、“开炉炼丹”、“渡口引魂”。`,
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
