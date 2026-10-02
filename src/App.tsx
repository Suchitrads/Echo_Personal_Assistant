/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type JSX } from 'react';
import { Header } from './components/Header';
import { PandaCharacter } from './components/PandaCharacter';
import { AudioWaveform } from './components/AudioWaveform';
import { VoiceControls } from './components/VoiceControls';
import { ConversationPanel } from './components/ConversationPanel';
import { SuggestedStarters } from './components/SuggestedStarters';
import { SettingsModal } from './components/SettingsModal';
import { useVoiceSession } from './hooks/useVoiceSession';
import { AppSettings, MobileTab } from './types';
import { AlertCircle, RefreshCw, MessageSquare, Mic } from 'lucide-react';

export type { MobileTab };

export interface AppProps {
  initialSettings?: Partial<AppSettings>;
  className?: string;
}

export interface ErrorAlertBannerProps {
  errorDetails: string;
  onRetry: () => void;
}

export interface MobileTabSwitcherProps {
  currentTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  messageCount: number;
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

export const MobileTabSwitcher = ({
  currentTab,
  onSelectTab,
  messageCount,
}: MobileTabSwitcherProps): JSX.Element => (
  <div className="lg:hidden flex items-center justify-center p-3 border-b border-[#E9E8E2] bg-white">
    <div className="flex bg-[#FAF9F6] p-1 rounded-xl border border-[#E9E8E2] text-xs font-medium w-full max-w-xs">
      <button
        type="button"
        onClick={() => onSelectTab('voice')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
          currentTab === 'voice'
            ? 'bg-white text-[#202633] shadow-xs font-semibold'
            : 'text-[#697386] hover:text-[#202633]'
        }`}
      >
        <Mic className="w-3.5 h-3.5" />
        <span>Voice & Panda</span>
      </button>
      <button
        type="button"
        onClick={() => onSelectTab('transcript')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
          currentTab === 'transcript'
            ? 'bg-white text-[#202633] shadow-xs font-semibold'
            : 'text-[#697386] hover:text-[#202633]'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Transcript ({messageCount})</span>
      </button>
    </div>
  </div>
);

export const AppFooter = ({ className = '' }: AppFooterProps): JSX.Element => (
  <footer className={`w-full border-t border-[#EBEAE5] py-3 px-6 text-center text-xs text-[#697386] ${className}`}>
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
      <span>Echo · A friendly voice for curious minds</span>
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
  const [mobileTab, setMobileTab] = useState<MobileTab>('voice');

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

      {/* Mobile Tab Switcher */}
      <MobileTabSwitcher
        currentTab={mobileTab}
        onSelectTab={setMobileTab}
        messageCount={messages.length}
      />

      {/* Main Balanced Three-Column Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* LEFT COLUMN: Welcome, Description & Suggested Starters */}
          <section
            className={`lg:col-span-4 flex flex-col justify-center ${
              mobileTab === 'transcript' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="bg-white/60 p-6 rounded-2xl border border-[#EBEAE5] shadow-2xs">
              <SuggestedStarters
                onSelectPrompt={handleSelectStarter}
                disabled={sessionState === 'connecting' || sessionState === 'requesting-permission'}
              />
            </div>
          </section>

          {/* CENTER COLUMN: The Panda Mascot, Waveform & Voice Controls */}
          <section
            className={`lg:col-span-4 flex flex-col items-center justify-center py-4 ${
              mobileTab === 'transcript' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="w-full flex flex-col items-center justify-center gap-5">
              {/* Adorable 3D Baby Panda Mascot */}
              <PandaCharacter
                state={sessionState}
                audioLevel={currentAudioLevel}
                onRetry={startSession}
              />

              {/* Real-time Dynamic Waveform */}
              <div className="flex justify-center w-full">
                <AudioWaveform
                  state={sessionState}
                  audioLevel={currentAudioLevel}
                />
              </div>

              {/* Main Microphone & Active Controls */}
              <VoiceControls
                state={sessionState}
                isMuted={isMuted}
                onStart={startSession}
                onEnd={endSession}
                onToggleMute={toggleMute}
              />
            </div>
          </section>

          {/* RIGHT COLUMN: Conversation Transcript Panel */}
          <section
            className={`lg:col-span-4 flex flex-col ${
              mobileTab === 'voice' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <ConversationPanel
              messages={messages}
              sessionState={sessionState}
              onSendMessage={sendPrompt}
              onClear={clearTranscript}
            />
          </section>
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
