'use client';

import React, { useState, useEffect, useRef } from 'react';
import StatusBar from '@/components/StatusBar';
import Terminal, { TerminalMessage } from '@/components/Terminal';
import ConfirmCard, { ConfirmActionData } from '@/components/ConfirmCard';
import { GameState, Location, createInitialState } from '@/lib/game/state';

const STORAGE_KEY = 'youming_mud_save_v1';
const LOCATIONS: Location[] = ['宗门大殿', '鬼市', '幽冥渡口'];

export default function MudPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [inputCommand, setInputCommand] = useState('');
  const [charNameInput, setCharNameInput] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeConfirm, setActiveConfirm] = useState<ConfirmActionData | null>(null);

  const typewriterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTypingFullTextRef = useRef<string>('');
  const currentTypingMsgIdRef = useRef<string>('');

  // 1. 初始化时从 localStorage 载入存档
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.state && parsed.messages) {
          setGameState(parsed.state);
          setMessages([
            ...parsed.messages,
            {
              id: `welcome-${Date.now()}`,
              sender: 'system',
              text: `已读取云游玉简存档。道友【${parsed.state.name}】（${parsed.state.realm}），魂归永宁。`,
            },
          ]);
          setIsLoaded(true);
          return;
        }
      }
    } catch {
      // 容错处理：本地存档损毁则作为新开局
    }
    setIsLoaded(true);
  }, []);

  // 2. 存档同步写入 localStorage
  useEffect(() => {
    if (isLoaded && gameState) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ state: gameState, messages })
        );
      } catch (err) {
        console.error('保存至 localStorage 失败:', err);
      }
    }
  }, [gameState, messages, isLoaded]);

  // 打字机核心逻辑
  const startTypewriter = (
    msgId: string,
    fullText: string,
    sender: 'narrative' | 'npc' | 'system' = 'narrative',
    speaker?: string
  ) => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
    }

    currentTypingMsgIdRef.current = msgId;
    currentTypingFullTextRef.current = fullText;
    setIsTyping(true);

    let charIndex = 0;
    setMessages((prev) => [
      ...prev,
      { id: msgId, sender, speaker, text: '' },
    ]);

    typewriterTimerRef.current = setInterval(() => {
      charIndex += 2;
      if (charIndex >= fullText.length) {
        clearInterval(typewriterTimerRef.current!);
        typewriterTimerRef.current = null;
        setIsTyping(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: fullText } : m))
        );
      } else {
        const partial = fullText.slice(0, charIndex);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: partial } : m))
        );
      }
    }, 18);
  };

  // 跳过打字机
  const handleSkipTypewriter = () => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    if (currentTypingMsgIdRef.current) {
      const full = currentTypingFullTextRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === currentTypingMsgIdRef.current ? { ...m, text: full } : m
        )
      );
    }
    setIsTyping(false);
  };

  // 创建/开始新角色
  const handleStartGame = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = charNameInput.trim() || '无名弟子';
    setIsLoading(true);

    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', name: finalName }),
      });
      const data = await res.json();

      if (data.state) {
        setGameState(data.state);
        setMessages([]);
        startTypewriter(`init-${Date.now()}`, data.narrative, 'narrative', data.speaker);
      }
    } catch {
      const fallback = createInitialState(finalName);
      setGameState(fallback);
      startTypewriter(
        `fallback-${Date.now()}`,
        '【幽冥篇·初入仙途】\n永宁州，夜幕低垂。你自偏殿醒来，初涉修行。',
        'narrative'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 地点移动
  const handleMove = async (target: Location) => {
    if (!gameState || isLoading || isTyping || activeConfirm) return;
    if (target === gameState.location) return;

    const playerMsgId = `player-move-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: playerMsgId, sender: 'player', text: `前往 【${target}】` },
    ]);

    setIsLoading(true);
    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          targetLocation: target,
          state: gameState,
        }),
      });
      const data = await res.json();
      if (data.state) {
        setGameState(data.state);
      }
      startTypewriter(`move-res-${Date.now()}`, data.narrative, 'narrative');
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, sender: 'system', text: '行气受阻，灵力紊乱。' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 提交命令行指令
  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputCommand.trim();
    if (!cmd || !gameState || isLoading) return;

    setInputCommand('');
    if (isTyping) {
      handleSkipTypewriter();
    }

    const pId = `cmd-${Date.now()}`;
    setMessages((prev) => [...prev, { id: pId, sender: 'player', text: cmd }]);

    setIsLoading(true);
    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          state: gameState,
        }),
      });
      const data = await res.json();

      // 若触发了关键副作用操作，弹出 Interrupt 确认卡
      if (data.interrupt && data.confirmData) {
        setActiveConfirm(data.confirmData);
        startTypewriter(`interrupt-prompt-${Date.now()}`, data.narrative, 'system');
        return;
      }

      if (data.state) {
        setGameState(data.state);
      }
      startTypewriter(
        `cmd-res-${Date.now()}`,
        data.narrative,
        data.activeNpc ? 'npc' : 'narrative',
        data.activeNpc
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, sender: 'system', text: '幽冥之风呼啸，传真断绝。' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Interrupt 确认执行
  const handleConfirmAction = async (data: ConfirmActionData) => {
    if (!gameState || isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          confirmData: data,
          state: gameState,
        }),
      });
      const result = await res.json();
      if (result.state) {
        setGameState(result.state);
      }
      setActiveConfirm(null);
      startTypewriter(`confirm-res-${Date.now()}`, result.narrative, 'narrative');
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, sender: 'system', text: '天机反噬，操作中断。' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Interrupt 取消执行（状态保持完全不变）
  const handleCancelAction = () => {
    setActiveConfirm(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `cancel-${Date.now()}`,
        sender: 'system',
        text: '你权衡利弊后收手不发，取消了本次决断。气血灵力无损，一切如常。',
      },
    ]);
  };

  // 重新轮回（清除存档）
  const handleReset = () => {
    if (window.confirm('重入六道轮回将清除当前修仙存档，确认兵解重修？')) {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
      }
      localStorage.removeItem(STORAGE_KEY);
      setGameState(null);
      setMessages([]);
      setActiveConfirm(null);
      setIsTyping(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#070b09] flex items-center justify-center text-emerald-400 font-mono">
        <span className="animate-pulse">正在唤醒永宁州天地印记...</span>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#070b09] text-emerald-100 flex flex-col p-2 sm:p-4 max-w-4xl mx-auto font-mono selection:bg-emerald-900 selection:text-emerald-200">
      {/* 顶部标题区 */}
      <div className="flex items-center justify-between py-2 border-b border-emerald-950 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 font-bold text-base sm:text-lg tracking-wider">
            幽冥修仙 MUD
          </span>
          <span className="text-[10px] sm:text-xs text-emerald-600 border border-emerald-800/60 px-1.5 py-0.5 rounded">
            Kiroween 2026
          </span>
        </div>
        {gameState && (
          <button
            type="button"
            onClick={handleReset}
            className="text-emerald-600 hover:text-red-400 text-xs transition cursor-pointer"
          >
            [ 兵解重开 ]
          </button>
        )}
      </div>

      {!gameState ? (
        /* 未创建角色时的欢迎与起名窗口 */
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d1411] border border-emerald-800/80 rounded-xl p-6 shadow-[0_0_25px_rgba(16,185,129,0.15)] text-center space-y-5">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-widest">
                入 梦 幽 冥
              </h1>
              <p className="text-xs sm:text-sm text-emerald-500/80 leading-relaxed">
                夜沉如水，永宁州外门弟子。三处绝境，三位宿命之人。踏出此步，生死自负。
              </p>
            </div>

            <form onSubmit={handleStartGame} className="space-y-4">
              <div>
                <label className="block text-left text-xs text-emerald-400 mb-1">
                  请留下道号：
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={charNameInput}
                  onChange={(e) => setCharNameInput(e.target.value)}
                  placeholder="默认：无名弟子"
                  className="w-full bg-[#070b09] border border-emerald-700/80 rounded-lg px-3 py-2.5 text-sm text-emerald-200 placeholder-emerald-800 focus:outline-none focus:border-emerald-400 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 font-bold py-2.5 rounded-lg border border-emerald-600/70 transition shadow cursor-pointer text-sm"
              >
                {isLoading ? '正在接引...' : '踏 入 仙 途'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* 游戏主体界面 */
        <div className="flex-1 flex flex-col min-h-0 space-y-2.5 pt-2">
          {/* 状态栏 */}
          <StatusBar state={gameState} />

          {/* 若触发了 Interrupt 确认机制，展示 ConfirmCard */}
          {activeConfirm && (
            <ConfirmCard
              data={activeConfirm}
              onConfirm={handleConfirmAction}
              onCancel={handleCancelAction}
              isLoading={isLoading}
            />
          )}

          {/* 终端界面 */}
          <Terminal
            messages={messages}
            isTyping={isTyping}
            onSkipTypewriter={handleSkipTypewriter}
          />

          {/* 下部操控区 */}
          <div className="space-y-2 bg-[#0c120f] border border-emerald-950 p-2.5 sm:p-3 rounded-lg">
            {/* 三大地点跳转按钮 */}
            <div className="space-y-1">
              <div className="text-[11px] text-emerald-500/80 flex items-center justify-between">
                <span>御风御剑 · 地点穿梭（精力 -1）：</span>
                <span className="text-[10px] text-emerald-600">当前：{gameState.location}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map((loc) => {
                  const isCurrent = gameState.location === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      disabled={isCurrent || isLoading || gameState.energy < 1 || !!activeConfirm}
                      onClick={() => handleMove(loc)}
                      className={`py-2 px-1 text-xs sm:text-sm font-semibold rounded-md border transition flex flex-col items-center justify-center cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-950/40 text-emerald-500 border-emerald-900/60 cursor-default'
                          : gameState.energy < 1
                          ? 'bg-black/40 text-neutral-600 border-neutral-900 cursor-not-allowed'
                          : 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border-emerald-700/60 active:scale-[0.98]'
                      }`}
                    >
                      <span>{loc}</span>
                      <span className="text-[10px] opacity-75">
                        {isCurrent ? '(当前)' : '-1 精力'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 常用快捷指令 & 剧情核心交互 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] text-emerald-600 shrink-0">行动：</span>
              {gameState.location === '鬼市' && (
                <>
                  <button
                    type="button"
                    onClick={() => setInputCommand('买引魂灯')}
                    className="px-2 py-1 rounded bg-amber-950/60 border border-amber-700/70 text-amber-200 text-xs shrink-0 cursor-pointer"
                  >
                    置办引魂灯 (交易)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputCommand('赌命')}
                    className="px-2 py-1 rounded bg-rose-950/60 border border-rose-700/70 text-rose-200 text-xs shrink-0 cursor-pointer"
                  >
                    夜枭赌局 (赌命)
                  </button>
                </>
              )}
              {gameState.location === '宗门大殿' && (
                <button
                  type="button"
                  onClick={() => setInputCommand('开炉炼丹')}
                  className="px-2 py-1 rounded bg-cyan-950/60 border border-cyan-700/70 text-cyan-200 text-xs shrink-0 cursor-pointer"
                >
                  开炉炼丹 (洗髓丹)
                </button>
              )}
              {gameState.location === '幽冥渡口' && (
                <button
                  type="button"
                  onClick={() => setInputCommand('渡口引魂')}
                  className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-600/80 text-emerald-200 text-xs shrink-0 cursor-pointer font-bold"
                >
                  渡口引魂 (通关决战)
                </button>
              )}
              <button
                type="button"
                onClick={() => setInputCommand('打坐')}
                className="px-2 py-1 rounded bg-[#070b09] border border-emerald-900 hover:border-emerald-600 text-emerald-400 text-xs shrink-0 cursor-pointer"
              >
                打坐恢复
              </button>
              <button
                type="button"
                onClick={() => setInputCommand('向药老请教洗髓丹方')}
                className="px-2 py-1 rounded bg-[#070b09] border border-emerald-900 hover:border-emerald-600 text-emerald-400 text-xs shrink-0 cursor-pointer"
              >
                问药老丹方
              </button>
            </div>

            {/* 命令行输入框 */}
            <form onSubmit={handleSendCommand} className="flex gap-2">
              <input
                type="text"
                value={inputCommand}
                disabled={!!activeConfirm}
                onChange={(e) => setInputCommand(e.target.value)}
                placeholder={
                  activeConfirm
                    ? '请先完成上方的生死抉择确认...'
                    : '输入指令，如：买灯 / 赌命 / 炼丹 / 问药老丹方 / 打坐...'
                }
                className="flex-1 bg-[#070b09] border border-emerald-800/80 rounded-md px-3 py-2 text-xs sm:text-sm text-emerald-100 placeholder-emerald-800/70 focus:outline-none focus:border-emerald-400 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputCommand.trim() || !!activeConfirm}
                className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 disabled:bg-emerald-950/50 disabled:text-emerald-800 text-emerald-200 rounded-md border border-emerald-700/80 text-xs sm:text-sm font-bold transition cursor-pointer shrink-0"
              >
                执行
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
