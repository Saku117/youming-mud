import { Annotation, messagesStateReducer, StateGraph, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { BaseMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { GameState, createInitialState } from '../game/state';
import {
  NPC_PERSONAS,
  QINGXU_TOOLS,
  YAOLAO_TOOLS,
  YEXIAO_TOOLS,
  SUPERVISOR_TOOLS,
} from './npcs';

/**
 * 严格按照要求读取 .env.local 中的环境变量
 * 不硬编码模型名，不虚构其它 endpoint
 */
export function getChatModel(temperature = 0.2) {
  const model = process.env.STEP_MODEL;
  const apiKey = process.env.STEP_API_KEY;
  const baseURL = process.env.STEP_BASE_URL;

  if (!model || !apiKey || !baseURL) {
    throw new Error(
      '环境变量缺少 STEP_MODEL, STEP_API_KEY 或 STEP_BASE_URL。'
    );
  }

  return new ChatOpenAI({
    model,
    apiKey,
    configuration: {
      baseURL,
    },
    temperature,
  });
}

/**
 * State key caution:
 * ToolNode 默认将工具执行结果写入 channels 中的 `messages` 键。
 * 如果 reducer 键不叫 messages，工具返回的 ToolMessage 会被静默丢弃！
 */
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  gameState: Annotation<GameState>({
    reducer: (curr, update) => update ?? curr,
    default: () => createInitialState(),
  }),
  targetNpc: Annotation<string | null>({
    reducer: (curr, update) => update ?? curr,
    default: () => null,
  }),
  activeNpc: Annotation<string | null>({
    reducer: (curr, update) => update ?? curr,
    default: () => null,
  }),
});

export type AgentStateType = typeof AgentState.State;

/**
 * 1. Router 节点：负责且仅负责分流到唯一的 NPC，分流完成即下场
 */
function routerNode(state: AgentStateType) {
  let target: '掌门清虚' | '药老' | '鬼市商人夜枭' | 'supervisor' = '掌门清虚';

  // 若前端显式指定了交互的 NPC
  if (state.targetNpc && NPC_PERSONAS[state.targetNpc as keyof typeof NPC_PERSONAS]) {
    target = state.targetNpc as '掌门清虚' | '药老' | '鬼市商人夜枭';
    return { activeNpc: target };
  }

  const lastMsg = state.messages[state.messages.length - 1];
  const content = typeof lastMsg?.content === 'string' ? lastMsg.content : '';

  // 关键词意图分流
  if (/药老|炼丹|丹药|丹方|药草|洗髓丹|聚气散|筑基丹/.test(content)) {
    target = '药老';
  } else if (/夜枭|鬼市|买|卖|交易|赌|货|法宝|引魂灯/.test(content)) {
    target = '鬼市商人夜枭';
  } else if (/掌门|清虚|任务|主线|引魂|结算|宗门/.test(content)) {
    target = '掌门清虚';
  } else if (state.gameState.location === '鬼市') {
    target = '鬼市商人夜枭';
  } else if (state.gameState.location === '宗门大殿') {
    target = '掌门清虚';
  }

  return { activeNpc: target };
}

function routeTarget(state: AgentStateType): string {
  switch (state.activeNpc) {
    case '药老':
      return 'yaolao';
    case '鬼市商人夜枭':
      return 'yexiao';
    case 'supervisor':
      return 'supervisor';
    case '掌门清虚':
    default:
      return 'qingxu';
  }
}

/**
 * 2. 掌门清虚节点
 */
async function qingxuNode(state: AgentStateType) {
  const model = getChatModel();
  const bound = model.bindTools(QINGXU_TOOLS);
  const system = new SystemMessage(
    `${NPC_PERSONAS.掌门清虚}\n当前弟子状态：道号【${state.gameState.name}】，境界【${state.gameState.realm}】，修为【${state.gameState.cultivation}】。`
  );
  const response = await bound.invoke([system, ...state.messages]);
  return { messages: [response], activeNpc: '掌门清虚' };
}

/**
 * 3. 药老节点
 */
async function yaolaoNode(state: AgentStateType) {
  const model = getChatModel();
  const bound = model.bindTools(YAOLAO_TOOLS);
  const system = new SystemMessage(
    `${NPC_PERSONAS.药老}\n当前弟子状态：道号【${state.gameState.name}】，境界【${state.gameState.realm}】。`
  );
  const response = await bound.invoke([system, ...state.messages]);
  return { messages: [response], activeNpc: '药老' };
}

/**
 * 4. 鬼市商人夜枭节点
 */
async function yexiaoNode(state: AgentStateType) {
  const model = getChatModel();
  const bound = model.bindTools(YEXIAO_TOOLS);
  const system = new SystemMessage(
    `${NPC_PERSONAS.鬼市商人夜枭}\n当前弟子所在：【${state.gameState.location}】，道号【${state.gameState.name}】。`
  );
  const response = await bound.invoke([system, ...state.messages]);
  return { messages: [response], activeNpc: '鬼市商人夜枭' };
}

/**
 * 5. Supervisor 节点（仅用于主线剧情多步协调，不持有任何员工工具）
 */
async function supervisorNode(state: AgentStateType) {
  const model = getChatModel();
  // Supervisor 绝不绑定具体 worker 工具
  const system = new SystemMessage(
    `${NPC_PERSONAS.supervisor}\n当前全盘状态：${JSON.stringify({
      location: state.gameState.location,
      quests: state.gameState.quests,
      realm: state.gameState.realm,
    })}`
  );
  const response = await model.invoke([system, ...state.messages]);
  return { messages: [response], activeNpc: 'supervisor' };
}

/**
 * 工具判定：若 NPC 输出带有 tool_calls，则转去工具节点执行；否则本轮对话结束
 */
function shouldContinueQingxu(state: AgentStateType) {
  const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
  if (lastMsg?.tool_calls && lastMsg.tool_calls.length > 0) {
    return 'qingxu_tools';
  }
  return END;
}

function shouldContinueYaolao(state: AgentStateType) {
  const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
  if (lastMsg?.tool_calls && lastMsg.tool_calls.length > 0) {
    return 'yaolao_tools';
  }
  return END;
}

function shouldContinueYexiao(state: AgentStateType) {
  const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
  if (lastMsg?.tool_calls && lastMsg.tool_calls.length > 0) {
    return 'yexiao_tools';
  }
  return END;
}

/**
 * 构建并编译 LangGraph 图
 */
export function createMudGraph() {
  const graph = new StateGraph(AgentState)
    // 注册所有业务节点
    .addNode('router', routerNode)
    .addNode('qingxu', qingxuNode)
    .addNode('yaolao', yaolaoNode)
    .addNode('yexiao', yexiaoNode)
    .addNode('supervisor', supervisorNode)
    // 注册非重叠工具节点（ToolNode 将结果写入 messages）
    .addNode('qingxu_tools', new ToolNode(QINGXU_TOOLS))
    .addNode('yaolao_tools', new ToolNode(YAOLAO_TOOLS))
    .addNode('yexiao_tools', new ToolNode(YEXIAO_TOOLS));

  // 起点先经过 Router 分流
  graph.addEdge(START, 'router');

  // Router 条件路由到唯一 NPC
  graph.addConditionalEdges('router', routeTarget, {
    qingxu: 'qingxu',
    yaolao: 'yaolao',
    yexiao: 'yexiao',
    supervisor: 'supervisor',
  });

  // 每个 NPC 工具循环：NPC -> ToolNode -> NPC -> END
  graph.addConditionalEdges('qingxu', shouldContinueQingxu, {
    qingxu_tools: 'qingxu_tools',
    [END]: END,
  });
  graph.addEdge('qingxu_tools', 'qingxu');

  graph.addConditionalEdges('yaolao', shouldContinueYaolao, {
    yaolao_tools: 'yaolao_tools',
    [END]: END,
  });
  graph.addEdge('yaolao_tools', 'yaolao');

  graph.addConditionalEdges('yexiao', shouldContinueYexiao, {
    yexiao_tools: 'yexiao_tools',
    [END]: END,
  });
  graph.addEdge('yexiao_tools', 'yexiao');

  // Supervisor 运行后直接结束本步
  graph.addEdge('supervisor', END);

  return graph.compile();
}
