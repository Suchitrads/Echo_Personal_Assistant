# Echo — AI Voice Companion

> "A friendly voice for curious minds."

Echo is a production-oriented, approachable AI voice companion web application powered by **Google Gemini Live API**. Featuring an adorable, professionally designed 3D baby panda mascot wearing a cozy soft mint hoodie, Echo enables users to speak naturally, ask questions, learn new concepts, and hear real-time spoken responses.

---

## Features

- **Genuine Real-Time Gemini Live Pipeline**: Low-latency, streaming two-way audio conversations with natural turns and interruptions.
- **Adorable 3D Baby Panda Mascot ("Echo")**: An expressive character illustration with organic breathing, natural eye-blinking, audio-reactive mouth movement, and responsive states (`listening`, `thinking`, `speaking`, `muted`, `error`, `ready`).
- **Dynamic Waveform**: An animated visualizer reflecting real microphone amplitude when listening and model audio energy when speaking.
- **Hybrid Voice & Text Transcript**: Auto-scrolling conversation history supporting spoken turns and quick starter suggestions.
- **Secure Full-Stack Backend**: Permanent Gemini API credentials remain strictly on the Node.js/Express server and are never exposed to the client.
- **Voice Customization**: Choose between multiple Gemini voice personas (Puck, Zephyr, Kore, Aoede, Charon, Fenrir) with adjustable sensitivity and noise suppression.
- **Soft Minimalism Aesthetic**: Warm off-white canvas (`#FAF9F6`), clean typography (Plus Jakarta Sans), and pastel accents (`#79BFA8` mint green, `#8BBEF5` sky blue).

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, Web Audio API
- **AI Engine**: Google Gemini Live API (`gemini-3.8-live`), Gemini Flash (`gemini-3.8-flash`), Gemini TTS (`gemini-3.8-flash-lite-tts`) via `@google/genai`
- **Backend**: Node.js, Express, WebSocket (`ws`), TypeScript (`tsx`)
- **Build & Dev**: Vite

---

## File Structure

```
├── .env.example              # Environment variables template
├── metadata.json             # Applet capabilities & metadata
├── package.json              # Dependencies & npm scripts
├── server.ts                 # Full-stack Express + WebSocket Live API server
├── index.html                # HTML entry point with Plus Jakarta Sans
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
└── src/
    ├── main.tsx              # React DOM entry point
    ├── App.tsx               # Main layout & orchestrator
    ├── index.css             # Tailwind base & custom animations
    ├── types/
    │   └── index.ts          # TypeScript interfaces (SessionState, Message, AppSettings)
    ├── lib/
    │   └── audio.ts          # Downsampling (16kHz PCM), AudioPlayer & visualizer utilities
    ├── hooks/
    │   └── useVoiceSession.ts # Core voice pipeline hook (WebSocket + mic + playback)
    └── components/
        ├── Header.tsx        # Top bar with status and settings trigger
        ├── PandaCharacter.tsx # 3D Panda mascot with reactive animations
        ├── AudioWaveform.tsx # Real-time audio waveform visualizer
        ├── VoiceControls.tsx # Microphone button, mute & end session controls
        ├── ConversationPanel.tsx # Transcript history with quick text input
        ├── SuggestedStarters.tsx # Curated conversational topic buttons
        └── SettingsModal.tsx # Voice persona & audio settings modal
```

---

## Local Installation

1. **Clone or open the repository**:
   ```bash
   npm install
   ```

2. **Configure your API Key**:
   Create a `.env` file in the root directory based on `.env.example`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(In Google AI Studio, this is automatically injected into the server environment).*

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   The dev server will start on `http://localhost:3000`.

---

## Testing Voice Interaction

1. Open `http://localhost:3000` in Google Chrome, Edge, or Safari.
2. Click **Start talking**.
3. When prompted, grant microphone permission in your browser.
4. Watch Echo lean forward attentively into the `listening` state.
5. Speak a question (e.g., *"Hi Echo, can you tell me a fun fact about pandas?"*).
6. Listen to Echo speak back in real time while the panda's mouth and the mint green waveform animate to the spoken sound!
7. Try pressing the mute button to pause audio transmission or choose a suggested prompt to explore a new topic.

---

## Deployment to Google Cloud Run / AI Studio

1. **Build the production assets**:
   ```bash
   npm run build
   ```
2. **Start the production server**:
   ```bash
   npm start
   ```
   The server serves static files from `dist` while hosting the real-time WebSocket endpoint on the configured `PORT`.

---

## Security & API Limits

- **Security**: The Gemini API key is accessed exclusively on the server (`process.env.GEMINI_API_KEY`). No client-side code has access to the secret.
- **Quota & Billing**: Gemini Live API usage is billed based on audio input/output streaming duration. For high traffic, ensure your Google Cloud project has adequate quota and billing alerts configured.
- **Microphone Permissions**: Modern browsers require HTTPS (or localhost) to grant microphone access. Ensure production domains run under valid SSL/TLS certificates.
