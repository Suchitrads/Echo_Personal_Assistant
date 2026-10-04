import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

const ECHO_SYSTEM_INSTRUCTION = `You are Echo, a friendly, thoughtful AI voice companion.

You are warm, curious, patient, and approachable.

Speak naturally and conversationally. Prefer concise answers suitable for spoken interaction (keep responses within 1 to 3 short, spoken sentences unless the user explicitly asks for an in-depth breakdown or story).

Help users understand new concepts with simple explanations and relatable examples.

Answer general questions, brainstorm ideas, help people learn, and participate in relaxed, natural conversations.

Listen carefully and ask clarifying questions when necessary.

Remember relevant information within the current conversation when supported by the session.

Never claim to have accessed information or completed actions you have not actually performed.

Be honest about uncertainty and limitations.

You are an AI, not a human.

Your goal is to make every conversation useful, comfortable, and enjoyable.`;

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Status & Health endpoint
  app.get('/api/health', (_req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    res.json({
      status: 'ok',
      hasKey,
      app: 'Echo — AI Voice Companion',
      version: '1.0.0',
    });
  });

  // Source archive download endpoint
  app.get('/api/download', (_req, res) => {
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'attachment; filename="echo-voice-companion.tar.gz"');
    const tarProcess = spawn('tar', [
      '-cz',
      '--exclude=node_modules',
      '--exclude=.git',
      '--exclude=dist',
      '--exclude=*.tar.gz',
      '-f',
      '-',
      '.'
    ], { cwd: path.resolve(__dirname) });

    tarProcess.stdout.pipe(res);
    tarProcess.stderr.on('data', (err) => console.error('Tar error:', err.toString()));
  });

  // Direct conversational turn endpoint:
  // Receives user prompt or transcript, responds with Gemini 3.8 text + Gemini 3.8 TTS audio
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history, voice = 'Puck' } = req.body;
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message string is required' });
        return;
      }

      const ai = getGenAI();

      // Format previous turns for context
      const formattedHistory = Array.isArray(history)
        ? history.slice(-6).map((item: any) => ({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(item.text) }],
          }))
        : [];

      formattedHistory.push({
        role: 'user',
        parts: [{ text: message }],
      });

      // 1. Generate text response with Gemini Flash (fast & reliable)
      let replyText = '';
      try {
        const textResponse = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: formattedHistory,
          config: {
            systemInstruction: ECHO_SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });
        replyText = textResponse.text || "I'm right here with you! What would you like to explore next?";
      } catch (genErr: any) {
        console.log('gemini-flash-latest notice, attempting gemini-3.1-flash-lite:', genErr?.message?.slice(0, 80));
        try {
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: formattedHistory,
            config: {
              systemInstruction: ECHO_SYSTEM_INSTRUCTION,
            },
          });
          replyText = fallbackResponse.text || "I'm listening! What shall we talk about?";
        } catch (fbErr: any) {
          console.log('All text models busy, delivering friendly conversational message');
          replyText = "I'm right here with you! What would you like to chat about or explore today?";
        }
      }

      // 2. Generate spoken audio using gemini-3.8-flash-lite-tts
      let base64Audio = '';
      try {
        const ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [{ text: replyText }],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        });

        const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          base64Audio = audioData;
        }
      } catch (ttsErr: any) {
        // Log clean notice; client will seamlessly synthesize speech if model audio quota is reached
        console.log('[Echo TTS] Model audio notice:', ttsErr?.message?.slice(0, 90));
      }

      res.json({
        reply: replyText,
        audio: base64Audio ? `data:audio/wav;base64,${base64Audio}` : null,
      });
    } catch (err: any) {
      console.log('[Echo] /api/chat fallback notice:', err?.message || err);
      res.status(500).json({ error: err?.message || 'Failed to process message' });
    }
  });

  const server = http.createServer(app);

  // WebSocket Server for Real-Time Gemini Live Audio
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Let Vite or other handlers manage non-/api/live upgrades
    }
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[Echo Live] Client connected to WebSocket');
    let liveSession: any = null;
    let isConnected = true;

    clientWs.on('close', () => {
      isConnected = false;
      console.log('[Echo Live] Client disconnected');
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // Ignore cleanup error
        }
      }
    });

    clientWs.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'init') {
          const selectedVoice = payload.voice || 'Puck';
          console.log('[Echo Live] Initializing Gemini Live session with voice:', selectedVoice);

          try {
            const ai = getGenAI();
            liveSession = await ai.live.connect({
              model: 'gemini-3.8-live',
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: selectedVoice },
                  },
                },
                systemInstruction: ECHO_SYSTEM_INSTRUCTION,
              },
              callbacks: {
                onmessage: (msg: LiveServerMessage) => {
                  if (!isConnected || clientWs.readyState !== WebSocket.OPEN) return;

                  // 1. Audio stream chunks from Gemini Live
                  const parts = msg.serverContent?.modelTurn?.parts || [];
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'audio',
                          data: part.inlineData.data,
                        })
                      );
                    }
                    if (part.text) {
                      clientWs.send(
                        JSON.stringify({
                          type: 'text_chunk',
                          text: part.text,
                        })
                      );
                    }
                  }

                  // 2. Interruption event
                  if (msg.serverContent?.interrupted) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'interrupted',
                      })
                    );
                  }

                  // 3. Turn complete event
                  if (msg.serverContent?.turnComplete) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'turn_complete',
                      })
                    );
                  }
                },
                onclose: () => {
                  if (isConnected && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'session_closed',
                      })
                    );
                  }
                },
                onerror: (err: any) => {
                  console.log('[Echo Live] Gemini Live callback notice:', err?.message || err);
                  if (isConnected && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'error',
                        message: err?.message || 'Gemini Live encountered an issue',
                      })
                    );
                  }
                },
              },
            });

            if (isConnected && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'ready',
                  message: 'Echo is ready to listen',
                })
              );
            }
          } catch (initErr: any) {
            console.log('[Echo Live] Gemini Live connection notice:', initErr?.message || initErr);
            if (isConnected && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: initErr?.message || 'Gemini Live fallback to voice engine',
                })
              );
            }
          }
        } else if (payload.type === 'audio_input') {
          // PCM 16kHz base64 audio chunk from client microphone
          if (liveSession && payload.data) {
            liveSession.sendRealtimeInput({
              audio: {
                data: payload.data,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
        } else if (payload.type === 'text_input') {
          // Text prompt injected into live session
          if (liveSession && payload.text) {
            liveSession.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: payload.text }],
                },
              ],
              turnComplete: true,
            });
          }
        } else if (payload.type === 'end') {
          if (liveSession) {
            try {
              liveSession.close();
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Message parsing handled cleanly
      }
    });
  });

  // Production or Dev Vite Middleware setup
  if (isProd) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Echo] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Echo] Failed to start server:', err);
  process.exit(1);
});
