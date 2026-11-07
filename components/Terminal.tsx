'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface TerminalMessage {
  id: string;
  sender: 'narrative' | 'player' | 'system' | 'npc';
  speaker?: string;
  text: string;
  timestamp?: number;
}

interface TerminalProps {
  messages: TerminalMessage[];
  isTyping: boolean;
  onSkipTypewriter?: () => void;
  onSelectOption?: (option: string) => void;
}

export default function Terminal({
  messages,
  isTyping,
  onSkipTypewriter,
  onSelectOption,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 每次消息更新或打字机推进时保持滚动在底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-[#070b09] border border-emerald-950/80 rounded-lg overflow-hidden shadow-inner font-mono text-sm">
      {/* 终端顶栏装饰与跳过按钮 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0b120e] border-b border-emerald-950 text-xs text-emerald-500/70 select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-900 border border-emerald-700/50 inline-block animate-pulse" />
          <span>永宁州·幽冥传真终端</span>
        </div>
        {isTyping && onSkipTypewriter && (
          <button
            type="button"
            onClick={onSkipTypewriter}
            className="px-2 py-0.5 rounded bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs transition cursor-pointer"
          >
            跳过打字 ⏩
          </button>
        )}
      </div>

      {/* 终端消息区 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scroll-smooth text-slate-200"
      >
        {messages.map((msg, index) => {
          const isLatest = index === messages.length - 1;

          if (msg.sender === 'player') {
            return (
              <div key={msg.id} className="flex items-start text-cyan-300">
                <span className="text-cyan-500 font-bold mr-2 select-none">&gt;</span>
                <span className="font-semibold">{msg.text}</span>
              </div>
            );
          }

          if (msg.sender === 'system') {
            return (
              <div
                key={msg.id}
                className="p-2 rounded bg-amber-950/30 border-l-2 border-amber-500 text-amber-200 text-xs sm:text-sm"
              >
                <span className="font-bold text-amber-400 mr-1.5">【法则】</span>
                <span>{msg.text}</span>
              </div>
            );
          }

          if (msg.sender === 'npc') {
            return (
              <div
                key={msg.id}
                className="p-2.5 rounded bg-emerald-950/40 border border-emerald-900/60 text-emerald-200 space-y-1"
              >
                <div className="text-xs text-emerald-400 font-bold tracking-wide">
                  ◆ {msg.speaker || '神秘之人'}
                </div>
                <div className="leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                  {isLatest && isTyping && (
                    <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            );
          }

          // narrative 剧情叙事
          return (
            <div
              key={msg.id}
              className="text-emerald-100/90 leading-relaxed whitespace-pre-wrap py-1"
            >
              {msg.text}
              {isLatest && isTyping && (
                <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
