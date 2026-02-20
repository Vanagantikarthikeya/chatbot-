import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Activity, Radio, AlertCircle, Loader2, MessageCircle, XCircle } from 'lucide-react';
import { LiveSession } from '../services/geminiService';

const LiveMode: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<Array<{ text: string, role: 'user' | 'model', id: string }>>([]);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    liveSessionRef.current = new LiveSession(
      (vol) => setVolume(vol * 5),
      (newStatus, details) => {
          setStatus(newStatus);
          if (details) setErrorMessage(details);
      },
      (text, role) => {
        setTranscripts(prev => {
            const last = prev[prev.length - 1];
            const id = Date.now().toString();
            
            // Append short bursts to the same message to keep the UI clean
            if (last && last.role === role && last.text.length < 150) {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, text: last.text + (text.startsWith(' ') ? '' : ' ') + text };
                return updated;
            }
            return [...prev, { text, role, id }];
        });
      }
    );

    return () => {
      liveSessionRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const toggleSession = async () => {
    if (status === 'connected' || status === 'connecting') {
      liveSessionRef.current?.disconnect();
    } else {
      setErrorMessage(null);
      setTranscripts([]);
      try {
        await liveSessionRef.current?.connect();
      } catch (err) {
        console.error("Manual connect failed:", err);
      }
    }
  };

  const isActive = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-4">
      {/* Visual Hub & Control */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl">
        <div className={`absolute w-64 h-64 rounded-full border-2 border-cyan-500/10 transition-all duration-1000 ${isActive ? 'scale-125 opacity-100' : 'scale-75 opacity-0'}`} />
        
        <div className="z-10 text-center space-y-8 max-w-sm px-6">
            <div className="relative mx-auto w-44 h-44 flex items-center justify-center">
                <div 
                    className={`absolute inset-0 rounded-full blur-3xl transition-all duration-100 ease-out ${
                        status === 'error' ? 'bg-red-500/50' : 
                        isConnecting ? 'bg-amber-500/40' : 
                        isActive ? 'bg-cyan-400/60' : 'bg-slate-800/40'
                    }`}
                    style={{ 
                        transform: `scale(${isActive ? 1 + volume : 1})`,
                    }}
                />
                <div className={`w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all duration-300 relative z-10 ${
                    status === 'error' ? 'border-red-500 bg-red-950/20' :
                    isConnecting ? 'border-amber-500 animate-pulse bg-amber-900/10' :
                    isActive ? 'border-cyan-400 bg-cyan-950/20' : 'border-white/10 bg-white/5'
                }`}>
                    {status === 'error' ? <AlertCircle size={40} className="text-red-500" /> :
                    isConnecting ? <Loader2 size={40} className="text-amber-400 animate-spin" /> :
                    isActive ? <Activity size={40} className="text-cyan-400 animate-pulse"/> : 
                    <MicOff size={40} className="text-gray-600"/>}
                </div>
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                    {status === 'error' ? 'Link Fault' :
                    isConnecting ? 'Initializing Link' :
                    isActive ? 'Neural Stream Online' : 'Voice Assistant'}
                </h2>
                <div className="h-10">
                    {status === 'error' ? (
                        <p className="text-red-400 text-xs flex items-center justify-center gap-1">
                            <XCircle size={14} /> {errorMessage || 'Connection failed.'}
                        </p>
                    ) : (
                        <p className="text-gray-400 text-xs leading-relaxed italic">
                            {isConnecting ? "Negotiating real-time audio parameters..." :
                            isActive ? "Model is listening for your input." : 
                            "Multimodal low-latency interaction via Gemini Live."}
                        </p>
                    )}
                </div>
            </div>

            <button
                onClick={toggleSession}
                disabled={isConnecting}
                className={`px-10 py-4 rounded-full text-sm font-bold tracking-widest transition-all duration-300 flex items-center gap-3 mx-auto shadow-lg active:scale-95 ${
                    status === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/20'
                    : isActive 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 shadow-none' 
                    : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-cyan-500/30'
                }`}
            >
                {status === 'error' ? 'RETRY CONNECTION' : 
                 isConnecting ? 'LINKING...' : 
                 isActive ? 'TERMINATE LINK' : 'ESTABLISH LINK'}
            </button>
        </div>
      </div>

      {/* Neural Log / Transcription Panel */}
      <div className="w-full md:w-96 flex flex-col bg-slate-950/60 rounded-3xl border border-white/5 overflow-hidden shadow-xl backdrop-blur-md">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-500/80">Neural Transcript</span>
            </div>
            {isActive && <span className="text-[10px] text-green-500 flex items-center gap-1 animate-pulse"><Radio size={10} /> LIVE</span>}
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6 font-mono text-xs">
            {transcripts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-3">
                    <Activity size={32} className="text-slate-600" />
                    <p className="max-w-[150px]">No communication detected in current session buffer.</p>
                </div>
            )}
            {transcripts.map((t) => (
                <div key={t.id} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <span className={`text-[10px] mb-2 font-bold uppercase tracking-tighter ${t.role === 'user' ? 'text-cyan-600' : 'text-purple-500'}`}>
                        {t.role === 'user' ? '► USER_INPUT' : '◄ MODEL_OUTPUT'}
                    </span>
                    <div className={`p-3 rounded-2xl max-w-[95%] leading-relaxed ${
                        t.role === 'user' 
                        ? 'bg-cyan-500/10 text-cyan-50 border border-cyan-500/20 rounded-tr-none shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                        : 'bg-purple-500/10 text-purple-50 border border-purple-500/20 rounded-tl-none shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    }`}>
                        {t.text}
                    </div>
                </div>
            ))}
            <div ref={transcriptEndRef} />
        </div>

        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-gray-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                    PCM
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                    16/24kHz
                </div>
            </div>
            <div className="text-gray-600 font-bold">GEMINI_LIVE_NATIVE</div>
        </div>
      </div>
    </div>
  );
};

export default LiveMode;
