import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import NeuronBackground from './components/NeuronBackground';
import ChatInterface from './components/ChatInterface';
import LiveMode from './components/LiveMode';
import ImageGenerator from './components/ImageGenerator';
import TemporaryChat from './components/TemporaryChat';
import { AppMode } from './types';
import { MessageSquare, Mic, Image as ImageIcon, BrainCircuit, Activity, Zap } from 'lucide-react';

// Color map to avoid dynamic Tailwind class generation issues with CDN
const COLOR_CLASSES = {
  cyan: {
    active: 'bg-cyan-500/20 border-cyan-500 text-white scale-105 shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    icon: 'text-cyan-400',
    hover: 'group-hover:text-cyan-400 group-hover:bg-cyan-500/10'
  },
  purple: {
    active: 'bg-purple-500/20 border-purple-500 text-white scale-105 shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    icon: 'text-purple-400',
    hover: 'group-hover:text-purple-400 group-hover:bg-purple-500/10'
  },
  red: {
    active: 'bg-red-500/20 border-red-500 text-white scale-105 shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    icon: 'text-red-400',
    hover: 'group-hover:text-red-400 group-hover:bg-red-500/10'
  },
  pink: {
    active: 'bg-pink-500/20 border-pink-500 text-white scale-105 shadow-[0_0_30px_rgba(236,72,153,0.3)]',
    icon: 'text-pink-400',
    hover: 'group-hover:text-pink-400 group-hover:bg-pink-500/10'
  }
};

const NavButton = ({ 
  mode, 
  activeMode, 
  setActiveMode, 
  icon: Icon, 
  label, 
  color 
}: { 
  mode: AppMode, 
  activeMode: AppMode, 
  setActiveMode: (mode: AppMode) => void, 
  icon: any, 
  label: string, 
  color: keyof typeof COLOR_CLASSES 
}) => {
  const isActive = activeMode === mode;
  const classes = COLOR_CLASSES[color];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setActiveMode(mode)}
      className={`relative group flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all duration-300 ${
        isActive 
          ? classes.active
          : `bg-black/40 border-white/10 text-gray-400 hover:border-white/30 hover:text-white ${classes.hover}`
      }`}
    >
      <div className={`p-4 rounded-full bg-white/5 transition-colors ${isActive ? classes.icon : ''}`}>
        <Icon size={32} className="transition-colors" />
      </div>
      <span className="font-space font-medium tracking-wide">{label}</span>
      
      {/* Visual Connector Line */}
      <div className={`absolute -bottom-8 left-1/2 w-px h-8 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
    </motion.button>
  );
};

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.NEURAL_HUB);
  const [isTempChatOpen, setIsTempChatOpen] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white flex flex-col bg-transparent">
      <NeuronBackground />

      {/* Top Navigation Bar */}
      <nav className="z-50 px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-md">
        <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveMode(AppMode.NEURAL_HUB)}
        >
          <div className="relative">
            <BrainCircuit className="text-cyan-400 group-hover:animate-pulse" size={32} />
            <div className="absolute inset-0 bg-cyan-400 blur-lg opacity-20"></div>
          </div>
          <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            NEURAL NEXUS
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
             {activeMode !== AppMode.NEURAL_HUB && (
                <button 
                    onClick={() => setActiveMode(AppMode.NEURAL_HUB)}
                    className="text-xs font-mono text-gray-400 hover:text-cyan-400 uppercase border border-white/10 px-3 py-1 rounded transition-colors"
                >
                    Hub
                </button>
             )}
             
             <button
                onClick={() => setIsTempChatOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400/80 hover:text-yellow-300 hover:bg-yellow-500/10 hover:border-yellow-500/60 transition-all ${isTempChatOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
             >
                <Zap size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Quick Assist</span>
             </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={`flex-1 relative p-6 overflow-hidden transition-all duration-300 z-10 ${isTempChatOpen ? 'mr-96' : ''}`}>
        
        <AnimatePresence mode="wait">
          {/* HUB VIEW */}
          {activeMode === AppMode.NEURAL_HUB && (
            <motion.div 
              key="hub"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full flex items-center justify-center"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
                <NavButton mode={AppMode.CHAT} activeMode={activeMode} setActiveMode={setActiveMode} icon={MessageSquare} label="Omni Chat" color="cyan" />
                <NavButton mode={AppMode.DEEP_THINK} activeMode={activeMode} setActiveMode={setActiveMode} icon={BrainCircuit} label="Deep Reason" color="purple" />
                <NavButton mode={AppMode.LIVE_VOICE} activeMode={activeMode} setActiveMode={setActiveMode} icon={Mic} label="Live Voice" color="red" />
                <div className="md:col-span-3 flex justify-center">
                   <div className="w-full md:w-1/3">
                      <NavButton mode={AppMode.IMAGE_STUDIO} activeMode={activeMode} setActiveMode={setActiveMode} icon={ImageIcon} label="Image Studio" color="pink" />
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* FEATURE VIEWS */}
          {activeMode === AppMode.CHAT && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full max-w-5xl mx-auto"
            >
              <ChatInterface mode={AppMode.CHAT} onModeChange={setActiveMode} />
            </motion.div>
          )}

          {activeMode === AppMode.DEEP_THINK && (
            <motion.div 
              key="think"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full max-w-5xl mx-auto"
            >
              <ChatInterface mode={AppMode.DEEP_THINK} onModeChange={setActiveMode} />
            </motion.div>
          )}

          {activeMode === AppMode.LIVE_VOICE && (
            <motion.div 
              key="live"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full max-w-4xl mx-auto"
            >
              <LiveMode />
            </motion.div>
          )}

          {activeMode === AppMode.IMAGE_STUDIO && (
            <motion.div 
              key="image"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full max-w-6xl mx-auto"
            >
              <ImageGenerator />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Temporary Chat Sidebar */}
      <TemporaryChat isOpen={isTempChatOpen} onClose={() => setIsTempChatOpen(false)} />

      {/* Footer Status */}
      <footer className="px-6 py-2 border-t border-white/5 bg-black/80 text-xs text-gray-500 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
            <Activity size={12} className="text-green-500" />
            <span>System Operational</span>
        </div>
        <div>
            Unified Model: Gemini 3.1 Pro / 3.0 Flash
        </div>
      </footer>
    </div>
  );
};

export default App;