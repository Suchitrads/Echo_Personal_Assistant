import { useState, useEffect } from 'react';
import { X, Shield, Sliders } from 'lucide-react';
import { AppSettings, VoiceName } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const VOICES: { name: VoiceName; desc: string; tone: string }[] = [
  { name: 'Puck', desc: 'Youthful, spirited & enthusiastic', tone: 'Playful' },
  { name: 'Zephyr', desc: 'Calm, gentle & thoughtful', tone: 'Reflective' },
  { name: 'Kore', desc: 'Warm, clear & inviting', tone: 'Supportive' },
  { name: 'Aoede', desc: 'Soft, melodious & empathetic', tone: 'Gentle' },
  { name: 'Charon', desc: 'Deep, steady & grounded', tone: 'Grounded' },
  { name: 'Fenrir', desc: 'Crisp, articulate & confident', tone: 'Authoritative' },
];

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  onSave,
}: SettingsModalProps) => {
  const [current, setCurrent] = useState<AppSettings>(settings);

  useEffect(() => {
    setCurrent(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(current);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E9E8E2] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EFEB]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#79BFA8]" />
            <h3 className="text-base font-semibold text-[#202633]">Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#697386] hover:text-[#202633] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
          {/* Voice Persona Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#697386] mb-3">
              Echo Voice Persona
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VOICES.map((v) => {
                const isSelected = current.voice === v.name;
                return (
                  <button
                    key={v.name}
                    onClick={() => setCurrent({ ...current, voice: v.name })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#79BFA8] bg-[#F2FAF6] shadow-2xs'
                        : 'border-[#E9E8E2] hover:border-[#D1D0C9] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#202633]">{v.name}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-[#E0DFD8] text-[#697386]">
                        {v.tone}
                      </span>
                    </div>
                    <p className="text-xs text-[#697386]">{v.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio & Mic Settings */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#697386] mb-3">
              Microphone & Audio Processing
            </label>
            <div className="space-y-3 bg-[#FAF9F6] p-4 rounded-xl border border-[#E9E8E2]">
              {/* Noise Suppression */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-[#202633] block">Noise Suppression</span>
                  <span className="text-xs text-[#697386]">Filters out background noise</span>
                </div>
                <input
                  type="checkbox"
                  checked={current.noiseSuppression}
                  onChange={(e) =>
                    setCurrent({ ...current, noiseSuppression: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#79BFA8] cursor-pointer rounded"
                />
              </div>

              {/* Echo Cancellation */}
              <div className="flex items-center justify-between border-t border-[#ECEBE5] pt-3">
                <div>
                  <span className="font-medium text-[#202633]">Echo Cancellation</span>
                  <span className="text-xs text-[#697386] block">Prevents feedback loop</span>
                </div>
                <input
                  type="checkbox"
                  checked={current.echoCancellation}
                  onChange={(e) =>
                    setCurrent({ ...current, echoCancellation: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#79BFA8] cursor-pointer rounded"
                />
              </div>

              {/* Speech Recognition transcription */}
              <div className="flex items-center justify-between border-t border-[#ECEBE5] pt-3">
                <div>
                  <span className="font-medium text-[#202633]">Spoken Transcript</span>
                  <span className="text-xs text-[#697386] block">
                    Show speech transcript in real-time
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={current.speechRecognitionEnabled}
                  onChange={(e) =>
                    setCurrent({ ...current, speechRecognitionEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#79BFA8] cursor-pointer rounded"
                />
              </div>
            </div>
          </div>

          {/* Privacy & Architecture Note */}
          <div className="p-3.5 rounded-xl bg-[#F0F5FA] border border-[#D5E3F0] text-xs text-[#405B73]">
            <p className="font-medium mb-1 flex items-center gap-1.5 text-[#2A445C]">
              <Shield className="w-3.5 h-3.5 text-[#5082A8]" />
              Secure Full-Stack Architecture
            </p>
            <p>
              Your Gemini API key remains strictly protected on the backend server.
              Audio is transmitted over encrypted streams for real-time conversation and is not permanently retained.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F0EFEB] bg-[#FAF9F6] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#697386] hover:text-[#202633] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-[#79BFA8] hover:bg-[#68B199] shadow-xs transition-colors cursor-pointer"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
