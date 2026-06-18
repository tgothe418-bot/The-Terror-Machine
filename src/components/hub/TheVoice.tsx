import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Trash2, Download, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Attachment } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useVoiceStore } from '../../store/useVoiceStore';
import { getForgeState } from '../../store/useForgeStore';
import { exportConversationToMarkdown } from '../../lib/download';

export interface TheVoiceProps {
  engineState?: {
    currentNode?: string;
    isShattered?: boolean;
  };
}

export default function TheVoice({ engineState }: TheVoiceProps = {}) {
  const setPhase = useAppStore((state) => state.setPhase);
  const { messages, addMessage, clearHistory } = useVoiceStore();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [hydrated, setHydrated] = useState(() => useVoiceStore.persist.hasHydrated());
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('// BLOCK REPLICATED TO CLIPBOARD //');
    } catch (err) {
      console.error('// CLIPBOARD VECTOR CRITICAL ERROR //', err);
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

      const currentForgeDraft = getForgeState().draftBlueprint;
      
      const telemetryPayload = (currentForgeDraft && currentForgeDraft.premise) 
        ? currentForgeDraft 
        : null;

      const response = await fetch('/api/gemini/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: chatHistory,
          forgeTelemetry: telemetryPayload,
          engineState
        })
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      
      const responseText = data.text || "Error: No response";
      const voiceMsg: Message = { role: 'voice', content: responseText, timestamp: Date.now() };
      addMessage(voiceMsg);
    } catch (err: unknown) {
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

  if (!hydrated) return null;

  return (
    <div className="h-screen w-[95vw] max-w-[1800px] mx-auto flex flex-col pt-8 pb-12 text-zinc-300 font-mono overflow-hidden">

      {/* HEADER AREA */}
      <div className="mb-6 flex justify-between items-center border-b border-zinc-800 pb-4 shrink-0 px-4">
        <h2 className="text-zinc-400 text-xl tracking-widest uppercase shadow-black drop-shadow-md">
          <button 
            onClick={() => setPhase('hub')}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] uppercase tracking-widest border border-zinc-800 px-3 py-1 rounded-sm mr-4 inline-flex"
          >
            <ArrowLeft className="w-3 h-3" />
            HUB
          </button>
          [ THE VOICE // META-DEVELOPMENT ]
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            {isConfirmingClear ? (
              <div className="flex items-center gap-4 mr-4 animate-in fade-in slide-in-from-right-2 border border-red-900/50 bg-red-950/20 px-3 py-1 rounded-sm">
                <span className="text-[10px] uppercase tracking-widest text-red-500 font-bold">Purge Memory?</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      clearHistory();
                      setIsConfirmingClear(false);
                    }}
                    className="text-[10px] uppercase tracking-widest text-white hover:text-red-400 transition-colors"
                  >
                    Yes
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button 
                    onClick={() => setIsConfirmingClear(false)}
                    className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingClear(true)}
                className="p-2 text-zinc-600 hover:text-red-500 transition-colors mr-2 border border-transparent hover:border-red-900/50 rounded-sm hover:bg-red-950/20"
                title="Purge Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <button 
            onClick={() => exportConversationToMarkdown(messages, 'session-telemetry')}
            className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors duration-150 border border-zinc-800 hover:border-zinc-700 rounded mr-4"
            title="Download session log (.md)"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="text-xs text-zinc-600 animate-pulse bg-zinc-900/50 px-3 py-1 rounded border border-zinc-800">
            {isLoading ? "RECEIVING TRANSMISSION..." : "SYSTEM IDLE"}
          </div>
        </div>
      </div>

      {/* CHAT CONTAINER (Scrollbar pushed to the right edge) */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 space-y-8"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-zinc-600 mb-1 uppercase tracking-wider">
                {msg.role === 'user' ? 'CONDUCTOR' : 'THE VOICE'}
              </span>
              <div 
                className={`max-w-[75%] p-4 rounded whitespace-pre-wrap leading-relaxed shadow-lg
                  ${msg.role === 'user' 
                    ? 'bg-zinc-900 border border-zinc-700 text-zinc-300' 
                    : 'bg-transparent border-l-2 border-zinc-700 text-zinc-400 pl-4 py-2'
                  }`}
              >
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
                            <span className="max-w-[150px] truncate">{att.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={`markdown-voice relative group ${msg.role === 'user' ? 'text-zinc-300' : 'text-zinc-100'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                  <button 
                    onClick={() => handleCopyToClipboard(msg.content)}
                    className={`absolute -right-12 top-0 p-1.5 transition-all duration-200 rounded opacity-0 group-hover:opacity-100
                      ${msg.role === 'user' 
                        ? 'text-zinc-500 hover:text-white bg-black/50 border border-zinc-800' 
                        : 'text-zinc-600 hover:text-white bg-black/50 border border-zinc-800'}`}
                    title="Copy message contents"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
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
              The Voice is listening...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* EXPANDED USER INPUT AREA (The Green Box) */}
      <div className="px-4 shrink-0 mt-4 relative">
        
        {/* Ambient background shadow wrapper to ground the input box */}
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none -mt-10" />

        <div className="relative bg-[#050505] border border-zinc-800 focus-within:border-zinc-600 rounded p-4 flex items-end gap-4 transition-colors shadow-[0_0_25px_rgba(0,0,0,0.8)]">

          {/* FILE ATTACH BUTTON */}
          <div className="flex flex-col items-center justify-center mb-1 shrink-0">
            <input 
              type="file" 
              id="voice-file-upload"
              accept=".txt,.md,.pdf,image/*,.json" 
              multiple
              onChange={handleFileChange} 
              className="hidden"
            />
            <label 
              htmlFor="voice-file-upload" 
              className="cursor-pointer text-zinc-500 hover:text-zinc-300 flex items-center justify-center h-10 w-10 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors shadow-inner"
              title="Attach Memory File"
            >
              [+]
            </label>
          </div>

          {/* MASSIVE TEXTAREA */}
          <div className="flex-1 flex flex-col">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((att, i) => (
                  <span key={i} className="text-blue-400/80 font-mono text-xs truncate max-w-[300px] px-2 py-1 bg-blue-900/10 border border-blue-900/30 rounded inline-flex items-center gap-2 group">
                    <span>🔗 {att.name}</span>
                    <button type="button" onClick={(e) => { e.preventDefault(); removeAttachment(i); }} className="text-blue-500 hover:text-white" title="Remove">✕</button>
                  </span>
                ))}
              </div>
            )}
            <textarea 
              autoFocus
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Submit on Enter, allow line breaks with Shift+Enter
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onPaste={handlePaste}
              placeholder="Transmit to The Voice... (Shift+Enter for new line)"
              className="w-full bg-transparent text-sm text-zinc-300 resize-none focus:outline-none custom-scrollbar min-h-[80px] max-h-[30vh] p-2"
            />
          </div>

          {/* SEND BUTTON */}
          <button 
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="mb-1 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded transition-colors text-xs font-bold tracking-widest shadow-md"
          >
            [ TRANSMIT ]
          </button>
        </div>
      </div>
    </div>
  );
}
