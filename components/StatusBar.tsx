'use client';

import React from 'react';
import {
  GameState,
  MAX_HP,
  MAX_MP,
  MAX_ENERGY,
  MAX_CULTIVATION,
} from '@/lib/game/state';

interface StatusBarProps {
  state: GameState;
}

export default function StatusBar({ state }: StatusBarProps) {
  const hpPercent = Math.min(100, Math.max(0, (state.hp / MAX_HP) * 100));
  const mpPercent = Math.min(100, Math.max(0, (state.mp / MAX_MP) * 100));
  const energyPercent = Math.min(100, Math.max(0, (state.energy / MAX_ENERGY) * 100));
  const cultPercent = Math.min(100, Math.max(0, (state.cultivation / MAX_CULTIVATION) * 100));

  return (
    <header className="border border-emerald-900/60 bg-[#0d1411]/90 rounded-lg p-3 text-xs sm:text-sm font-mono shadow-[0_0_15px_rgba(16,185,129,0.08)]">
      {/* 角色与境界 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-950 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold tracking-wider">{state.name}</span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 text-[11px]">
            {state.realm}
          </span>
        </div>
        <div className="flex items-center gap-3 text-emerald-400/80">
          <span>所在：<strong className="text-emerald-300">{state.location}</strong></span>
          <span>攻击：<strong className="text-emerald-300">{state.attack}</strong></span>
        </div>
      </div>

      {/* 四大数值槽 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 生命 */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-emerald-400/90">
            <span>生命 (HP)</span>
            <span>{state.hp}/{MAX_HP}</span>
          </div>
          <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-emerald-950">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* 灵力 */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-emerald-400/90">
            <span>灵力 (MP)</span>
            <span>{state.mp}/{MAX_MP}</span>
          </div>
          <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-emerald-950">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-teal-400 transition-all duration-300"
              style={{ width: `${mpPercent}%` }}
            />
          </div>
        </div>

        {/* 精力 */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-emerald-400/90">
            <span>精力 (Energy)</span>
            <span>{state.energy}/{MAX_ENERGY}</span>
          </div>
          <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-emerald-950">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-300"
              style={{ width: `${energyPercent}%` }}
            />
          </div>
        </div>

        {/* 修为 */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-emerald-400/90">
            <span>修为 (Cultivation)</span>
            <span>{state.cultivation}/{MAX_CULTIVATION}</span>
          </div>
          <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-emerald-950">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
              style={{ width: `${cultPercent}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
