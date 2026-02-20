import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { UserLocation } from "../types";
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from "../utils/audioUtils";

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
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const parts: any[] = [];
  
  if (image) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: image.split(',')[1]
      }
    });
  }
  parts.push({ text: message });

  const config: any = {};
  
  if (thinkingBudget && thinkingBudget > 0) {
    config.thinkingConfig = { thinkingBudget };
  }

  if (useGrounding) {
    const tools: any[] = [];
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
  // Step 1: Ensure API Key is selected for Pro models
  if (size !== '1K' && typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
      }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = size === '1K' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
  
  const config: any = {
     imageConfig: {
       aspectRatio: "1:1"
     }
  };

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
    private isActive = false;
    
    constructor(
        private onVolumeChange: (vol: number) => void,
        private onStatusChange: (status: 'idle' | 'connecting' | 'connected' | 'error', details?: string) => void,
        private onTranscription: (text: string, role: 'user' | 'model') => void
    ) {}
  
    async connect() {
      if (this.isActive) return;
      
      // Step 1: Ensure API Key is selected (required for Gemini 2.5/3.0 Live features)
      if (typeof window !== 'undefined' && (window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
              await (window as any).aistudio.openSelectKey();
              // After opening the dialog, we proceed assuming the user selects/has a key
          }
      }

      this.isActive = true;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.nextStartTime = 0;
  
      try {
        this.onStatusChange('connecting');
        
        // Bluetooth-optimized constraints
        this.stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1,
                sampleRate: 16000
            } 
        });
        
        if (this.inputContext.state === 'suspended') await this.inputContext.resume();
        if (this.outputContext.state === 'suspended') await this.outputContext.resume();

        this.sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: this.handleOpen.bind(this),
            onmessage: this.handleMessage.bind(this),
            onclose: () => {
                this.onStatusChange('idle');
                this.disconnect();
            },
            onerror: (err: any) => {
                console.error("Live API Session Error:", err);
                const msg = err.message || '';
                if (msg.includes("Requested entity was not found")) {
                    this.onStatusChange('error', 'API Key permissions missing. Please select a valid paid project key.');
                } else {
                    this.onStatusChange('error', 'Network connection failed. Verify your internet and API status.');
                }
                this.disconnect();
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            systemInstruction: "You are Neural Nexus, a real-time voice AI. Speak naturally and concisely.",
          }
        });
      } catch (err: any) {
        console.error("Hardware/Permission Error:", err);
        this.onStatusChange('error', err.message || 'Microphone access denied.');
        this.isActive = false;
      }
    }
  
    private handleOpen() {
      if (!this.inputContext || !this.stream) return;
      this.onStatusChange('connected');
  
      this.inputSource = this.inputContext.createMediaStreamSource(this.stream);
      this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);
  
      this.processor.onaudioprocess = (e) => {
        if (!this.isActive) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
        this.onVolumeChange(Math.sqrt(sum / inputData.length));
  
        const pcmBlob = createPcmBlob(inputData);
        this.sessionPromise?.then(session => {
            session.sendRealtimeInput({ media: pcmBlob });
        }).catch(() => {});
      };
  
      this.inputSource.connect(this.processor);
      this.processor.connect(this.inputContext.destination);
    }
  
    private async handleMessage(message: LiveServerMessage) {
        if (!this.outputContext || !this.isActive) return;

        if (message.serverContent?.inputTranscription) {
            this.onTranscription(message.serverContent.inputTranscription.text, 'user');
        }
        if (message.serverContent?.outputTranscription) {
            this.onTranscription(message.serverContent.outputTranscription.text, 'model');
        }

        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputContext.currentTime);
            try {
                const audioBuffer = await decodeAudioData(
                    base64ToUint8Array(base64Audio),
                    this.outputContext,
                    24000,
                    1
                );
                const source = this.outputContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.outputContext.destination);
                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
                source.onended = () => this.sources.delete(source);
            } catch (e) { console.error("Audio Decode Error:", e); }
        }

        if (message.serverContent?.interrupted) {
            this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
            this.sources.clear();
            this.nextStartTime = 0;
        }
    }
  
    async disconnect() {
       this.isActive = false;
       this.stream?.getTracks().forEach(t => t.stop());
       this.inputSource?.disconnect();
       this.processor?.disconnect();
       this.inputContext?.close().catch(() => {});
       this.outputContext?.close().catch(() => {});
       this.onStatusChange('idle');
       this.sessionPromise = null;
    }
}