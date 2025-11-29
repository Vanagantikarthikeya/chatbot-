import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { UserLocation } from "../types";
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from "../utils/audioUtils";

const API_KEY = process.env.API_KEY || ''; // Use environment variable
const ai = new GoogleGenAI({ apiKey: API_KEY });

// -- Chat & Reasoning --
export const sendChatMessage = async (
  message: string,
  modelName: string,
  history: any[],
  image?: string,
  useGrounding: boolean = false,
  location?: UserLocation,
  thinkingBudget?: number
) => {
  const parts: any[] = [];
  
  if (image) {
    parts.push({
      inlineData: {
        mimeType: 'image/png', // Simplified assumption for this demo
        data: image.split(',')[1] // Remove data URL prefix
      }
    });
  }
  parts.push({ text: message });

  const config: any = {};
  
  // Thinking Config
  if (thinkingBudget && thinkingBudget > 0) {
    config.thinkingConfig = { thinkingBudget };
  }

  // Grounding Config
  if (useGrounding) {
    const tools: any[] = [];
    // Combine Search and Maps if relevant
    tools.push({ googleSearch: {} });
    tools.push({ googleMaps: {} });
    config.tools = tools;

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }
      };
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        role: 'user',
        parts: parts
      },
      config
    });
    return response;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// -- Image Generation --
export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K') => {
  // Determine model based on quality needed
  const model = size === '1K' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
  
  const config: any = {
     imageConfig: {
       aspectRatio: "1:1"
     }
  };

  // Only Pro supports size param explicitly in this manner via specific config or model capability
  if (model === 'gemini-3-pro-image-preview') {
      config.imageConfig.imageSize = size;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: prompt }] },
      config
    });
    return response;
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};


// -- Live API --
export class LiveSession {
    private sessionPromise: Promise<any> | null = null;
    private inputContext: AudioContext | null = null;
    private outputContext: AudioContext | null = null;
    private nextStartTime = 0;
    private sources = new Set<AudioBufferSourceNode>();
    private stream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private inputSource: MediaStreamAudioSourceNode | null = null;
    
    constructor(
        private onVolumeChange: (vol: number) => void,
        private onStatusChange: (connected: boolean) => void
    ) {}
  
    async connect() {
      this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.nextStartTime = 0;
  
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.onStatusChange(true);
        
        this.sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: this.handleOpen.bind(this),
            onmessage: this.handleMessage.bind(this),
            onclose: () => this.onStatusChange(false),
            onerror: (err) => console.error(err)
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction: "You are Neural Nexus, a helpful, witty AI assistant. Keep responses concise.",
          }
        });
      } catch (err) {
        console.error("Live Connect Error:", err);
        this.onStatusChange(false);
      }
    }
  
    private handleOpen() {
      if (!this.inputContext || !this.stream) return;
  
      this.inputSource = this.inputContext.createMediaStreamSource(this.stream);
      this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);
  
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Simple volume meter
        let sum = 0;
        for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
        this.onVolumeChange(Math.sqrt(sum / inputData.length));
  
        const pcmBlob = createPcmBlob(inputData);
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
            });
        }
      };
  
      this.inputSource.connect(this.processor);
      this.processor.connect(this.inputContext.destination);
    }
  
    private async handleMessage(message: LiveServerMessage) {
        if (!this.outputContext) return;

        const data = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (data) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputContext.currentTime);
            const audioBuffer = await decodeAudioData(
                base64ToUint8Array(data),
                this.outputContext,
                24000,
                1
            );
            
            const source = this.outputContext.createBufferSource();
            source.buffer = audioBuffer;
            const gain = this.outputContext.createGain();
            source.connect(gain);
            gain.connect(this.outputContext.destination);
            
            source.addEventListener('ended', () => {
                this.sources.delete(source);
            });
            
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
        }

        if (message.serverContent?.interrupted) {
            this.sources.forEach(s => s.stop());
            this.sources.clear();
            this.nextStartTime = 0;
        }
    }
  
    async disconnect() {
       if (this.sessionPromise) {
         // There is no explicit close() on the session object returned by connect in some versions, 
         // but we can stop sending and close contexts.
         // In strict strict implementations, we wait for session and call close if available.
       }
       
       this.stream?.getTracks().forEach(t => t.stop());
       this.inputSource?.disconnect();
       this.processor?.disconnect();
       this.inputContext?.close();
       this.outputContext?.close();
       this.onStatusChange(false);
    }
}
