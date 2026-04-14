import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, MessageCircle, Trash2, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Attachment } from '../../types';
import { sendMessageToVoice } from '../../services/geminiService';
import { useAppStore } from '../../store/useAppStore';
import { useVoiceStore } from '../../store/useVoiceStore';

export default function TheVoice() {
  const setPhase = useAppStore((state) => state.setPhase);
  const { messages, addMessage, clearHistory } = useVoiceStore();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Handle hydration
  useEffect(() => {
    const unsub = useVoiceStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useVoiceStore.persist.onFinishHydration(() => setHydrated(true));
    
    // Check if already hydrated
    if (useVoiceStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsub();
      unsubFinish();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Initial greeting
  useEffect(() => {
    if (hydrated && messages.length === 0) {
      handleGreeting();
    }
  }, [hydrated, messages.length]);

  const handleGreeting = async () => {
    setIsLoading(true);
    try {
      const response = await sendMessageToVoice([
        { role: 'user', content: 'Hello.', timestamp: Date.now() }
      ]);
      addMessage({ role: 'voice', content: response, timestamp: Date.now() });
    } catch (error) {
      addMessage({ role: 'voice', content: "I'm here, but my connection seems a bit fuzzy. Shall we try again?", timestamp: Date.now() });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMsg: Message = { 
      role: 'user', 
      content: input, 
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };
    
    addMessage(userMsg);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await sendMessageToVoice([...messages, userMsg]);
      addMessage({ role: 'voice', content: response, timestamp: Date.now() });
    } catch (error) {
      addMessage({ role: 'voice', content: "I'm sorry, I lost my train of thought for a moment. What were we saying?", timestamp: Date.now() });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(Array.from(files));
  };

  const processFiles = async (files: File[]) => {
    const newAttachments: Attachment[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const base64 = await fileToBase64(file);
      newAttachments.push({
        name: file.name,
        mimeType: file.type,
        data: base64
      });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) files.push(blob);
      }
    }
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-black z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setPhase('hub')}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] tracking-[0.2em]"
          >
            <ArrowLeft className="w-3 h-3" />
            Return to Hub
          </button>
          <div className="h-4 w-[1px] bg-zinc-800" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white">The Voice</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-600">
          <div className="flex items-center">
            {isConfirmingClear ? (
              <div className="flex items-center gap-2 mr-4 animate-in fade-in slide-in-from-right-2">
                <span className="text-[8px] uppercase tracking-widest text-fresh-blood">Clear all memory?</span>
                <button 
                  onClick={() => {
                    clearHistory();
                    setIsConfirmingClear(false);
                  }}
                  className="text-[8px] uppercase tracking-widest text-white hover:underline"
                >
                  Yes
                </button>
                <button 
                  onClick={() => setIsConfirmingClear(false)}
                  className="text-[8px] uppercase tracking-widest text-zinc-500 hover:underline"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="p-2 hover:text-fresh-blood transition-colors mr-4"
                title="Clear Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <MessageCircle className="w-3 h-3" />
          <span className="text-[8px] uppercase tracking-[0.3em]">Conversational Link Active</span>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide max-w-4xl mx-auto w-full"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[80%] p-6 text-base leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 text-zinc-300 border border-zinc-800' 
                  : 'text-zinc-100 font-light italic'
              }`}>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {msg.attachments.map((att, i) => (
                      <img 
                        key={i}
                        src={`data:${att.mimeType};base64,${att.data}`}
                        alt={att.name}
                        className="max-h-48 rounded border border-zinc-700"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                )}
                {msg.content}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-zinc-600 text-[10px] uppercase tracking-widest p-4"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              The Voice is listening...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-8 border-t border-zinc-900 bg-black">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Attachment Previews */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-wrap gap-3 p-4 bg-zinc-950 border border-zinc-900 rounded-lg"
              >
                {attachments.map((att, i) => (
                  <div key={i} className="relative group">
                    <img 
                      src={`data:${att.mimeType};base64,${att.data}`}
                      alt="preview"
                      className="w-20 h-20 object-cover rounded border border-zinc-800"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-2 -right-2 bg-fresh-blood text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSend} className="relative">
            <textarea
              ref={textareaRef}
              autoFocus
              disabled={isLoading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Speak your mind... (Shift+Enter for new line)"
              className="w-full bg-zinc-950 border border-zinc-900 p-6 pr-32 text-sm focus:outline-none focus:border-zinc-700 placeholder:text-zinc-800 disabled:opacity-50 transition-all resize-none min-h-[80px] scrollbar-hide"
            />
            
            <div className="absolute right-6 bottom-6 flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-zinc-700 hover:text-white transition-colors"
                title="Upload Image"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className="text-zinc-700 hover:text-white transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
