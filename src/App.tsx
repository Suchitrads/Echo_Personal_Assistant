/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, type JSX } from 'react';
import { Header } from './components/Header';
import { PandaCharacter } from './components/PandaCharacter';
import { AudioWaveform } from './components/AudioWaveform';
import { UnifiedInputBar } from './components/UnifiedInputBar';
import { STARTERS } from './components/SuggestedStarters';
import { SettingsModal } from './components/SettingsModal';
import { useVoiceSession } from './hooks/useVoiceSession';
import { AppSettings, MobileTab } from './types';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';

export type { MobileTab };

export interface AppProps {
  initialSettings?: Partial<AppSettings>;
  className?: string;
}

export interface ErrorAlertBannerProps {
  errorDetails: string;
  onRetry: () => void;
}

export interface AppFooterProps {
  className?: string;
}

export const ErrorAlertBanner = ({
  errorDetails,
  onRetry,
}: ErrorAlertBannerProps): JSX.Element => (
  <div className="px-6 py-3 bg-rose-50 border-b border-rose-100 flex items-center justify-between text-sm text-rose-800 animate-in fade-in">
    <div className="flex items-center gap-2.5">
      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
      <span>{errorDetails}</span>
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-white/70 px-2.5 py-1 rounded-md border border-rose-200 transition-colors cursor-pointer"
    >
      <RefreshCw className="w-3 h-3" />
      <span>Try Again</span>
    </button>
  </div>
);

export const AppFooter = ({ className = '' }: AppFooterProps): JSX.Element => (
  <footer className={`w-full border-t border-[#EBEAE5] py-2.5 px-6 text-center text-xs text-[#697386] ${className}`}>
    <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
      <span>Echo · A friendly voice & text companion for curious minds</span>
      <span className="text-[#8792A2]">
        Powered by Google Gemini Live
      </span>
    </div>
  </footer>
);

const BASE_DEFAULT_SETTINGS: AppSettings = {
  voice: 'Puck',
  inputSensitivity: 1.0,
  noiseSuppression: true,
  echoCancellation: true,
  speechRecognitionEnabled: true,
};

export default function App({
  initialSettings,
  className = '',
}: AppProps = {}): JSX.Element {
  const defaultSettings: AppSettings = {
    ...BASE_DEFAULT_SETTINGS,
    ...initialSettings,
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('echo_settings');
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const {
    sessionState,
    messages,
    errorDetails,
    isMuted,
    inputLevel,
    outputLevel,
    startSession,
    endSession,
    toggleMute,
    sendPrompt,
    clearTranscript,
  } = useVoiceSession(settings);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (!isUserScrolledUp && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isUserScrolledUp]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsUserScrolledUp(!atBottom);
  };

  const handleSaveSettings = (newSettings: AppSettings): void => {
    setSettings(newSettings);
    try {
      localStorage.setItem('echo_settings', JSON.stringify(newSettings));
    } catch {}
  };

  const handleSelectStarter = (promptText: string): void => {
    sendPrompt(promptText);
  };

  // Determine which audio level to show on the waveform
  const currentAudioLevel = sessionState === 'speaking' ? outputLevel : inputLevel;

  // Has conversation/chat begun?
  // Whenever the chat begins (messages exist, or voice active/listening/speaking/thinking),
  // all suggested starter topics disappear completely.
  const hasChatBegun =
    messages.length > 0 ||
    sessionState === 'listening' ||
    sessionState === 'speaking' ||
    sessionState === 'thinking' ||
    sessionState === 'connecting' ||
    sessionState === 'requesting-permission';

  return (
    <div className={`min-h-screen flex flex-col bg-[#FAF9F6] text-[#202633] ${className}`}>
      {/* Top Header */}
      <Header
        sessionState={sessionState}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Error Alert Banner if an error occurred */}
      {errorDetails && (
        <ErrorAlertBanner
          errorDetails={errorDetails}
          onRetry={startSession}
        />
      )}

      {/* Main Single Unified Stage (Companion + Transcript + Input in ONE place) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 flex flex-col min-h-0">
        <div className="bg-white rounded-3xl border border-[#E9E8E2] shadow-xs flex flex-col flex-1 overflow-hidden min-h-[580px]">
          {/* Top Companion Header Bar */}
          <div className="border-b border-[#F0EFEB] bg-[#FAF9F6]/60 p-4 transition-all">
            {!hasChatBegun ? (
              // Empty State: Mascot in hero position with greeting
              <div className="flex flex-col items-center justify-center py-3 text-center">
                <PandaCharacter
                  state={sessionState}
                  audioLevel={currentAudioLevel}
                  onRetry={startSession}
                  size="standard"
                />
                <div className="mt-3 flex justify-center w-full">
                  <AudioWaveform
                    state={sessionState}
                    audioLevel={currentAudioLevel}
                  />
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#202633]">
                  Hi, I'm Echo!
                </h1>
                <p className="text-sm text-[#697386] max-w-md mt-1">
                  Your AI voice and text companion. Speak out loud or type a message below — use whichever is convenient for you.
                </p>
              </div>
            ) : (
              // Active Conversation State: Streamlined Companion & Waveform
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <PandaCharacter
                    state={sessionState}
                    audioLevel={currentAudioLevel}
                    onRetry={startSession}
                    size="compact"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#202633] flex items-center gap-1.5">
                      <span>Echo</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#79BFA8]" />
                    </span>
                    <div className="mt-0.5">
                      <AudioWaveform
                        state={sessionState}
                        audioLevel={currentAudioLevel}
                      />
                    </div>
                  </div>
                </div>

                {/* Right controls: Transcript message count + Clear button */}
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <span className="text-xs text-[#697386] hidden sm:inline">
                      {messages.length} message{messages.length === 1 ? '' : 's'}
                    </span>
                  )}
                  <button
                    onClick={clearTranscript}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#697386] hover:text-[#202633] hover:bg-white border border-transparent hover:border-[#E2E1DC] transition-all cursor-pointer"
                    title="Clear conversation and reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Unified Conversation Stream (Transcript of Voice & Text) */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar min-h-[240px]"
          >
            {!hasChatBegun ? (
              // Suggested Topics shown ONLY before chat begins
              <div className="max-w-xl mx-auto py-2">
                <span className="block text-xs font-semibold text-[#697386] uppercase tracking-wider mb-2.5 text-center">
                  Suggested topics to start with
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTERS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSelectStarter(s.prompt)}
                      className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FAF9F6] hover:bg-[#F2FAF6] border border-[#E9E8E2] hover:border-[#79BFA8] text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50"
                    >
                      <div className="p-1.5 rounded-xl bg-white border border-[#E2E1DC] text-[#79BFA8] group-hover:bg-[#79BFA8] group-hover:text-white transition-colors shrink-0">
                        <s.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#202633] group-hover:text-[#1E2E28]">
                          {s.label}
                        </p>
                        <p className="text-[11px] text-[#697386] line-clamp-1 mt-0.5">
                          {s.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : messages.length === 0 ? (
              // Chat has begun via Voice before any messages are logged
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#697386] space-y-2">
                <div className="flex gap-1.5 items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-[#79BFA8] animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-[#79BFA8]" />
                </div>
                <p className="text-sm font-medium text-[#202633]">
                  {sessionState === 'listening' ? "I'm listening! Speak out loud or type below..." : 'Connecting...'}
                </p>
              </div>
            ) : (
              // Chat messages (both voice and text are recorded here)
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    } space-y-1 animate-in fade-in duration-200`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-[#697386] px-1 font-medium">
                      <span>{isUser ? 'You' : 'Echo'}</span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-all ${
                        isUser
                          ? 'bg-[#FAF9F6] text-[#202633] border border-[#E9E8E2] rounded-tr-xs'
                          : 'bg-[#F2FAF6] text-[#1E2E28] border border-[#D5EDE3] rounded-tl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}

            {/* Thinking Indicator */}
            {sessionState === 'thinking' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E9E8E2] text-xs text-[#697386] w-fit animate-in fade-in">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#79BFA8] animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#79BFA8] animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#79BFA8] animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                <span>Echo is thinking...</span>
              </div>
            )}
          </div>

          {/* THE ONE UNIFIED INPUT BAR (Voice & Text taken at ONE place) */}
          <div className="p-3 sm:p-4 border-t border-[#F0EFEB] bg-[#FAF9F6]/90 backdrop-blur-xs flex justify-center">
            <UnifiedInputBar
              sessionState={sessionState}
              isMuted={isMuted}
              onStartVoice={startSession}
              onEndVoice={endSession}
              onToggleMute={toggleMute}
              onSendMessage={sendPrompt}
              variant="hero"
              placeholder="Ask Echo anything or tap Voice to speak..."
            />
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <AppFooter />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
