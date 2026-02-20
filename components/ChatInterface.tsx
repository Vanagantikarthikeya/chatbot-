import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Loader2, Globe, MapPin, Cpu, Search, Mic, MicOff } from 'lucide-react';
import { sendChatMessage } from '../services/geminiService';
import { Message, AppMode } from '../types';

import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ mode, onModeChange }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  // Initialize messages from localStorage or default
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_chat_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load chat history", error);
    }
    return [{ id: '0', role: 'model', text: 'Neural Nexus online. Systems nominal. How can I assist you today?' }];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Save to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem('nexus_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Update input with results
        if (finalTranscript) {
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) recognitionRef.current.start();
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    // Stop listening on send
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      let model = 'gemini-3-flash-preview';
      let thinkingBudget = 0;
      let useGrounding = false;
      let location = undefined;

      if (mode === AppMode.DEEP_THINK) {
        model = 'gemini-3.1-pro-preview';
        thinkingBudget = 32768;
      } else if (mode === AppMode.CHAT) {
         useGrounding = true;
         // Try to get real location
         try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
         } catch (e) {
            console.warn("Geolocation failed, using default", e);
            location = { latitude: 37.7749, longitude: -122.4194 };
         }
      }

      const response = await sendChatMessage(
        userMsg.text,
        model,
        messages,
        userMsg.image,
        useGrounding,
        location,
        thinkingBudget
      );

      const text = response.text || "I processed that, but have no text response.";
      const grounding = response.candidates?.[0]?.groundingMetadata;

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: text,
        groundingMetadata: grounding
      }]);

    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Error: Unable to process request. Check connectivity."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-2">
            {mode === AppMode.DEEP_THINK ? <Cpu className="text-purple-400" /> : <Globe className="text-cyan-400" />}
            <h2 className="font-bold text-lg text-white">
                {mode === AppMode.DEEP_THINK ? 'Deep Reasoning Engine' : 'Omni-Search Chat'}
            </h2>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => onModeChange(AppMode.CHAT)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${mode === AppMode.CHAT ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'text-gray-400 hover:text-white'}`}
            >
                FLASH + SEARCH
            </button>
            <button 
                onClick={() => onModeChange(AppMode.DEEP_THINK)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${mode === AppMode.DEEP_THINK ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' : 'text-gray-400 hover:text-white'}`}
            >
                PRO + THINKING
            </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-lg shadow-cyan-500/20' 
                : 'bg-slate-800/80 text-gray-100 rounded-bl-none border border-white/5'
            }`}>
              {msg.image && (
                <img src={msg.image} alt="Upload" className="max-w-full h-48 object-cover rounded-lg mb-2 border border-white/10" />
              )}
              <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base font-light markdown-body">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              
              {/* Grounding Sources Display */}
              {msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-400 w-full mb-1 flex items-center gap-1"><Search size={12}/> Sources:</span>
                  {msg.groundingMetadata.groundingChunks.map((chunk, idx) => {
                    if (chunk.web) {
                      return (
                        <a key={idx} href={chunk.web.uri} target="_blank" rel="noreferrer" 
                           className="flex items-center gap-1 bg-black/30 hover:bg-cyan-900/50 px-2 py-1 rounded text-xs text-cyan-200 border border-cyan-500/20 transition-colors">
                          <Globe size={10} /> {chunk.web.title}
                        </a>
                      );
                    }
                    if (chunk.maps) {
                      return (
                        <a key={idx} href={chunk.maps.uri} target="_blank" rel="noreferrer" 
                           className="flex items-center gap-1 bg-black/30 hover:bg-green-900/50 px-2 py-1 rounded text-xs text-green-200 border border-green-500/20 transition-colors">
                          <MapPin size={10} /> {chunk.maps.title}
                        </a>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center gap-2">
              <Loader2 className="animate-spin text-cyan-400" size={20} />
              <span className="text-xs text-cyan-400 animate-pulse">Neural Processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/40 border-t border-white/5">
        {selectedImage && (
            <div className="mb-2 relative inline-block">
                <img src={selectedImage} alt="Preview" className="h-16 rounded border border-cyan-500/30" />
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                >
                    ×
                </button>
            </div>
        )}
        <div className={`flex items-end gap-2 bg-slate-900/80 p-2 rounded-xl border transition-all duration-300 ${isListening ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/10'} focus-within:border-cyan-500/50`}>
          <label className="p-2 text-gray-400 hover:text-cyan-400 cursor-pointer transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <ImageIcon size={20} />
          </label>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
            placeholder={isListening ? "Listening..." : (mode === AppMode.DEEP_THINK ? "Ask a complex question..." : "Ask anything...")}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none resize-none max-h-32 py-2 min-h-[44px]"
            rows={1}
          />

          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-all duration-300 relative ${
                isListening 
                ? 'text-red-400 bg-red-500/10' 
                : 'text-gray-400 hover:text-cyan-400 hover:bg-white/5'
            }`}
          >
            {isListening && <span className="absolute inset-0 rounded-lg animate-ping bg-red-400/20" />}
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg text-white shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
          >
            <Send size={20} />
          </button>
        </div>
        {isListening && (
            <div className="mt-2 text-[10px] text-cyan-400 font-mono tracking-widest uppercase text-center animate-pulse">
                Neural Transcription Active
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;