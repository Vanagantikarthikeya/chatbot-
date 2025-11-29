import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { Wand2, Image as ImageIcon, Download, Loader2 } from 'lucide-react';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [quality, setQuality] = useState<'1K' | '2K' | '4K'>('1K');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setResultImage(null);

    try {
      const response = await generateImage(prompt, quality);
      
      // Extract image from response
      // Usually comes in candidates[0].content.parts
      // Logic adapted for potential API variations as per "Generate Images" guidance
      let foundImage = null;
      
      // Check standard generateContent response structure for inlineData
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
          for (const part of parts) {
              if (part.inlineData) {
                  foundImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  break;
              }
          }
      }

      if (foundImage) {
        setResultImage(foundImage);
      } else {
          // Fallback if no image found in standard path (or pure text returned indicating error)
          alert("No image generated. The model might have refused the prompt.");
      }

    } catch (e) {
      console.error(e);
      alert("Generation failed. See console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full p-6 flex flex-col md:flex-row gap-6">
      {/* Controls */}
      <div className="w-full md:w-1/3 bg-slate-900/60 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col gap-6">
        <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1"><Wand2 className="text-pink-500" /> Image Studio</h2>
            <p className="text-xs text-gray-400">Powered by Gemini 3 Pro Image Preview</p>
        </div>

        <div className="space-y-2">
            <label className="text-sm text-gray-300 font-medium">Prompt</label>
            <textarea 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-pink-500/50 outline-none h-32 resize-none"
                placeholder="A futuristic city made of glass and neurons..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
            />
        </div>

        <div className="space-y-2">
            <label className="text-sm text-gray-300 font-medium">Quality / Size</label>
            <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as const).map(q => (
                    <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                            quality === q 
                            ? 'bg-pink-500/20 border-pink-500 text-pink-300' 
                            : 'bg-black/20 border-white/10 text-gray-500 hover:text-white'
                        }`}
                    >
                        {q}
                    </button>
                ))}
            </div>
        </div>

        <button 
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="mt-auto w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-bold text-white shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
        >
            {loading ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
            GENERATE
        </button>
      </div>

      {/* Viewport */}
      <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden group">
        {resultImage ? (
            <>
                <img src={resultImage} alt="Generated" className="max-w-full max-h-full object-contain shadow-2xl" />
                <a 
                    href={resultImage} 
                    download={`nexus-gen-${Date.now()}.png`}
                    className="absolute bottom-6 right-6 bg-white text-black p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                >
                    <Download size={20} />
                </a>
            </>
        ) : (
            <div className="text-center text-gray-600 space-y-4">
                <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center">
                    {loading ? <Loader2 className="animate-spin text-pink-500" size={32}/> : <ImageIcon size={32} />}
                </div>
                <p>{loading ? "Dreaming up your image..." : "Enter a prompt to start dreaming"}</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;