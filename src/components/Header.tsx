import { Settings as SettingsIcon } from 'lucide-react';
import { SessionState } from '../types';

interface HeaderProps {
  sessionState: SessionState;
  onOpenSettings: () => void;
}

export const Header = ({ sessionState, onOpenSettings }: HeaderProps) => {
  const isLive =
    sessionState === 'listening' ||
    sessionState === 'speaking' ||
    sessionState === 'thinking';

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 border-b border-[#EBEAE5] bg-[#FAF9F6]/80 backdrop-blur-sm sticky top-0 z-30">
      {/* Brand Zone */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold tracking-tight text-[#202633]">
            echo
          </span>
          <span className="w-2 h-2 rounded-full bg-[#79BFA8]" />
        </div>
        <span className="text-[11px] font-medium text-[#697386]">
          AI Voice Companion
        </span>
      </div>

      {/* Right Controls: Status & Settings */}
      <div className="flex items-center gap-3">
        {/* Connection status indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E9E8E2] text-xs font-medium text-[#697386]">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive
                ? 'bg-[#79BFA8] animate-pulse'
                : sessionState === 'error'
                ? 'bg-rose-400'
                : sessionState === 'connecting'
                ? 'bg-[#8BBEF5] animate-ping'
                : 'bg-[#C7C6BE]'
            }`}
          />
          <span className="text-[#202633] capitalize">
            {isLive ? 'Live Session' : sessionState === 'ready' ? 'Online' : sessionState}
          </span>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-full bg-white border border-[#E9E8E2] text-[#697386] hover:text-[#202633] hover:border-[#79BFA8] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          title="Voice & Audio Settings"
          aria-label="Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
