import { NextRequest, NextResponse } from 'next/server';
import { GameState, Location, createInitialState } from '@/lib/game/state';
import { move, recoverEnergyByMinutes } from '@/lib/game/rules';

const OPENING_STORY = `【幽冥篇·初入仙途】
永宁州，夜幕低垂，阴气渐起。你自果林边的小宗门醒来，身为刚入门的外门弟子，年方十六，初踏仙路。
宗门大殿内孤灯摇曳，掌门清虚端坐其上；山门外鬼市暗流涌动；更远处幽冥渡口的引魂灯依稀可见。
前路凶吉难料，唯有自身修为方为立足之本。`;

const LOCATION_DESCRIPTIONS: Record<Location, string> = {
  宗门大殿: `【宗门大殿】
殿内青烟缭绕，肃穆清冷。掌门清虚真人闭目盘坐，法相庄严。
偏殿隐隐传来药香，药老正埋首于经卷丹方之中。
可在此拜见掌门或请教药老。`,
  鬼市: `【鬼市】
四周阴雾缭绕，幽幽绿火在两侧摊位跳跃。商贾皆戴厉鬼面具，窃窃私语不绝于耳。
鬼市商人夜枭正倚在摊旁，眼角斜睨着过往修士。
可在此寻夜枭置办奇物法器。`,
  幽冥渡口: `【幽冥渡口】
黑水滔滔，阴风刺骨。渡口边立着一根斑驳引魂石柱，彼岸阴森莫测。
若无引魂灯照路，凡胎肉身难渡弱水。此处乃是幽冥渡魂之要津。`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, name, targetLocation, command, state } = body as {
      action?: string;
      name?: string;
      targetLocation?: Location;
      command?: string;
      state?: GameState;
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

    // 2. 地点移动
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

      return NextResponse.json({
        success: true,
        narrative: `你御风潜行，消耗 1 点精力，抵达了【${targetLocation}】。\n\n${LOCATION_DESCRIPTIONS[targetLocation]}`,
        state: moveRes.state,
      });
    }

    // 3. 命令行输入处理
    if (command) {
      const trimmed = command.trim();

      // 去/移动到某地
      if (trimmed.includes('大殿') || trimmed.includes('宗门')) {
        const moveRes = move(state, '宗门大殿');
        return NextResponse.json({
          success: moveRes.success,
          narrative: moveRes.success
            ? `你前往【宗门大殿】（精力 -1）。\n\n${LOCATION_DESCRIPTIONS['宗门大殿']}`
            : `【行动受阻】${moveRes.reason}`,
          state: moveRes.state,
        });
      }

      if (trimmed.includes('鬼市')) {
        const moveRes = move(state, '鬼市');
        return NextResponse.json({
          success: moveRes.success,
          narrative: moveRes.success
            ? `你前往【鬼市】（精力 -1）。\n\n${LOCATION_DESCRIPTIONS['鬼市']}`
            : `【行动受阻】${moveRes.reason}`,
          state: moveRes.state,
        });
      }

      if (trimmed.includes('渡口') || trimmed.includes('幽冥')) {
        const moveRes = move(state, '幽冥渡口');
        return NextResponse.json({
          success: moveRes.success,
          narrative: moveRes.success
            ? `你前往【幽冥渡口】（精力 -1）。\n\n${LOCATION_DESCRIPTIONS['幽冥渡口']}`
            : `【行动受阻】${moveRes.reason}`,
          state: moveRes.state,
        });
      }

      // 打坐恢复
      if (trimmed.includes('打坐') || trimmed.includes('休息')) {
        const updated = recoverEnergyByMinutes(state, 50); // 恢复 5 点精力
        const recovered = updated.energy - state.energy;
        return NextResponse.json({
          success: true,
          narrative: `你收摄心神，引天地灵气归体打坐片刻，精力恢复了 ${recovered} 点。`,
          state: updated,
        });
      }

      // 查看四周
      if (trimmed.includes('看') || trimmed.includes('查') || trimmed.includes('四周')) {
        return NextResponse.json({
          success: true,
          narrative: LOCATION_DESCRIPTIONS[state.location],
          state,
        });
      }

      // 通用命令提示
      return NextResponse.json({
        success: true,
        narrative: `此处是【${state.location}】。\n你尝试施为：“${trimmed}”，但四周阴风不息，暂无回响。\n提示：可前往【宗门大殿】、【鬼市】、【幽冥渡口】，或输入“打坐”、“查看四周”。`,
        state,
      });
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
