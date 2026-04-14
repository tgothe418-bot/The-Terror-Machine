import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Download, Send, Terminal, Loader2, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Message, ScenarioBlueprint, Attachment } from '../../types';
import { downloadJson } from '../../lib/download';
import { extractBlueprint } from '../../lib/jsonParser';
import { sendMessageToArchitect } from '../../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

export default function Forge() {
  const setPhase = useAppStore((state) => state.setPhase);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Forge Initialized. Architect online. Describe the foundation of your nightmare.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<ScenarioBlueprint | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newAttachments.push({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: base64.split(',')[1], // Remove prefix
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToArchitect(newMessages);
      
      const detectedBlueprint = extractBlueprint(responseText);
      let finalContent = responseText;

      if (detectedBlueprint && (detectedBlueprint.title || detectedBlueprint.setting)) {
        setBlueprint(detectedBlueprint as ScenarioBlueprint);
        finalContent = "[ SYSTEM: BLUEPRINT COMPILED AND READY FOR EXTRACTION ]";
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: finalContent,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: "Error: Connection to Architect severed. Verify API configuration.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (blueprint) {
      downloadJson(blueprint, `scenario_${blueprint.title.toLowerCase().replace(/\s+/g, '_')}.json`);
    }
  };

  return (
    <div className="h-screen bg-black text-zinc-100 flex flex-col font-mono selection:bg-white selection:text-black">
      {/* Header */}
      <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-black z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setPhase('hub')}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] tracking-[0.2em]"
          >
            <ArrowLeft className="w-3 h-3" />
            Hub
          </button>
          <div className="h-4 w-[1px] bg-zinc-800" />
          <div className="flex items-center gap-2">
            <Terminal className="w-3 h-3 text-zinc-500" />
            <h1 className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400">The Forge // Architect</h1>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={!blueprint}
          className={`flex items-center gap-2 px-4 py-2 border transition-all duration-300 text-[10px] tracking-[0.2em] uppercase ${
            blueprint 
              ? 'border-white bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
              : 'border-zinc-800 text-zinc-700 cursor-not-allowed opacity-50'
          }`}
        >
          <Download className={`w-3 h-3 ${blueprint ? 'animate-bounce' : ''}`} />
          {blueprint ? 'Export Blueprint' : 'Blueprint Locked'}
        </button>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className="text-[8px] uppercase tracking-widest text-zinc-600">
                  {msg.role === 'assistant' ? 'Architect' : 'User'} // {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className={`p-4 border ${msg.role === 'user' ? 'border-zinc-700 bg-zinc-900/30' : 'border-zinc-800 bg-black'} text-sm leading-relaxed whitespace-pre-wrap`}>
                  {msg.content}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-end">
                      {msg.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1 border border-zinc-800 bg-black/50 text-[10px] uppercase tracking-widest text-zinc-400">
                          {att.mimeType.startsWith('image/') ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          <span className="max-w-[100px] truncate">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="max-w-[80%] space-y-2">
                <div className="text-[8px] uppercase tracking-widest text-zinc-600">
                  Architect // PROCESSING
                </div>
                <div className="p-4 border border-zinc-800 bg-black text-sm flex items-center gap-3">
                  <span className="animate-pulse">[ PROCESSING ]</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-white animate-[bounce_1s_infinite_0ms]" />
                    <div className="w-1 h-1 bg-white animate-[bounce_1s_infinite_200ms]" />
                    <div className="w-1 h-1 bg-white animate-[bounce_1s_infinite_400ms]" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-zinc-900 bg-black">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Attachments Preview */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-wrap gap-2"
              >
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 bg-zinc-900 text-[10px] uppercase tracking-widest">
                    {att.mimeType.startsWith('image/') ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    <span className="max-w-[150px] truncate">{att.name}</span>
                    <button 
                      onClick={() => removeAttachment(i)}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSend} className="relative flex flex-col gap-2">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isLoading}
                placeholder={isLoading ? "Awaiting Architect..." : "Input parameters or paste reference material..."}
                className="w-full bg-zinc-950 border border-zinc-800 p-4 pr-24 text-sm focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700 disabled:opacity-50 min-h-[100px] resize-none scrollbar-hide"
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                  title="Attach Files (JSON, PDF, Images)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && attachments.length === 0)}
                  className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept=".json,.pdf,image/*"
                className="hidden"
              />
            </div>
          </form>
        </div>
        <div className="mt-4 text-center">
          <p className="text-[8px] text-zinc-800 uppercase tracking-[0.4em]">
            {isLoading ? "Neural Link Active // Processing" : "Structural Integrity Verified // Awaiting Input"}
          </p>
        </div>
      </div>
    </div>
  );
}

