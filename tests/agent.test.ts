import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { StateGraph, START, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AIMessage, ToolMessage, HumanMessage } from '@langchain/core/messages';
import {
  AgentState,
  getChatModel,
} from '../lib/agent/graph';
import {
  QINGXU_TOOLS,
  YAOLAO_TOOLS,
  YEXIAO_TOOLS,
  SUPERVISOR_TOOLS,
  search_knowledge,
} from '../lib/agent/npcs';

// 确保单测执行时安全读入 .env.local 变量
beforeAll(() => {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...rest] = trimmed.split('=');
        const key = k.trim();
        const val = rest.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
});

describe('LangGraph Agent & Tool Architecture', () => {
  it('should guarantee tools across 3 NPCs are non-overlapping and supervisor has none', () => {
    const qingxuNames = new Set<string>(QINGXU_TOOLS.map((t) => t.name));
    const yaolaoNames = new Set<string>(YAOLAO_TOOLS.map((t) => t.name));
    const yexiaoNames = new Set<string>(YEXIAO_TOOLS.map((t) => t.name));

    expect(qingxuNames.size).toBe(3);
    expect(yaolaoNames.size).toBe(2);
    expect(yexiaoNames.size).toBe(3);
    expect(SUPERVISOR_TOOLS.length).toBe(0);

    // 掌门 vs 药老 不重叠
    for (const name of qingxuNames) {
      expect(yaolaoNames.has(name)).toBe(false);
      expect(yexiaoNames.has(name)).toBe(false);
    }

    // 药老 vs 夜枭 不重叠
    for (const name of yaolaoNames) {
      expect(yexiaoNames.has(name)).toBe(false);
    }
  });

  it('State key caution: ToolNode writes to messages, reducer appends ToolMessage without loss (Full Round-trip)', async () => {
    // 搭建单工具执行测试子图
    const toolGraph = new StateGraph(AgentState)
      .addNode('tools', new ToolNode(YAOLAO_TOOLS))
      .addEdge(START, 'tools')
      .addEdge('tools', END)
      .compile();

    const toolCallId = 'test-call-roundtrip-1';
    const input = {
      messages: [
        new HumanMessage('药老，洗髓丹可有记载？'),
        new AIMessage({
          content: '',
          tool_calls: [
            {
              id: toolCallId,
              name: 'search_knowledge',
              args: { query: '洗髓丹' },
            },
          ],
        }),
      ],
    };

    const result = await toolGraph.invoke(input);

    // 验证经过 ToolNode -> messagesStateReducer 全链路，messages 未丢失，ToolMessage 成功追加
    expect(result.messages.length).toBe(3);
    const finalMsg = result.messages[2];
    expect(finalMsg).toBeInstanceOf(ToolMessage);
    expect((finalMsg as ToolMessage).tool_call_id).toBe(toolCallId);
    expect((finalMsg as ToolMessage).name).toBe('search_knowledge');
    expect(finalMsg.content).toContain('紫猴花');
  });

  it('search_knowledge strictly refuses to hallucinate unknown recipes', async () => {
    // 知识库中不存在的丹方
    const fakeRes = await search_knowledge.invoke({ query: '九转还魂通天神丹' });
    const parsed = JSON.parse(fakeRes);
    expect(parsed.found).toBe(false);
    expect(parsed.message).toContain('藏经阁无此记载');

    // 知识库中存在的丹方
    const realRes = await search_knowledge.invoke({ query: '洗髓丹' });
    const realParsed = JSON.parse(realRes);
    expect(realParsed.found).toBe(true);
    expect(realParsed.content).toContain('太上九转经');
  });

  it('getChatModel reads STEP_MODEL and STEP_BASE_URL from env without hardcoding', () => {
    expect(process.env.STEP_MODEL).toBeDefined();
    expect(process.env.STEP_BASE_URL).toBeDefined();

    const model = getChatModel();
    // @ts-ignore
    expect(model.modelName || model.model).toBe(process.env.STEP_MODEL);
  });
});
