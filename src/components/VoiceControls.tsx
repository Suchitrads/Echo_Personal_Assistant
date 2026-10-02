import { Mic, MicOff, Square, Loader2 } from 'lucide-react';
import { SessionState } from '../types';

interface VoiceControlsProps {
  state: SessionState;
  isMuted: boolean;
  onStart: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
}

export const VoiceControls = ({
  state,
  isMuted,
  onStart,
  onEnd,
  onToggleMute,
}: VoiceControlsProps) => {
  const isConnecting = state === 'requesting-permission' || state === 'connecting';
  const isActive =
    state === 'listening' ||
    state === 'speaking' ||
    state === 'thinking' ||
    state === 'muted';

  return (
    <div className="flex flex-col items-center justify-center gap-4 mt-2">
      {!isActive ? (
        // Start talking button (Before session or ended)
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onStart}
            disabled={isConnecting}
            className={`group relative flex items-center gap-3 px-7 py-3.5 rounded-full font-medium text-white shadow-sm transition-all duration-300 cursor-pointer ${
              isConnecting
                ? 'bg-[#A3D6C5] cursor-not-allowed'
                : 'bg-[#79BFA8] hover:bg-[#68B199] hover:shadow-md active:scale-98'
            }`}
            aria-label="Start voice session"
          >
            {isConnecting ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Mic className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
            )}
            <span className="text-base tracking-tight font-medium">
              {isConnecting ? 'Connecting to Echo...' : 'Start talking'}
            </span>
          </button>
          <span className="text-xs text-[#697386]">Press to speak naturally with Echo</span>
        </div>
      ) : (
        // Active Session Controls (Prominent mic + Mute/Unmute + End Session)
        <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-full border border-[#E9E8E2] shadow-xs transition-all duration-300">
          {/* Mute/Unmute Button */}
          <button
            onClick={onToggleMute}
            className={`p-3 rounded-full transition-all duration-200 cursor-pointer ${
              isMuted
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-[#FAF9F6] text-[#202633] hover:bg-[#F2F1EC]'
            }`}
            aria-label={isMuted ? 'Resume microphone' : 'Mute microphone'}
            title={isMuted ? 'Resume microphone' : 'Mute microphone'}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 text-amber-700" />
            ) : (
              <Mic className="w-5 h-5 text-[#202633]" />
            )}
          </button>

          {/* Central Active State Indicator */}
          <div className="flex flex-col items-center px-3 min-w-[120px]">
            <span className="text-xs font-semibold text-[#202633]">
              {isMuted
                ? 'Muted'
                : state === 'listening'
                ? 'Listening to you'
                : state === 'speaking'
                ? 'Echo speaking'
                : 'Thinking...'}
            </span>
            <span className="text-[11px] text-[#697386]">
              {isMuted ? 'Click mic to speak' : 'Speak anytime'}
            </span>
          </div>

          {/* End Session Button */}
          <button
            onClick={onEnd}
            className="p-3 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
            aria-label="End voice conversation"
            title="End conversation"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
};
