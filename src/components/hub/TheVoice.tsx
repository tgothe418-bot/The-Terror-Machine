import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Send, Loader2, MessageCircle, Trash2, Paperclip, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Attachment } from '../../types';
import { sendMessageToVoice } from '../../services/geminiService';
import { useAppStore } from '../../store/useAppStore';
import { useVoiceStore } from '../../store/useVoiceStore';
import { useForgeStore } from '../../store/useForgeStore';
import { useEngineStore } from '../../core/store';

export default function TheVoice() {
  const setPhase = useAppStore((state) => state.setPhase);
  const { messages, addMessage, clearHistory } = useVoiceStore();
  const forgeMessages = useForgeStore((state) => state.messages);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [hydrated, setHydrated] = useState(() => useVoiceStore.persist.hasHydrated());
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMsg: Message = { 
      role: 'user', 
      content: input, 
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };
    
    const currentHistory = [...messages, userMsg];
    
    addMessage(userMsg);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const chatHistory = currentHistory.map(msg => ({
        role: msg.role === 'voice' ? 'assistant' : msg.role,
        content: msg.content,
        attachments: msg.attachments
      }));
      const response = await sendMessageToVoice(chatHistory as any, forgeMessages);
      const voiceMsg: Message = { role: 'voice', content: response, timestamp: Date.now() };
      addMessage(voiceMsg);

      // Output to Engine if simulation is active
      const engineStore = useEngineStore.getState();
      if (engineStore.activeBlueprint) {
        engineStore.addMessage({
          role: 'voice',
          content: response,
          timestamp: Date.now(),
          blocks: [{
            type: 'system_voice',
            content: response
          }]
        });
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = typeof err === 'object' && err !== null && 'message' in err ? err.message : String(err);
      let parsedMessage = errorMessage;
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          parsedMessage = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
        }
      } catch { /* ignore */ }
      
      addMessage({ role: 'voice', content: `[SYSTEM ERROR] ${parsedMessage}`, timestamp: Date.now() });
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
    const allowedTypes = ['image/', 'application/pdf', 'application/json', 'text/markdown', 'text/plain'];
    
    for (const file of files) {
      const isAllowed = allowedTypes.some(type => file.type.startsWith(type)) || 
                        file.name.endsWith('.md') || 
                        file.name.endsWith('.json');
      
      if (!isAllowed) continue;
      
      const base64 = await fileToBase64(file);
      newAttachments.push({
        name: file.name,
        mimeType: file.type || (file.name.endsWith('.md') ? 'text/markdown' : 'application/octet-stream'),
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

  if (!hydrated) return null;

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
        className="flex-1 overflow-y-auto p-8 2xl:p-16 space-y-12 2xl:space-y-20 scrollbar-hide max-w-4xl 2xl:max-w-6xl mx-auto w-full voice-chat-container"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[80%] p-6 text-base leading-relaxed whitespace-pre-wrap transition-all duration-500 backdrop-blur-sm ${
                msg.role === 'user' 
                  ? 'bg-zinc-900/40 text-zinc-300 border border-zinc-800/50 hover:bg-zinc-900/60' 
                  : 'text-zinc-100 font-light italic bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]'
              }`}>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {msg.attachments.map((att, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        {att.mimeType.startsWith('image/') ? (
                          <img 
                            src={`data:${att.mimeType};base64,${att.data}`}
                            alt={att.name}
                            className="max-h-48 rounded border border-zinc-700"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 border border-zinc-800 bg-black/50 text-[10px] uppercase tracking-widest text-zinc-400">
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[150px] truncate">{att.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className={`markdown-voice ${msg.role === 'user' ? 'text-zinc-300' : 'text-zinc-100'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
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
      <div className="p-8 border-t border-zinc-900 bg-black voice-input-pane">
        <div className="max-w-4xl mx-auto space-y-4 voice-input-wrapper">
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
                    {att.mimeType.startsWith('image/') ? (
                      <img 
                        src={`data:${att.mimeType};base64,${att.data}`}
                        alt="preview"
                        className="w-20 h-20 object-cover rounded border border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-20 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded p-2 text-center">
                        <Paperclip className="w-6 h-6 text-zinc-600 mb-1" />
                        <span className="text-[8px] text-zinc-500 truncate w-full">{att.name}</span>
                      </div>
                    )}
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
              className="w-full bg-zinc-950 border border-zinc-900 p-6 pr-32 text-sm focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/20 placeholder:text-zinc-800 disabled:opacity-50 transition-all resize-none min-h-[80px] scrollbar-hide"
            />
            
            <div className="absolute right-6 bottom-6 flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-zinc-700 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95"
                title="Upload Files (Images, PDF, JSON, MD)"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className="text-zinc-700 hover:text-white transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf,.json,.md,text/markdown"
              multiple
              className="hidden"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
