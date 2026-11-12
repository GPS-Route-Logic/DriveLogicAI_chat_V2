import EventEmitter from "events";
import net from "net";
import fs from "fs";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ override: true });

// Prevent unhandled WebSocket & Socket senderOnError / TLSSocket crashes
const origEventEmitterEmit = EventEmitter.prototype.emit;
EventEmitter.prototype.emit = function (event: string | symbol, ...args: any[]) {
  if (event === 'error') {
    if (this.listenerCount(event) === 0) {
      return false;
    }
  }
  return origEventEmitterEmit.apply(this, [event, ...args]);
};

const origSocketEmit = net.Socket.prototype.emit;
net.Socket.prototype.emit = function (event: string | symbol, ...args: any[]) {
  if (event === 'error') {
    if (this.listenerCount(event) === 0) {
      return false;
    }
  }
  return origSocketEmit.apply(this, [event, ...args]);
};

const origWebSocketEmit = WebSocket.prototype.emit;
WebSocket.prototype.emit = function (event: string | symbol, ...args: any[]) {
  if (event === 'error') {
    if (this.listenerCount(event) === 0) {
      return false;
    }
  }
  return origWebSocketEmit.apply(this, [event, ...args]);
};

process.on('uncaughtException', (err: any) => {
  if (!err) return;
  const msg = String(err?.message || err);
  if (
    msg.includes('senderOnError') ||
    msg.includes('authorizationError') ||
    msg.includes('WebSocket') ||
    msg.includes('ECONNRESET') ||
    msg.includes('EPIPE')
  ) {
    return;
  }
  console.error('[DriveLogicAI] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('[DriveLogicAI] Unhandled rejection:', reason?.message || reason);
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  
  app.use(express.json({ limit: '10mb' }));

  // CORS and domain headers for Squarespace (drivelgicaiapp.com) and Google AI Studio (drivelogicai.ai.studio)
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("[DriveLogicAI] GEMINI_API_KEY is not set. Features relying on GenAI will return setup notices.");
  }

  const ai = new GoogleGenAI({ 
    apiKey: apiKey || "dummy-key-placeholder",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Health and key checks
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: Date.now(),
      domain: process.env.CUSTOM_DOMAIN || "drivelgicaiapp.com",
      aiStudioDomain: process.env.AI_STUDIO_DOMAIN || "drivelogicai.ai.studio",
      port: PORT,
      geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      mapsConfigured: !!(process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_MAPS_API_KEY)
    });
  });

  app.get("/api/keytest", (req, res) => {
    res.json({ key: (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) ? "configured" : "missing" });
  });

  // Streaming AI Chat endpoint for AIChatbot.tsx
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history, useSearch, useMaps, modelType, role } = req.body;
      
      if (!apiKey) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.write("Gemini API key is not configured. Please supply GEMINI_API_KEY in Google AI Studio Secrets or your environment settings.");
        res.end();
        return;
      }

      // Map models to valid current generation models
      let selectedModel = "gemini-3.8-flash";
      if (modelType === "gemini-3.1-pro-preview" || modelType === "gemini-4-argon") {
        selectedModel = "gemini-3.8-flash";
      } else if (modelType === "gemini-3.1-flash-lite") {
        selectedModel = "gemini-3.5-flash-lite";
      } else if (modelType === "gemini-3.5-flash") {
        selectedModel = "gemini-3.8-flash";
      }

      let systemRoleText = "You are DriveLogic AI, an advanced automotive assistant.";
      if (role === 'Mechanic') {
        systemRoleText = "You are a Master Automotive Diagnostic Specialist. Diagnose OBD-II codes, mechanical problems, and sensor telemetry with 99% accuracy. Offer actionable repair and maintenance steps.";
      } else if (role === 'Navigator') {
        systemRoleText = "You are an expert GPS Route Optimization AI. Recommend routes, assess hazards, road conditions, and speed traps to protect vehicle components and minimize travel time.";
      }

      const tools: any[] = [];
      if (useSearch || useMaps) {
        tools.push({ googleSearch: {} });
      }

      const formattedContents: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          if (item && item.text) {
            formattedContents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.text }]
            });
          }
        }
      }
      formattedContents.push({
        role: 'user',
        parts: [{ text: message || "Hello" }]
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      const responseStream = await ai.models.generateContentStream({
        model: selectedModel,
        contents: formattedContents,
        config: {
          systemInstruction: systemRoleText,
          tools: tools.length > 0 ? tools : undefined,
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(chunk.text);
        }
      }
      res.end();
    } catch (e: any) {
      console.error("[DriveLogicAI] Chat streaming error:", e.message);
      if (!res.headersSent) {
        res.status(500).send(`AI Chat Error: ${e.message}`);
      } else {
        res.write(`\n[Stream Error: ${e.message}]`);
        res.end();
      }
    }
  });

  // Voice Command endpoint
  app.post("/api/gemini/command", async (req, res) => {
    try {
      const { text, history, contextData } = req.body;
      const model = "gemini-3.8-flash";

      const tools = [
        {
          functionDeclarations: [
            {
              name: "changeTab",
              description: "Change the current application tab",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  tab: { type: Type.STRING, enum: ["obd", "damage", "gps", "maintenance", "subscription"], description: "Tab to switch to" }
                },
                required: ["tab"]
              }
            },
            {
              name: "setNavigation",
              description: "Set the navigation route from and to locations",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  from: { type: Type.STRING, description: "Starting location" },
                  to: { type: Type.STRING, description: "Destination location" }
                },
                required: ["from", "to"]
              }
            },
            {
              name: "diagnoseVehicle",
              description: "Run an AI diagnostic check on the vehicle's current health",
              parameters: { type: Type.OBJECT, properties: {} }
            },
            {
              name: "toggleRecording",
              description: "Start or stop trip data recording",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING, enum: ["start", "stop"], description: "Whether to start or stop recording" }
                },
                required: ["action"]
              }
            }
          ]
        },
        { googleSearch: {} }
      ];

      const systemInstruction = `You are DriveLogic AI, an expert automotive diagnostics and GPS route optimization AI.
You give driving directions in real-time on a GPS map.
Recommend alternate routes based on logged trip data, OBD2 data, and damage scores.
Analyse the provided OBD-II sensor data and give a concise, actionable report: identify anomalies, likely causes, and recommended actions.
Current Speed: ${contextData?.speed ? Math.round(contextData.speed * 0.621371) : 0} mph.
Current RPM: ${contextData?.rpm || 0}.
Recording Status: ${contextData?.isRecording ? 'Recording' : 'Not recording'}.
Vehicle Model: ${contextData?.vehicleModel || 'Standard Vehicle'}.`;

      let formattedHistory: any[] = [];
      if (history && Array.isArray(history)) {
        formattedHistory = history.map((msg: any) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));
      }
      formattedHistory.push({ role: 'user', parts: [{ text }] });

      const response = await ai.models.generateContent({
        model,
        contents: formattedHistory,
        config: { 
          tools: tools as any,
          systemInstruction,
        }
      });

      res.json({ text: response.text, functionCalls: response.functionCalls });
    } catch (e: any) {
      console.warn("[DriveLogicAI] Command API error:", e.message);
      res.status(500).json({ error: e.message, text: "Command processor is temporarily unavailable." });
    }
  });

  // Vehicle Diagnosis endpoint
  app.post("/api/gemini/diagnose", async (req, res) => {
    try {
      const { data, sensorHistory, vehicleModel } = req.body;
      const model = "gemini-3.8-flash";
      
      const vehicleContext = vehicleModel ? `Vehicle Model: ${vehicleModel}` : `Vehicle Model: Standard`;

      const sensorContext = sensorHistory && sensorHistory.length > 0 
        ? `Recent Sensor Activity (last 60s):
           - Peak Acceleration: ${Math.max(...sensorHistory.map((h: any) => h.accel || 0)).toFixed(2)}G
           - Peak Rotation Rate: ${Math.max(...sensorHistory.map((h: any) => h.gyro || 0)).toFixed(2)} deg/s
           - Average Vibration Level: ${(sensorHistory.reduce((acc: number, h: any) => acc + (h.accel || 0), 0) / sensorHistory.length).toFixed(3)}G`
        : "No recent sensor data available.";

      const prompt = `You are DriveLogic AI automotive diagnostic specialist.
Analyze the following high-fidelity telemetry to provide a diagnostic report with 99% accuracy.

${vehicleContext}

OBD-II LIVE DATA:
- RPM: ${data?.rpm || 0}
- Speed: ${Math.round((data?.speed || 0) * 0.621371)} mph
- Engine Coolant Temperature: ${Math.round(((data?.coolantTemp || 85) * 9/5) + 32)} °F
- Calculated Engine Load: ${(data?.load || 0).toFixed(1)}%
- Throttle Position: ${(data?.throttlePos || 0).toFixed(1)}%
- Battery System Voltage: ${(data?.voltage || 12.6).toFixed(2)}V
- Active DTCs: ${data?.dtcs && data.dtcs.length > 0 ? data.dtcs.join(', ') : 'None detected'}

IMU SENSOR DATA:
${sensorContext}

TASK:
1. Provide a "Vehicle Health Index" (0-100%).
2. Perform a "System Check" on Engine, Battery, and Driving Behavior.
3. Correlate OBD data with Sensor data.
4. Offer specific actionable maintenance advice if needed.
Keep the tone professional, technical yet accessible, and concise. Use Markdown.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      res.json({ text: response.text });
    } catch (e: any) {
      console.warn("[DriveLogicAI] Diagnosis error:", e.message);
      res.status(500).json({ error: e.message, text: "AI Diagnosis is currently unavailable." });
    }
  });

  // DTC Code Lookup endpoint
  app.post("/api/gemini/dtc", async (req, res) => {
    try {
      const { code } = req.body;
      const model = "gemini-3.8-flash";
      const prompt = `You are an expert automotive diagnostics AI. Provide a concise, plain English explanation of the OBD-II Diagnostic Trouble Code (DTC) ${code}. Include the likely causes, safety implications, and recommended actions. Keep the response under 150 words.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      res.json({ text: response.text });
    } catch (e: any) {
      console.warn("[DriveLogicAI] DTC error:", e.message);
      res.status(500).json({ error: e.message, text: null });
    }
  });

  // Route Recommendation endpoint (fixed: removed invalid googleMaps tool payload)
  app.post("/api/gemini/route", async (req, res) => {
    try {
      const { trips } = req.body;
      if (!trips || trips.length < 2) return res.json({ text: "Not enough trip data for recommendations." });
      
      const model = "gemini-3.8-flash";
      const tripSummary = trips.map((t: any) => ({
        damage: t.averageDamageScore,
        distance: t.distance,
        events: t.events?.length || 0
      }));

      const prompt = `Based on the following recent driving history, provide a brief route optimization recommendation to reduce vehicle wear and tear.
Trips: ${JSON.stringify(tripSummary)}
Provide 1-3 proactive alerts for upcoming harsh driving conditions, road hazards, or inefficient routes based on this data. Use Markdown.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      res.json({ text: response.text });
    } catch (e: any) {
      console.warn("[DriveLogicAI] Route error:", e.message);
      res.status(500).json({ error: e.message, text: "Route recommendations are currently unavailable." });
    }
  });

  // Vite middleware for development & Static hosting for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: [
          'drivelogicai.ai.studio',
          'drivelgicaiapp.com',
          'www.drivelgicaiapp.com',
          'localhost',
          '127.0.0.1',
          '.ai.studio',
          '.run.app'
        ]
      },
      appType: "spa",
    });
    // appType "spa" makes Vite serve (and transform) index.html for client-side routes.
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 5 (path-to-regexp v8) rejects a bare '*' route; '/{*splat}' is the v5 catch-all.
    app.get('/{*splat}', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('DriveLogic AI: Application build not found. Please build using npm run build.');
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DriveLogicAI] Server running on http://0.0.0.0:${PORT} (Domain: drivelgicaiapp.com / drivelogicai.ai.studio)`);
  });

  // Setup WebSocket server for Gemini Live API
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on("connection", async (clientWs) => {
    console.log("[DriveLogicAI] WebSocket connected to /live");
    
    let session: any = null;
    let messageQueue: any[] = [];
    let isReady = false;

    clientWs.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (!isReady || !session) {
          messageQueue.push(parsed);
          return;
        }
        if (parsed.audio) {
          session.sendRealtimeInput({ audio: { mimeType: "audio/pcm;rate=16000", data: parsed.audio } });
        }
        if (parsed.text) {
          session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: parsed.text }] }],
            turnComplete: true
          });
        }
        if (parsed.toolResponse) {
          session.sendToolResponse(parsed.toolResponse);
        }
      } catch (err) {
        console.error("[DriveLogicAI] Live API WS message error:", err);
      }
    });

    if (!apiKey) {
      clientWs.send(JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }));
      clientWs.close();
      return;
    }

    try {
      await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: "ping"
      });
    } catch (e: any) {
      console.warn("[DriveLogicAI] API Key validation notice:", e.message);
    }

    try {
      const liveModel = "gemini-3.8-live";
      const connectPromise = ai.live.connect({
        model: liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: { parts: [{ text: "You are Drive-Logic, an expert automotive diagnostics and GPS route optimisation AI. Your very first message must ALWAYS be EXACTLY: 'Hi, I\\'m Drive-Logic! How can I assist you today?'. You speak with an English woman's accent. Recommend alternate routes based on logged trip data, OBD2 data, and road hazard scores." }] },
          tools: [
            {
              functionDeclarations: [
                {
                  name: "changeTab",
                  description: "Change the current application tab",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      tab: { type: Type.STRING, enum: ["obd", "damage", "gps", "maintenance", "subscription"], description: "Tab to switch to" }
                    },
                    required: ["tab"]
                  }
                },
                {
                  name: "setNavigation",
                  description: "Set the navigation route from and to locations",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      from: { type: Type.STRING, description: "Starting location" },
                      to: { type: Type.STRING, description: "Destination location" }
                    },
                    required: ["from", "to"]
                  }
                },
                {
                  name: "diagnoseVehicle",
                  description: "Run an AI diagnostic check on the vehicle's current health",
                  parameters: { type: Type.OBJECT, properties: {} }
                },
                {
                  name: "toggleRecording",
                  description: "Start or stop trip data recording",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      action: { type: Type.STRING, enum: ["start", "stop"], description: "Whether to start or stop recording" }
                    },
                    required: ["action"]
                  }
                }
              ]
            },
            { googleSearch: {} }
          ]
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const serverContent = message.serverContent as any;
            const parts = serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({ text: part.text }));
                }
              }
            }
            const userParts = serverContent?.userTurn?.parts;
            if (userParts) {
              for (const part of userParts) {
                if (part.text) {
                  clientWs.send(JSON.stringify({ userText: part.text }));
                }
              }
            }
            if (serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
            if (message.toolCall) {
              clientWs.send(JSON.stringify({ toolCall: message.toolCall }));
            }
          },
        },
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection to Gemini Live API timed out")), 6000);
      });

      session = await Promise.race([connectPromise, timeoutPromise]) as any;

      isReady = true;
      clientWs.send(JSON.stringify({ ready: true }));

      while (messageQueue.length > 0) {
        const parsed = messageQueue.shift();
        if (parsed.audio) {
          session.sendRealtimeInput({ audio: { mimeType: "audio/pcm;rate=16000", data: parsed.audio } });
        }
        if (parsed.text) {
          session.sendClientContent({
            turns: [{ role: "user", parts: [{ text: parsed.text }] }],
            turnComplete: true
          });
        }
        if (parsed.toolResponse) {
          session.sendToolResponse(parsed.toolResponse);
        }
      }

      clientWs.on("close", () => {
        console.log("[DriveLogicAI] Client disconnected from /live");
      });
    } catch (err: any) {
      console.warn("[DriveLogicAI] Gemini Live API connection notice:", err.message);
      clientWs.send(JSON.stringify({ error: err.message || "Failed to connect to Live API" }));
    }
  });
}

startServer();
