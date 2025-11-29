import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Zap, Loader2, Eraser } from 'lucide-react';
import { sendChatMessage } from '../services/geminiService';
import { Message } from '../types';

interface TemporaryChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const TemporaryChat: React.FC<TemporaryChatProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  
  // Initialize from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
        const saved = localStorage.getItem('nexus_temp_chat_history');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem('nexus_temp_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Use Flash for temporary chat (fast, lightweight)
      const response = await sendChatMessage(
        userMsg.text,
        'gemini-2.5-flash',
        messages,
        undefined, // no image support in temp chat for simplicity
        false // no grounding in temp chat for speed
      );

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "No response."
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Error processing request."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
      setMessages([]);
      // localStorage will be updated by the useEffect
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-full w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-2 text-yellow-400">
            <Zap size={18} />
            <h3 className="font-bold text-sm tracking-wider uppercase">Quick Assist</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={clearChat} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Clear Chat">
                <Eraser size={16} />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                <Zap size={32} />
                <p className="text-xs text-center">Temporary Workspace.<br/>Context is cleared on reload.</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-xl p-3 text-sm ${
                msg.role === 'user' 
                  ? 'bg-yellow-600/20 text-yellow-100 border border-yellow-500/30' 
                  : 'bg-slate-800 text-gray-300 border border-white/5'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
               <Loader2 className="animate-spin text-yellow-400" size={16} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-black/40 border-t border-white/5">
          <div className="relative">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Quick question..."
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:border-yellow-500/50 focus:outline-none placeholder-gray-500"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-1 top-1 p-1 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 rounded transition-colors disabled:opacity-50"
            >
                <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemporaryChat;