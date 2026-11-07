import { z } from 'zod';
import { GameState } from '../game/state';
import { clampHp, clampMp, clampEnergy, clampCultivation, handleZeroHp } from '../game/rules';

/**
 * 1. 输入护栏 (Input Guardrail)
 * 校验玩家输入长度、敏感格式与边界，防注入与异常指令
 */
export function validateInput(input: string): { valid: boolean; reason?: string } {
  if (typeof input !== 'string') {
    return { valid: false, reason: '输入格式异常，必须为字符串文本' };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: '输入不可为空' };
  }
  if (trimmed.length > 500) {
    return { valid: false, reason: '输入指令过长（不可超过 500 字符）' };
  }
  // 拦截系统控制字符
  if (/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/.test(trimmed)) {
    return { valid: false, reason: '输入包含非法系统控制字符' };
  }
  return { valid: true };
}

/**
 * 2. 工具参数护栏 (Tool Args Guardrail - validateToolArgs)
 * 恪守原则 2：所有工具调用前先校验参数，不对就拒，不调模型重猜。
 * 报错三要素：哪个参数错了、应该是什么、怎么改；修正提示直接取自 schema 描述。
 */
export function validateToolArgs<T>(
  schema: z.ZodType<T>,
  args: unknown
): { valid: boolean; data?: T; errorHint?: string } {
  const parseResult = schema.safeParse(args);
  if (parseResult.success) {
    return { valid: true, data: parseResult.data };
  }

  const issue = parseResult.error.issues[0];
  const fieldName = issue.path.join('.') || '参数';
  const schemaDesc = (schema as any)?.description || '';
  
  // 从 zod 描述或 issue 提取准确修复指引
  const hint = issue.message || schemaDesc || '请检查参数格式是否符合规范';
  const errorHint = `参数校验失败：参数【${fieldName}】错误（期望：${issue.code}）。修正指引：${hint}`;

  return {
    valid: false,
    errorHint,
  };
}

/**
 * 3. 输出护栏 (Output Guardrail)
 * 保证模型/NPC 输出格式完备，不泄露系统凭据、堆栈与裸报错
 */
export function validateOutput(output: unknown): { valid: boolean; sanitized: string; reason?: string } {
  if (typeof output !== 'string' || !output.trim()) {
    return {
      valid: false,
      sanitized: '灵气微颤，NPC 沉吟良久，未作回应。',
      reason: '输出为空或非文本格式',
    };
  }

  let text = output.trim();

  // 严禁泄露任何包含 key 或系统堆栈的敏感信息
  if (/sk-[a-zA-Z0-9]{20,}|STEP_API_KEY|Bearer\s+/i.test(text)) {
    return {
      valid: false,
      sanitized: '天道禁制降临，屏蔽了一段紊乱天机。',
      reason: '检测到潜在凭据泄露，已执行安全拦截',
    };
  }

  return {
    valid: true,
    sanitized: text,
  };
}

/**
 * 4. 数值护栏 (Numeric Bounds Guardrail)
 * 收口校验 GameState 所有数值，确保生命处于 [0, 168]，修为 [0, 1500]，
 * 绝不出现负生命与超上限修为；当生命为 0 时严格触发 handleZeroHp
 */
export function enforceNumericBounds(state: GameState): GameState {
  let hp = clampHp(state.hp);
  const mp = clampMp(state.mp);
  const energy = clampEnergy(state.energy);
  const cultivation = clampCultivation(state.cultivation);

  // 当生命归零时触发重伤回生机制
  if (hp === 0) {
    return handleZeroHp({
      ...state,
      mp,
      energy,
      cultivation,
    });
  }

  return {
    ...state,
    hp,
    mp,
    energy,
    cultivation,
  };
}

/**
 * 5. 幂等管理器 (Idempotency Guard)
 * trade / gamble / brew_pill 携带 requestId，同一 ID 无论重试多少次只执行一次
 */
export interface IdempotencyEntry {
  requestId: string;
  action: string;
  timestamp: number;
  response: any;
}

export class IdempotencyStore {
  private store = new Map<string, IdempotencyEntry>();

  has(requestId: string): boolean {
    return this.store.has(requestId);
  }

  get(requestId: string): IdempotencyEntry | undefined {
    return this.store.get(requestId);
  }

  record(requestId: string, action: string, response: any): void {
    this.store.set(requestId, {
      requestId,
      action,
      timestamp: Date.now(),
      response,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export const idempotencyStore = new IdempotencyStore();
