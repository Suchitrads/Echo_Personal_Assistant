import { SessionState } from '../types';
import { RefreshCw } from 'lucide-react';

interface PandaCharacterProps {
  state: SessionState;
  audioLevel: number; // 0 to 1 (either inputLevel or outputLevel)
  onRetry?: () => void;
  size?: 'compact' | 'standard';
}

export const PandaCharacter = ({
  state,
  audioLevel,
  onRetry,
  size = 'standard',
}: PandaCharacterProps) => {
  // Determine state-specific visual helpers
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';
  const isConnecting = state === 'connecting' || state === 'requesting-permission';
  const isError = state === 'error';
  const isMuted = state === 'muted';

  // Dynamic mouth opening height for speaking animation (0 to 18px)
  const mouthOpen = isSpeaking ? Math.min(18, Math.max(3, audioLevel * 22)) : 0;

  // Head tilt angle based on state
  let headTilt = 0;
  if (isListening) headTilt = -3;
  if (isThinking) headTilt = 4;
  if (isSpeaking) headTilt = 1.5;

  // Status message according to specs
  const getStatusMessage = () => {
    switch (state) {
      case 'ready':
        return 'Ready when you are.';
      case 'requesting-permission':
        return 'Requesting microphone...';
      case 'connecting':
        return 'Connecting...';
      case 'listening':
        return "I'm listening.";
      case 'thinking':
        return 'Let me think...';
      case 'speaking':
        return "Here's what I think.";
      case 'muted':
        return 'Microphone is paused.';
      case 'error':
        return "Let's try that again.";
      case 'ended':
        return 'Talk again anytime.';
      default:
        return 'Ready when you are.';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-sm mx-auto">
      {/* Soft Ambient Glow / Ripple behind character */}
      <div className="absolute -inset-4 flex items-center justify-center pointer-events-none -z-10">
        <div
          className={`rounded-full transition-all duration-700 ease-out ${
            size === 'compact' ? 'w-32 h-32' : 'w-64 h-64'
          } ${
            isSpeaking
              ? 'bg-[#79BFA8]/20 scale-110 blur-2xl animate-pulse'
              : isListening
              ? 'bg-[#8BBEF5]/20 scale-105 blur-2xl'
              : isThinking
              ? 'bg-[#DDD9F8]/25 scale-100 blur-xl'
              : 'bg-[#FAF9F6] scale-95 blur-lg opacity-40'
          }`}
        />
        {/* Secondary wave ring when speaking or listening */}
        {(isSpeaking || isListening) && (
          <div
            className={`absolute rounded-full border border-[#79BFA8]/30 transition-transform duration-1000 ${
              size === 'compact' ? 'w-36 h-36' : 'w-72 h-72'
            }`}
            style={{
              transform: `scale(${1 + audioLevel * 0.25})`,
              opacity: 0.6 + audioLevel * 0.4,
            }}
          />
        )}
      </div>

      {/* SVG 3D Character Illustration */}
      <div
        className={`relative transition-transform duration-500 ${
          size === 'compact' ? 'w-24 h-24 md:w-32 md:h-32' : 'w-60 h-60 md:w-72 md:h-72'
        } ${
          isConnecting ? 'scale-105' : 'hover:scale-[1.02]'
        }`}
        style={{
          transform: `rotate(${headTilt}deg)`,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <svg
          viewBox="0 0 320 320"
          className="w-full h-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients for 3D Panda fur lighting */}
            <linearGradient id="bodyFur" x1="160" y1="130" x2="160" y2="290" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#F6F6F4" />
              <stop offset="100%" stopColor="#E9E8E2" />
            </linearGradient>

            <linearGradient id="headFur" x1="160" y1="50" x2="160" y2="190" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="65%" stopColor="#FAF9F7" />
              <stop offset="100%" stopColor="#ECEBE5" />
            </linearGradient>

            <linearGradient id="darkFur" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2D333F" />
              <stop offset="100%" stopColor="#1B1F27" />
            </linearGradient>

            {/* Soft Pastel Mint Hoodie gradient */}
            <linearGradient id="mintHoodie" x1="160" y1="170" x2="160" y2="290" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#92CFBC" />
              <stop offset="50%" stopColor="#79BFA8" />
              <stop offset="100%" stopColor="#5EAA92" />
            </linearGradient>

            <linearGradient id="hoodieShadow" x1="160" y1="170" x2="160" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#50937E" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#79BFA8" stopOpacity="0" />
            </linearGradient>

            {/* Rosy Peach Cheek Blush */}
            <radialGradient id="peachBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F5C9B8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#F5C9B8" stopOpacity="0" />
            </radialGradient>

            {/* Eye Gloss / Highlights */}
            <radialGradient id="eyeGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#252A36" />
              <stop offset="85%" stopColor="#111318" />
              <stop offset="100%" stopColor="#08090C" />
            </radialGradient>

            {/* Soft Ground Shadow */}
            <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#202633" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#202633" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ground Contact Shadow */}
          <ellipse cx="160" cy="295" rx="90" ry="16" fill="url(#groundShadow)" />

          {/* Breathing Body Group */}
          <g className="animate-breathe">
            {/* Panda Body with Soft Mint Hoodie */}
            <path
              d="M 95 210 C 90 270, 110 290, 160 290 C 210 290, 230 270, 225 210 C 220 185, 205 178, 160 178 C 115 178, 100 185, 95 210 Z"
              fill="url(#mintHoodie)"
            />

            {/* Hoodie Pocket / Seam */}
            <path
              d="M 125 240 C 135 248, 185 248, 195 240 C 200 265, 195 275, 160 275 C 125 275, 120 265, 125 240 Z"
              fill="#6CB59E"
              opacity="0.5"
            />

            {/* Mint Hoodie Drawstrings */}
            <path
              d="M 148 190 Q 147 215 145 225"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.9"
            />
            <circle cx="145" cy="226" r="2.5" fill="#E8F4F0" />

            <path
              d="M 172 190 Q 173 215 175 225"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.9"
            />
            <circle cx="175" cy="226" r="2.5" fill="#E8F4F0" />

            {/* Baby Panda Front Paws */}
            {/* Left Paw resting on hoodie */}
            <ellipse
              cx="110"
              cy="235"
              rx="15"
              ry="12"
              fill="url(#darkFur)"
              transform="rotate(15 110 235)"
            />
            {/* Right Paw */}
            <ellipse
              cx="210"
              cy="235"
              rx="15"
              ry="12"
              fill="url(#darkFur)"
              transform="rotate(-15 210 235)"
            />
          </g>

          {/* HEAD & EARS GROUP */}
          <g>
            {/* Left Ear */}
            <g className="animate-ear-l">
              <ellipse cx="102" cy="85" rx="26" ry="24" fill="url(#darkFur)" transform="rotate(-20 102 85)" />
              <ellipse cx="104" cy="86" rx="14" ry="12" fill="#3D4554" opacity="0.4" transform="rotate(-20 104 86)" />
            </g>

            {/* Right Ear */}
            <g className="animate-ear-r">
              <ellipse cx="218" cy="85" rx="26" ry="24" fill="url(#darkFur)" transform="rotate(20 218 85)" />
              <ellipse cx="216" cy="86" rx="14" ry="12" fill="#3D4554" opacity="0.4" transform="rotate(20 216 86)" />
            </g>

            {/* Head Base */}
            <path
              d="M 160 68 C 105 68, 88 105, 88 138 C 88 175, 110 192, 160 192 C 210 192, 232 175, 232 138 C 232 105, 215 68, 160 68 Z"
              fill="url(#headFur)"
            />

            {/* Hoodie Collar surround */}
            <path
              d="M 112 175 C 130 194, 190 194, 208 175 C 218 185, 202 205, 160 205 C 118 205, 102 185, 112 175 Z"
              fill="#5CA991"
              opacity="0.85"
            />

            {/* Characteristic Panda Dark Eye Patches */}
            {/* Left Eye Patch */}
            <ellipse
              cx="126"
              cy="134"
              rx="23"
              ry="27"
              fill="url(#darkFur)"
              transform="rotate(24 126 134)"
            />
            {/* Right Eye Patch */}
            <ellipse
              cx="194"
              cy="134"
              rx="23"
              ry="27"
              fill="url(#darkFur)"
              transform="rotate(-24 194 134)"
            />

            {/* Expressive Glossy Dark Eyes with Natural Highlights */}
            {/* Left Eye */}
            <g className="animate-blink" style={{ transformOrigin: '128px 135px' }}>
              <circle cx="128" cy="135" r="11" fill="url(#eyeGradient)" />
              {/* Primary catchlight */}
              <circle cx="131" cy="131" r="4.2" fill="#FFFFFF" />
              {/* Secondary soft reflection */}
              <circle cx="125" cy="138" r="2" fill="#B0C8D6" opacity="0.8" />
            </g>

            {/* Right Eye */}
            <g className="animate-blink" style={{ transformOrigin: '192px 135px' }}>
              <circle cx="192" cy="135" r="11" fill="url(#eyeGradient)" />
              {/* Primary catchlight */}
              <circle cx="195" cy="131" r="4.2" fill="#FFFFFF" />
              {/* Secondary soft reflection */}
              <circle cx="189" cy="138" r="2" fill="#B0C8D6" opacity="0.8" />
            </g>

            {/* Peach Cheek Blush */}
            <ellipse cx="106" cy="154" rx="16" ry="10" fill="url(#peachBlush)" />
            <ellipse cx="214" cy="154" rx="16" ry="10" fill="url(#peachBlush)" />

            {/* Cute Soft Panda Snout */}
            <ellipse cx="160" cy="152" rx="19" ry="14" fill="#FFFFFF" opacity="0.9" />

            {/* Small rounded black nose */}
            <ellipse cx="160" cy="147" rx="6.5" ry="4.5" fill="#1E232D" />
            <ellipse cx="159" cy="145.5" rx="2.5" ry="1.2" fill="#717A8C" opacity="0.6" />

            {/* Nose-to-Mouth philtrum */}
            <path d="M 160 151.5 L 160 156" stroke="#1E232D" strokeWidth="1.8" strokeLinecap="round" />

            {/* Mouth: Reacts dynamically to speaking / idle */}
            {isSpeaking && mouthOpen > 1 ? (
              // Open speaking mouth synced to audio output amplitude
              <g>
                <path
                  d={`M 152 156 Q 160 ${156 + mouthOpen * 1.3} 168 156 Q 160 ${154} 152 156 Z`}
                  fill="#782E37"
                />
                <ellipse
                  cx="160"
                  cy={156 + mouthOpen * 0.9}
                  rx="4.5"
                  ry={Math.max(1, mouthOpen * 0.45)}
                  fill="#F58B97"
                />
              </g>
            ) : (
              // Gentle sweet smile
              <path
                d="M 152 156 Q 160 162 168 156"
                stroke="#1E232D"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </g>

          {/* Thinking bubble / Thought indicator */}
          {isThinking && (
            <g className="animate-bounce" style={{ transformOrigin: '235px 85px' }}>
              <circle cx="235" cy="85" r="14" fill="#FFFFFF" stroke="#DDD9F8" strokeWidth="1.5" />
              <circle cx="231" cy="85" r="2.5" fill="#79BFA8" />
              <circle cx="236" cy="85" r="2.5" fill="#8BBEF5" />
              <circle cx="241" cy="85" r="2.5" fill="#DDD9F8" />
            </g>
          )}
        </svg>
      </div>

      {/* Real-time Status Badge */}
      <div className="mt-3 flex flex-col items-center">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E9E8E2] shadow-xs text-sm font-medium text-[#202633] transition-all duration-300">
          {/* Status Indicator Icon / Dot */}
          <span className="relative flex h-2.5 w-2.5">
            {isListening && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8BBEF5] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#8BBEF5]" />
              </>
            )}
            {isSpeaking && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#79BFA8] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#79BFA8]" />
              </>
            )}
            {isThinking && (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DDD9F8] animate-pulse" />
            )}
            {isConnecting && (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F5C9B8] animate-spin" />
            )}
            {isError && (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400" />
            )}
            {isMuted && (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
            )}
            {(state === 'ready' || state === 'ended') && (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#79BFA8]" />
            )}
          </span>

          <span className="text-xs text-[#202633] font-medium tracking-tight">
            {getStatusMessage()}
          </span>

          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="ml-1 p-0.5 text-xs text-[#697386] hover:text-[#202633] transition-colors cursor-pointer"
              title="Retry"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
