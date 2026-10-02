import { SessionState } from '../types';

interface AudioWaveformProps {
  state: SessionState;
  audioLevel: number; // 0.0 to 1.0
}

export const AudioWaveform = ({ state, audioLevel }: AudioWaveformProps) => {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isActive = isListening || isSpeaking;

  // We render 12 symmetric organic bars
  const barCount = 13;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div
      className="flex items-center justify-center gap-1.5 h-12 w-full max-w-[220px] px-2 py-1"
      aria-label="Audio activity visualization"
    >
      {bars.map((i) => {
        // Calculate harmonic variance across the bars
        const distanceToCenter = Math.abs(i - Math.floor(barCount / 2));
        const centerFactor = 1 - distanceToCenter / (barCount / 2);

        // Calculate height
        let heightPct = 12;
        if (isActive) {
          // Dynamic height amplified by real audio level
          const dynamicBoost = Math.max(0.1, audioLevel * 100);
          const variance = Math.sin((i / barCount) * Math.PI) * dynamicBoost * 0.9;
          heightPct = Math.min(100, Math.max(12, 14 + variance * centerFactor));
        } else if (state === 'thinking') {
          // Gentle wave ripple during thinking
          heightPct = 20 + Math.sin((i / barCount) * Math.PI * 2) * 15;
        }

        // Color based on role: mint for AI speaking, sky blue for user listening
        const barColor = isSpeaking
          ? '#79BFA8'
          : isListening
          ? '#8BBEF5'
          : state === 'thinking'
          ? '#DDD9F8'
          : '#E5E4DE';

        return (
          <span
            key={i}
            className="w-1 rounded-full transition-all duration-100 ease-out origin-center"
            style={{
              height: `${heightPct}%`,
              backgroundColor: barColor,
              opacity: isActive ? 0.95 : 0.45,
            }}
          />
        );
      })}
    </div>
  );
};
