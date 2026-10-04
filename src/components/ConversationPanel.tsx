import { useRef, useEffect, useState } from 'react';
import { Message, SessionState } from '../types';
import { RotateCcw, Sparkles, MessageSquare } from 'lucide-react';
import { UnifiedInputBar } from './UnifiedInputBar';

interface ConversationPanelProps {
  messages: Message[];
  sessionState: SessionState;
  isMuted: boolean;
  onSendMessage: (text: string) => void;
  onClear: () => void;
  onStartVoice: () => void;
  onEndVoice: () => void;
  onToggleMute: () => void;
}

export const ConversationPanel = ({
  messages,
  sessionState,
  isMuted,
  onSendMessage,
  onClear,
  onStartVoice,
  onEndVoice,
  onToggleMute,
}: ConversationPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  // Auto-scroll to bottom when new messages arrive unless user manually scrolled up
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

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#E9E8E2] shadow-xs overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EFEB]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#79BFA8]" />
          <h2 className="text-sm font-semibold text-[#202633]">Transcript</h2>
          <span className="text-xs text-[#697386]">
            {messages.length > 0 ? `(${messages.length})` : ''}
          </span>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-[#697386] hover:text-[#202633] transition-colors px-2 py-1 rounded-md hover:bg-[#FAF9F6] cursor-pointer"
            title="Clear transcript"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Message List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-[280px] max-h-[500px] lg:max-h-[600px]"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#697386] space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-[#E8F4F0] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#79BFA8]" />
            </div>
            <p className="text-sm font-medium text-[#202633]">No messages yet</p>
            <p className="text-xs max-w-xs text-[#697386] leading-relaxed">
              Start talking or send a message below to begin your conversation with Echo.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isUser ? 'items-end' : 'items-start'
                } space-y-1 animate-in fade-in duration-200`}
              >
                {/* Speaker Label & Timestamp */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#697386] px-1 font-medium">
                  <span>{isUser ? 'You' : 'Echo'}</span>
                  <span>·</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed transition-all duration-200 ${
                    isUser
                      ? 'bg-[#FAF9F6] text-[#202633] border border-[#E9E8E2]'
                      : 'bg-[#F2FAF6] text-[#1E2E28] border border-[#D5EDE3]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}

        {/* Live Thinking / Typing indicator */}
        {sessionState === 'thinking' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FAF9F6] border border-[#E9E8E2] text-xs text-[#697386] w-fit">
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

      {/* Merged Input Field: Text and Microphone available at one place */}
      <div className="p-3 border-t border-[#F0EFEB] bg-[#FAF9F6]/50">
        <UnifiedInputBar
          sessionState={sessionState}
          isMuted={isMuted}
          onStartVoice={onStartVoice}
          onEndVoice={onEndVoice}
          onToggleMute={onToggleMute}
          onSendMessage={onSendMessage}
          variant="panel"
          placeholder="Type or tap Voice..."
        />
      </div>
    </div>
  );
};
