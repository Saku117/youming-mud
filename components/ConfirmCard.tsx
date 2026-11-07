'use client';

import React from 'react';

export interface ConfirmActionData {
  type: 'trade' | 'gamble' | 'brew_pill' | 'ferry_cross';
  title: string;
  description: string;
  cost: string;
  gain: string;
  requestId: string;
  payload?: any;
}

interface ConfirmCardProps {
  data: ConfirmActionData;
  onConfirm: (data: ConfirmActionData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmCard({
  data,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmCardProps) {
  return (
    <div className="my-3 p-3.5 sm:p-4 rounded-lg bg-[#140f0f] border-2 border-rose-700/80 shadow-[0_0_20px_rgba(225,29,72,0.2)] font-mono animate-in fade-in zoom-in-95 duration-200">
      {/* 警示标题 */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-rose-900/60">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-rose-400 font-bold text-sm sm:text-base tracking-wide">
            【生死抉择 · 人工确认】{data.title}
          </span>
        </div>
        <span className="text-[10px] text-rose-500/70 border border-rose-900 px-1.5 py-0.5 rounded">
          副作用预警
        </span>
      </div>

      {/* 详细描述 */}
      <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed mb-3">
        {data.description}
      </p>

      {/* 代价与收益对照 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {/* 代价 */}
        <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50">
          <div className="text-[11px] text-rose-400 font-bold mb-1 flex items-center gap-1">
            <span>⚠ 需付出代价 (Cost)</span>
          </div>
          <div className="text-xs sm:text-sm text-rose-200 font-semibold">
            {data.cost}
          </div>
        </div>

        {/* 收益 */}
        <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/50">
          <div className="text-[11px] text-emerald-400 font-bold mb-1 flex items-center gap-1">
            <span>✦ 可能获得收益 (Gain)</span>
          </div>
          <div className="text-xs sm:text-sm text-emerald-200 font-semibold">
            {data.gain}
          </div>
        </div>
      </div>

      {/* 确认 / 取消 按钮栏 */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          disabled={isLoading}
          onClick={onCancel}
          className="px-3.5 py-1.5 rounded-md bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs sm:text-sm font-medium transition cursor-pointer"
        >
          取消行动 (状态不变)
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onConfirm(data)}
          className="px-4 py-1.5 rounded-md bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-900/40 border border-rose-500 transition cursor-pointer"
        >
          {isLoading ? '天命流转中...' : '确认执行 (落子无悔)'}
        </button>
      </div>
    </div>
  );
}
