/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { SessionState, Message, AppSettings } from '../types';
import { downsampleTo16kPCM, StreamingAudioPlayer } from '../lib/audio';

export function useVoiceSession(settings: AppSettings) {
  const [sessionState, setSessionState] = useState<SessionState>('ready');
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const playerRef = useRef<StreamingAudioPlayer | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const currentAssistantMsgIdRef = useRef<string | null>(null);
  const currentUserMsgIdRef = useRef<string | null>(null);
  const isMutedRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Initialize AudioPlayer
  useEffect(() => {
    const player = new StreamingAudioPlayer();
    player.setOnEnded(() => {
      // Audio playback finished, return to listening if session is still active
      setSessionState((prev) => {
        if (prev === 'speaking') {
          return isMutedRef.current ? 'muted' : 'listening';
        }
        return prev;
      });
    });
    playerRef.current = player;

    return () => {
      player.close();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Monitor audio levels continuously for animation & waveform
  useEffect(() => {
    const checkAudioLevels = () => {
      if (playerRef.current && sessionState === 'speaking') {
        const lvl = playerRef.current.getAudioLevel();
        setOutputLevel(lvl);
      } else {
        setOutputLevel(0);
      }
      animFrameRef.current = requestAnimationFrame(checkAudioLevels);
    };

    animFrameRef.current = requestAnimationFrame(checkAudioLevels);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sessionState]);

  // Cleanup mic and input audio processing
  const stopMicrophone = useCallback(() => {
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      try {
        inputAudioCtxRef.current.close();
      } catch {}
      inputAudioCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    setInputLevel(0);
  }, []);

  // Forward reference to sendPrompt for speech recognition callback
  const sendPromptRef = useRef<(text: string) => Promise<void>>(async () => {});

  // Handle SpeechRecognition for user transcription and conversational turns
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition || !settingsRef.current.speechRecognitionEnabled) return;

    try {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let userMsgId: string | null = null;
      let silenceTimer: any = null;
      let lastSpokenText = '';

      recognition.onresult = (event: any) => {
        let transcript = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }

        const trimmed = transcript.trim();
        if (trimmed) {
          lastSpokenText = trimmed;
          if (silenceTimer) clearTimeout(silenceTimer);

          setMessages((prev) => {
            if (!userMsgId) {
              userMsgId = `user-${Date.now()}`;
              return [
                ...prev,
                {
                  id: userMsgId,
                  role: 'user',
                  text: trimmed,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            } else {
              return prev.map((msg) =>
                msg.id === userMsgId ? { ...msg, text: trimmed } : msg
              );
            }
          });

          if (isFinal) {
            userMsgId = null;
            // If live WebSocket is closed or in fallback mode, auto-forward to Echo
            silenceTimer = setTimeout(() => {
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                sendPromptRef.current(trimmed);
              }
            }, 600);
          } else {
            silenceTimer = setTimeout(() => {
              if (lastSpokenText.trim() && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
                const textToSend = lastSpokenText.trim();
                lastSpokenText = '';
                userMsgId = null;
                sendPromptRef.current(textToSend);
              }
            }, 1800);
          }
        }
      };

      recognition.onerror = () => {
        // Handled cleanly without disrupting session
      };

      recognition.onend = () => {
        // Auto-restart if session is still active
        if (mediaStreamRef.current && !isMutedRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch {
      // SpeechRecognition not supported in this browser
    }
  }, []);

  // Start microphone capture with robust permission checks and audio context resumption
  const startMicrophone = useCallback(async (): Promise<boolean> => {
    setSessionState('requesting-permission');
    setErrorDetails(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorDetails(
        'Microphone API is not supported in this browser or iframe. You can chat by typing below!'
      );
      setSessionState('error');
      return false;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: settingsRef.current.echoCancellation ?? true,
          noiseSuppression: settingsRef.current.noiseSuppression ?? true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      console.warn('[Echo] Advanced audio constraints failed, trying basic audio:', err?.message);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (fallbackErr: any) {
        console.error('[Echo] getUserMedia failed:', fallbackErr);
        let friendlyMsg = 'Microphone access failed.';
        if (
          fallbackErr.name === 'NotAllowedError' ||
          fallbackErr.name === 'PermissionDeniedError'
        ) {
          friendlyMsg =
            'Microphone permission was blocked. Please click the lock or camera/mic icon in your browser address bar to allow microphone access, then click Voice again.';
        } else if (
          fallbackErr.name === 'NotFoundError' ||
          fallbackErr.name === 'DevicesNotFoundError'
        ) {
          friendlyMsg =
            'No microphone device was detected on your system. Please connect or enable your microphone.';
        } else {
          friendlyMsg = `Microphone error (${fallbackErr.name || fallbackErr.message || 'unknown'}). Please check browser permissions.`;
        }
        setErrorDetails(friendlyMsg);
        setSessionState('error');
        return false;
      }
    }

    try {
      mediaStreamRef.current = stream;

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      inputAudioCtxRef.current = audioCtx;

      // CRITICAL: Ensure audio context is running (not suspended by browser autoplay policy)
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);

      // Analyser for real-time input level calculation
      const inputAnalyser = audioCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      source.connect(inputAnalyser);

      // ScriptProcessor for PCM audio chunk streaming
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;
      source.connect(processor);

      // Connect through a zero-gain node to keep processor active without audio feedback
      const silenceGain = audioCtx.createGain();
      silenceGain.gain.value = 0;
      processor.connect(silenceGain);
      silenceGain.connect(audioCtx.destination);

      const dataArray = new Uint8Array(inputAnalyser.frequencyBinCount);

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) {
          setInputLevel(0);
          return;
        }

        // Calculate real-time input level for waveform and panda character
        inputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const normalized = Math.min(
          1,
          (avg / 128) * (settingsRef.current.inputSensitivity || 1.0)
        );
        setInputLevel(normalized);

        // Convert audio to 16kHz PCM
        const channelData = e.inputBuffer.getChannelData(0);
        const { base64 } = downsampleTo16kPCM(channelData, audioCtx.sampleRate);

        // Send to Gemini Live WebSocket if connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'audio_input',
              data: base64,
            })
          );
        }
      };

      startSpeechRecognition();
      return true;
    } catch (setupErr: any) {
      console.error('[Echo] Audio processing initialization error:', setupErr);
      setErrorDetails('Audio processor error. Please try again or type below.');
      setSessionState('error');
      return false;
    }
  }, [startSpeechRecognition]);

  // Connect to Gemini Live WebSocket
  const connectWebSocket = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      setSessionState('connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'init',
            voice: settingsRef.current.voice,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            setSessionState(isMutedRef.current ? 'muted' : 'listening');
            resolve(true);
          } else if (msg.type === 'audio') {
            // Streaming audio chunk from Gemini Live
            setSessionState('speaking');
            playerRef.current?.enqueuePCMChunk(msg.data);
          } else if (msg.type === 'text_chunk') {
            // Streaming transcript text chunk from Gemini Live
            const textChunk = msg.text;
            setMessages((prev) => {
              const currentId = currentAssistantMsgIdRef.current;
              if (currentId && prev.some((m) => m.id === currentId)) {
                return prev.map((m) =>
                  m.id === currentId ? { ...m, text: m.text + textChunk } : m
                );
              } else {
                const newId = `assistant-${Date.now()}`;
                currentAssistantMsgIdRef.current = newId;
                return [
                  ...prev,
                  {
                    id: newId,
                    role: 'assistant',
                    text: textChunk,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ];
              }
            });
          } else if (msg.type === 'user_text_chunk') {
            // Streaming transcript text chunk for user speech from Gemini Live
            const userChunk = msg.text;
            setMessages((prev) => {
              const currentUserId = currentUserMsgIdRef.current;
              if (currentUserId && prev.some((m) => m.id === currentUserId)) {
                return prev.map((m) =>
                  m.id === currentUserId ? { ...m, text: m.text + userChunk } : m
                );
              } else {
                const newUserId = `user-${Date.now()}`;
                currentUserMsgIdRef.current = newUserId;
                return [
                  ...prev,
                  {
                    id: newUserId,
                    role: 'user',
                    text: userChunk,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ];
              }
            });
          } else if (msg.type === 'turn_complete') {
            currentAssistantMsgIdRef.current = null;
            currentUserMsgIdRef.current = null;
          } else if (msg.type === 'interrupted') {
            // User interrupted AI speaking
            playerRef.current?.stop();
            currentAssistantMsgIdRef.current = null;
            currentUserMsgIdRef.current = null;
            setSessionState(isMutedRef.current ? 'muted' : 'listening');
          } else if (msg.type === 'error') {
            setErrorDetails(msg.message || 'Connection notice.');
          } else if (msg.type === 'session_closed') {
            // Session closed
          }
        } catch {
          // Handled cleanly
        }
      };

      ws.onerror = () => {
        resolve(false);
      };

      ws.onclose = () => {
        wsRef.current = null;
      };

      // Timeout safety
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          resolve(false);
        }
      }, 5000);
    });
  }, []);

  // Primary Start Session
  const startSession = useCallback(async () => {
    setErrorDetails(null);

    // Resume audio player on user gesture
    playerRef.current?.resume();

    // 1. Start microphone capture
    const micOk = await startMicrophone();
    if (!micOk) return;

    // 2. Connect WebSocket to Gemini Live
    const wsOk = await connectWebSocket();
    if (!wsOk) {
      console.log('[Echo] WebSocket Live fallback: voice speech engine active');
      setSessionState(isMutedRef.current ? 'muted' : 'listening');
    }
  }, [startMicrophone, connectWebSocket]);

  // End Session cleanly
  const endSession = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'end' }));
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    playerRef.current?.stop();
    stopMicrophone();
    setSessionState('ended');
    currentAssistantMsgIdRef.current = null;
    currentUserMsgIdRef.current = null;
  }, [stopMicrophone]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (sessionState === 'listening' || sessionState === 'speaking') {
        setSessionState(next ? 'muted' : 'listening');
      }
      return next;
    });
  }, [sessionState]);

  // Send a prompt or text message (used by suggested starters and typed input)
  const sendPrompt = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setErrorDetails(null);
      playerRef.current?.resume();

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setSessionState('thinking');
      playerRef.current?.stop();

      // Check if WebSocket is open and responsive
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'text_input',
            text: userMsg.text,
          })
        );
      } else {
        // Fallback to companion /api/chat with Gemini Flash + TTS
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userMsg.text,
              history: messages,
              voice: settingsRef.current.voice,
            }),
          });

          const data = await res.json().catch(() => ({}));
          const replyText =
            data.reply ||
            "I'm right here with you! Let's explore that together. What would you like to know?";

          const assistantMsg: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          setMessages((prev) => [...prev, assistantMsg]);

          if (data.audio) {
            setSessionState('speaking');
            await playerRef.current?.playDataUrl(data.audio);
          } else if ('speechSynthesis' in window) {
            const synth = window.speechSynthesis;
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(replyText);
            utterance.rate = 1.02;
            utterance.pitch = 1.05;

            const voices = synth.getVoices();
            const voice =
              voices.find(
                (v) =>
                  (v.name.includes('Natural') ||
                    v.name.includes('Google') ||
                    v.name.includes('Samantha') ||
                    v.name.includes('Daniel')) &&
                  v.lang.startsWith('en')
              ) || voices.find((v) => v.lang.startsWith('en'));
            if (voice) utterance.voice = voice;

            setSessionState('speaking');

            const pulseInterval = setInterval(() => {
              setOutputLevel(0.35 + Math.random() * 0.45);
            }, 100);

            utterance.onend = () => {
              clearInterval(pulseInterval);
              setOutputLevel(0);
              setSessionState('ready');
            };

            utterance.onerror = () => {
              clearInterval(pulseInterval);
              setOutputLevel(0);
              setSessionState('ready');
            };

            synth.speak(utterance);
          } else {
            setSessionState('ready');
          }
        } catch {
          const assistantMsg: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text: "I'm right here with you! What would you like to chat about or explore next?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setSessionState('ready');
        }
      }
    },
    [messages]
  );

  // Sync ref for callback usage
  sendPromptRef.current = sendPrompt;

  // Clear conversation transcript
  const clearTranscript = useCallback(() => {
    setMessages([]);
  }, []);

  return {
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
  };
}
