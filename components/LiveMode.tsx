import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Activity, Radio } from 'lucide-react';
import { LiveSession } from '../services/geminiService';

const LiveMode: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [volume, setVolume] = useState(0);
  const liveSessionRef = useRef<LiveSession | null>(null);

  useEffect(() => {
    liveSessionRef.current = new LiveSession(
      (vol) => setVolume(vol * 5), // Amplify for visual
      (connected) => setIsActive(connected)
    );

    return () => {
      liveSessionRef.current?.disconnect();
    };
  }, []);

  const toggleSession = () => {
    if (isActive) {
      liveSessionRef.current?.disconnect();
    } else {
      liveSessionRef.current?.connect();
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Visualizer Background Ring */}
      <div className={`absolute w-96 h-96 rounded-full border-2 border-cyan-500/20 transition-all duration-300 ${isActive ? 'scale-110 opacity-100' : 'scale-90 opacity-0'}`} />
      <div className={`absolute w-[500px] h-[500px] rounded-full border border-purple-500/10 transition-all duration-700 ${isActive ? 'scale-105 opacity-100 animate-pulse' : 'scale-75 opacity-0'}`} />

      {/* Main Status Display */}
      <div className="z-10 text-center space-y-8">
        <div className="relative">
             {/* Dynamic Orb */}
            <div 
                className={`w-40 h-40 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 blur-md transition-transform duration-75 ease-out shadow-[0_0_100px_rgba(34,211,238,0.3)]`}
                style={{ 
                    transform: `scale(${isActive ? 1 + volume : 1})`,
                    opacity: isActive ? 0.9 : 0.3
                }}
            />
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
                 {isActive ? <Activity size={48} className="text-white animate-pulse"/> : <MicOff size={48} className="text-gray-400"/>}
            </div>
        </div>

        <div>
            <h2 className="text-2xl font-bold text-white mb-2">{isActive ? 'Listening...' : 'Live Voice Mode'}</h2>
            <p className="text-gray-400 max-w-md mx-auto">
                {isActive 
                    ? "Speak naturally. Gemini is processing your audio stream in real-time." 
                    : "Connect to start a low-latency voice conversation powered by the Gemini Live API."}
            </p>
        </div>

        <button
          onClick={toggleSession}
          className={`px-8 py-4 rounded-full text-lg font-bold tracking-wider transition-all duration-300 flex items-center gap-3 mx-auto ${
            isActive 
              ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' 
              : 'bg-cyan-500 text-black hover:bg-cyan-400 hover:scale-105 shadow-[0_0_30px_rgba(6,182,212,0.5)]'
          }`}
        >
          {isActive ? (
            <>
              <Radio size={24} className="animate-pulse" /> END SESSION
            </>
          ) : (
            <>
              <Mic size={24} /> START LISTENING
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LiveMode;