import { Lightbulb, Compass, BookOpen, MessageCircle, ArrowRight } from 'lucide-react';

interface SuggestedStartersProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const STARTERS = [
  {
    icon: Compass,
    label: 'Explain a topic simply',
    prompt: 'Can you explain how photosynthesis works in simple, conversational terms?',
    tag: 'Quick concept',
  },
  {
    icon: BookOpen,
    label: 'Teach me something new',
    prompt: 'Teach me a fascinating concept from science or history that most people do not know.',
    tag: 'Curiosity',
  },
  {
    icon: Lightbulb,
    label: 'Tell me a fun fact',
    prompt: 'Tell me a surprising, delightful fun fact about nature or pandas!',
    tag: 'Trivia',
  },
  {
    icon: MessageCircle,
    label: "Let's just chat",
    prompt: "Hey Echo! How are you doing today? What's on your mind?",
    tag: 'Casual',
  },
];

export const SuggestedStarters = ({
  onSelectPrompt,
  disabled = false,
}: SuggestedStartersProps) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Headline Area */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#E8F4F0] text-[#408570] text-xs font-semibold mb-3">
          <span>Voice Companion</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-[#202633] mb-2">
          Hi, I'm Echo.
        </h1>
        <p className="text-base font-medium text-[#465163] mb-1.5">
          Your AI companion for curious minds.
        </p>
        <p className="text-sm text-[#697386] leading-relaxed">
          Ask me anything, learn something new, or enjoy a relaxed conversation.
        </p>
      </div>

      {/* Suggested Starter Buttons */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-[#697386] uppercase tracking-wider">
          Suggested topics
        </span>

        <div className="grid grid-cols-1 gap-2">
          {STARTERS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectPrompt(item.prompt)}
                disabled={disabled}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-white border border-[#E9E8E2] hover:border-[#79BFA8] hover:bg-[#FAFDFC] shadow-2xs hover:shadow-xs transition-all text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#FAF9F6] text-[#79BFA8] group-hover:bg-[#E8F4F0] group-hover:text-[#529E87] transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#202633] group-hover:text-[#18202F] block">
                      {item.label}
                    </span>
                    <span className="text-xs text-[#697386] line-clamp-1">
                      {item.tag}
                    </span>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-[#A8B2C1] group-hover:text-[#79BFA8] group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
