/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Mic, MicOff, Square, Send, Loader2, Sparkles } from 'lucide-react';
import { SessionState } from '../types';

export interface UnifiedInputBarProps {
  sessionState: SessionState;
  isMuted: boolean;
  onStartVoice: () => void;
  onEndVoice: () => void;
  onToggleMute: () => void;
  onSendMessage: (text: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'hero' | 'panel';
}

export const UnifiedInputBar = ({
  sessionState,
  isMuted,
  onStartVoice,
  onEndVoice,
  onToggleMute,
  onSendMessage,
  placeholder,
  className = '',
  variant = 'hero',
}: UnifiedInputBarProps) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isConnecting =
    sessionState === 'requesting-permission' || sessionState === 'connecting';
  const isActiveVoice =
    sessionState === 'listening' ||
    sessionState === 'speaking' ||
    sessionState === 'thinking' ||
    sessionState === 'muted';

  const defaultPlaceholder = isActiveVoice
    ? 'Type a message or speak out loud...'
    : 'Type a message or tap mic to speak...';

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isHero = variant === 'hero';

  return (
    <div className={`w-full flex flex-col items-center gap-2 ${className}`}>
      {/* Active Voice Session Status Badge (shown when voice is connected) */}
      {isActiveVoice && (
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#E2E1DC] shadow-2xs text-xs font-medium text-[#202633] animate-in fade-in slide-in-from-top-1 duration-200">
          <span
            className={`w-2 h-2 rounded-full ${
              isMuted
                ? 'bg-amber-400'
                : sessionState === 'listening'
                ? 'bg-[#79BFA8] animate-pulse'
                : sessionState === 'speaking'
                ? 'bg-[#79BFA8] animate-ping'
                : 'bg-[#DDD9F8] animate-pulse'
            }`}
          />
          <span className="text-[#465163]">
            {isMuted
              ? 'Mic is paused'
              : sessionState === 'listening'
              ? 'Listening to you...'
              : sessionState === 'speaking'
              ? 'Echo is speaking...'
              : 'Echo is thinking...'}
          </span>

          <div className="h-3 w-[1px] bg-[#E9E8E2] mx-0.5" />

          {/* Quick End button inside banner for extra convenience */}
          <button
            type="button"
            onClick={onEndVoice}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors cursor-pointer"
            title="End voice session"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>End Call</span>
          </button>
        </div>
      )}

      {/* Main Unified Input Capsule (Text Field + Mic + Send merged) */}
      <form
        onSubmit={handleSubmit}
        className={`w-full relative flex items-center transition-all duration-200 bg-white border shadow-xs ${
          isHero
            ? 'rounded-2xl p-1.5 md:p-2 border-[#E2E1DC] focus-within:border-[#79BFA8] focus-within:ring-2 focus-within:ring-[#79BFA8]/20 max-w-xl'
            : 'rounded-xl p-1.5 border-[#E2E1DC] focus-within:border-[#79BFA8] focus-within:ring-1 focus-within:ring-[#79BFA8]/20'
        }`}
      >
        {/* Leading Sparkle/Icon (only in hero mode) */}
        {isHero && (
          <div className="pl-2.5 pr-1 text-[#79BFA8] hidden sm:flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 opacity-80" />
          </div>
        )}

        {/* Text Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-[#202633] placeholder:text-[#697386]/70 focus:outline-none min-w-0"
        />

        {/* Integrated Controls Group (Mic + Send merged right inside the field) */}
        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          {/* Send Button (Always available or highlighted when text exists) */}
          {text.trim().length > 0 && (
            <button
              type="submit"
              className="p-2 rounded-xl bg-[#79BFA8] hover:bg-[#68B199] text-white shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
              title="Send text message (Enter)"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}

          {/* Voice Microphone Controls (Merged right here) */}
          {!isActiveVoice ? (
            // Idle or Error state: Tap to speak / retry button
            <button
              type="button"
              onClick={onStartVoice}
              disabled={isConnecting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isConnecting
                  ? 'bg-[#E8F4F0] text-[#79BFA8] cursor-not-allowed'
                  : sessionState === 'error'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs hover:shadow-xs active:scale-95'
                  : 'bg-[#79BFA8] hover:bg-[#68B199] text-white shadow-2xs hover:shadow-xs active:scale-95'
              }`}
              title={
                isConnecting
                  ? 'Connecting to Echo...'
                  : sessionState === 'error'
                  ? 'Click to retry microphone access'
                  : 'Start voice conversation'
              }
              aria-label={sessionState === 'error' ? 'Retry microphone' : 'Start voice conversation'}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#79BFA8]" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isConnecting ? 'Connecting...' : sessionState === 'error' ? 'Retry Mic' : 'Voice'}
              </span>
            </button>
          ) : (
            // Active Voice state: Mute / Unmute & End buttons right inside the input dock
            <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-xl border border-[#EBEAE5]">
              {/* Mute/Unmute Button */}
              <button
                type="button"
                onClick={onToggleMute}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'text-[#465163] hover:text-[#202633] hover:bg-white'
                }`}
                title={isMuted ? 'Resume microphone' : 'Mute microphone'}
                aria-label={isMuted ? 'Resume microphone' : 'Mute microphone'}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4 text-amber-700" />
                ) : (
                  <Mic className="w-4 h-4 text-[#79BFA8]" />
                )}
              </button>

              {/* End Voice Call Button */}
              <button
                type="button"
                onClick={onEndVoice}
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                title="End voice conversation"
                aria-label="End voice conversation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Subtle Hint Text */}
      {isHero && (
        <div className="flex items-center gap-3 text-[11px] text-[#697386]">
          <span>Type & press Enter to chat</span>
          <span>·</span>
          <span>Tap Voice to talk out loud</span>
        </div>
      )}
    </div>
  );
};
