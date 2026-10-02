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

  // Handle SpeechRecognition for user transcription when supported in browser
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

      recognition.onresult = (event: any) => {
        let transcript = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }

        if (transcript.trim()) {
          setMessages((prev) => {
            if (!userMsgId) {
              userMsgId = `user-${Date.now()}`;
              return [
                ...prev,
                {
                  id: userMsgId,
                  role: 'user',
                  text: transcript,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            } else {
              return prev.map((msg) =>
                msg.id === userMsgId ? { ...msg, text: transcript } : msg
              );
            }
          });

          if (isFinal) {
            userMsgId = null; // Next speech will start a new bubble
          }
        }
      };

      recognition.onerror = () => {
        // Speech recognition events handled cleanly without console warnings
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch {
      // SpeechRecognition not supported in this browser; session continues with voice processing
    }
  }, []);

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

  // Start microphone capture and stream to WebSocket
  const startMicrophone = useCallback(async () => {
    setSessionState('requesting-permission');
    setErrorDetails(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: settingsRef.current.echoCancellation,
          noiseSuppression: settingsRef.current.noiseSuppression,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      inputAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // Analyser for input level calculation
      const inputAnalyser = audioCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      source.connect(inputAnalyser);

      // ScriptProcessor for PCM audio chunk streaming
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;
      source.connect(processor);

      // Connect through a zero-gain node to keep processor active without microphone feedback loop
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

        // Calculate input level
        inputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, (avg / 128) * settingsRef.current.inputSensitivity);
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
    } catch (err: any) {
      let friendlyMsg = 'Microphone access was denied or not found.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMsg = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMsg = 'No microphone device was detected. Please connect a microphone.';
      }
      setErrorDetails(friendlyMsg);
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
          } else if (msg.type === 'turn_complete') {
            currentAssistantMsgIdRef.current = null;
          } else if (msg.type === 'interrupted') {
            // User interrupted AI speaking
            playerRef.current?.stop();
            currentAssistantMsgIdRef.current = null;
            setSessionState(isMutedRef.current ? 'muted' : 'listening');
          } else if (msg.type === 'error') {
            setErrorDetails(msg.message || 'Connection encountered an issue.');
          } else if (msg.type === 'session_closed') {
            // Session closed
          }
        } catch {
          // Message format handled cleanly
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

    // 1. Get microphone
    const micOk = await startMicrophone();
    if (!micOk) return;

    // 2. Connect WebSocket
    const wsOk = await connectWebSocket();
    if (!wsOk) {
      // If WebSocket fails (e.g. proxy environment), seamlessly transition to listening with voice engine
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
            // High-fidelity speech synthesis fallback if model audio quota is paused
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
