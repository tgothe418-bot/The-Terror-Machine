/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Download, Send, Terminal, Loader2, Paperclip, X, FileText, Image as ImageIcon, Users } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useForgeStore, defaultStyleVector } from '../../store/useForgeStore';
import { useVoiceStore } from '../../store/useVoiceStore';
import { Message, ScenarioBlueprint, Attachment } from '../../types';
import { downloadJson } from '../../lib/download';
import { extractBlueprint, extractCastData, extractAddedCharacter } from '../../lib/jsonParser';
import { sendMessageToArchitect, extractStyleProfile, summarizeForgeInterview } from '../../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import CastManager from './CastManager';

export default function Forge() {
  const setPhase = useAppStore((state) => state.setPhase);
  const { 
    messages, 
    addMessage, 
    clearHistory, 
    setAvailableReferenceCharacters, 
    addCharacterToCast, 
    selectedCharacters,
    setHasReferenceMaterial,
    forgePhase,
    setForgePhase,
    setSummaryContext,
    who, what, where, when, whyHow,
    setWho, setWhat, setWhere, setWhen, setWhyHow,
    clearForgeInputs
  } = useForgeStore();
  const voiceMessages = useVoiceStore((state) => state.messages);
  const [isLoading, setIsLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<ScenarioBlueprint | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [hydrated, setHydrated] = useState(() => useForgeStore.persist.hasHydrated());
  const [activeTab, setActiveTab] = useState<'chat' | 'cast'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle hydration
  useEffect(() => {
    const unsub = useForgeStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useForgeStore.persist.onFinishHydration(() => setHydrated(true));
    
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

  // Force the UI back to the Chat tab when the interview begins
  useEffect(() => {
    if (forgePhase === 'INTERVIEW_PHASE_1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('chat');
    }
  }, [forgePhase]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    const allowedTypes = ['image/', 'application/pdf', 'application/json', 'text/markdown', 'text/plain'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAllowed = allowedTypes.some(type => file.type.startsWith(type)) || 
                        file.name.endsWith('.md') || 
                        file.name.endsWith('.json');
      
      if (!isAllowed) continue;

      const base64 = await fileToBase64(file);
      newAttachments.push({
        name: file.name,
        mimeType: file.type || (file.name.endsWith('.md') ? 'text/markdown' : 'application/octet-stream'),
        data: base64.split(',')[1], // Remove prefix
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
    setHasReferenceMaterial(true);
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
    const hasText = who.trim() || what.trim() || where.trim() || when.trim() || whyHow.trim();
    if ((!hasText && attachments.length === 0) || isLoading) return;

    let combinedInput = '';
    if (hasText) {
      combinedInput = `[SYSTEM SUBJECT (WHO)]\n${who}\n\n[CORE CONSTRAINT (WHAT)]\n${what}\n\n[ENCLOSURE ENVIRONMENT (WHERE)]\n${where}\n\n[TEMPORAL ANCHOR (WHEN)]\n${when}\n\n[SYSTEMIC VECTOR DIRECTIVE (WHY/HOW)]\n${whyHow}`;
    }

    const userMessage: Message = {
      role: 'user',
      content: combinedInput,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    addMessage(userMessage);
    clearForgeInputs();
    setAttachments([]);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToArchitect([...messages, userMessage], forgePhase, voiceMessages);
      
      let finalContent = responseText;

      // Phase 1 Transition Handshake
      if (responseText.includes('[PHASE_1_COMPLETE]')) {
        const cleanResponse = responseText.replace('[PHASE_1_COMPLETE]', '').trim();

        // Only add to log if there is conversational text attached
        if (cleanResponse) {
          addMessage({ role: 'assistant', content: cleanResponse, timestamp: Date.now() });
        }

        // Advance the state machine to Phase 2
        setForgePhase('INTERVIEW_PHASE_2');
        setIsLoading(false);
        return; // Exit the loop
      }

      if (responseText.includes('[READY_FOR_CONFIRMATION]')) {
        finalContent = responseText.replace('[READY_FOR_CONFIRMATION]', '').trim();
        setForgePhase('CONFIRMATION');
      }

      const detectedBlueprint = extractBlueprint(responseText, ['title', 'setting']) as ScenarioBlueprint;
      const detectedCast = extractCastData(responseText);
      const addedChar = extractAddedCharacter(responseText);

      if (detectedCast) {
        setAvailableReferenceCharacters(detectedCast);
        setActiveTab('cast');
      }

      if (addedChar) {
        addCharacterToCast(addedChar);
      }

      if (detectedBlueprint && (detectedBlueprint.title || detectedBlueprint.setting)) {
        // Ensure cast is attached to blueprint before finalizing
        detectedBlueprint.cast = selectedCharacters;
        if (!detectedBlueprint.styleProfile) {
          const userText = [...messages, userMessage]
            .filter(m => m.role === 'user')
            .map(m => {
              let text = m.content || '';
              if (m.attachments) {
                const textAttachments = m.attachments
                  .filter(a => a.mimeType === 'text/markdown' || a.mimeType === 'text/plain')
                  // Decode base64 to include actual text reference
                  .map(a => {
                    try {
                      // Verify data presence and attempt decoding safely
                      return a.data ? atob(a.data) : '';
                    } catch (e) {
                      console.warn("// STYLE EXTRACTION LAYER EXCEPTION // Malformed frame ignored:", e);
                      return '';
                    }
                  })
                  .join('\n');
                text += '\n' + textAttachments;
              }
              return text;
            })
            .join('\n');
          
          if (userText.length > 100) {
            const style = await extractStyleProfile(userText);
            detectedBlueprint.styleProfile = style;
          } else {
            detectedBlueprint.styleProfile = defaultStyleVector;
          }
        }
        
        setBlueprint(detectedBlueprint);
        finalContent = "[ SYSTEM: BLUEPRINT COMPILED AND READY FOR EXTRACTION ]";
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: finalContent,
        timestamp: Date.now(),
      };
      addMessage(assistantMessage);
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

      const msg: Message = {
        role: 'assistant',
        content: `[SYSTEM ERROR] ${parsedMessage}`,
        timestamp: Date.now(),
      };
      addMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (blueprint) {
      downloadJson(blueprint, `scenario_${blueprint.title.toLowerCase().replace(/\s+/g, '_')}.json`);
    }
  };

  if (!hydrated) return null;

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
          <div className="h-4 w-[1px] bg-zinc-800 mx-2" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1 text-[8px] uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-white text-black font-bold' : 'text-zinc-500 hover:text-white'}`}
            >
              Intelligence
            </button>
            <button
              onClick={() => setActiveTab('cast')}
              className={`px-3 py-1 text-[8px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'cast' ? 'bg-white text-black font-bold' : 'text-zinc-500 hover:text-white'}`}
            >
              <Users className="w-2.5 h-2.5" />
              Cast ({selectedCharacters.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center">
            {isConfirmingClear ? (
              <div className="flex items-center gap-2 mr-4 animate-in fade-in slide-in-from-right-2">
                <span className="text-[8px] uppercase tracking-widest text-fresh-blood">Reset Forge?</span>
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
                className="p-2 text-zinc-600 hover:text-fresh-blood transition-colors mr-2"
                title="Clear Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
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
        </div>
      </header>

      {/* Chat / Cast Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div 
          ref={scrollRef}
          className={`flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide ${activeTab !== 'chat' ? 'hidden' : ''}`}
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

        {activeTab === 'cast' && (
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <CastManager />
          </div>
        )}
      </div>

          {/* Input Area */}
      <div className="p-6 border-t border-zinc-900 bg-black">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {forgePhase === 'CONFIRMATION' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const ctx = await summarizeForgeInterview(messages);
                    setSummaryContext(ctx);
                    setForgePhase('GENERATION');
                    
                    // Fire generation request using summary Context
                    const generationMessage: Message = {
                      role: 'user',
                      content: `[ SYSTEM: GENERATE BLUEPRINT ]\nSummary Context:\n${ctx}\n\nSelected Characters:\n${JSON.stringify(selectedCharacters, null, 2)}`,
                      timestamp: Date.now()
                    };
                    addMessage(generationMessage);
                    const genRes = await sendMessageToArchitect([generationMessage], 'GENERATION', voiceMessages);
                    const detectedBlueprint = extractBlueprint(genRes, ['title', 'setting']) as ScenarioBlueprint;
                    if (detectedBlueprint && (detectedBlueprint.title || detectedBlueprint.setting)) {
                      detectedBlueprint.cast = selectedCharacters;
                      detectedBlueprint.styleProfile = detectedBlueprint.styleProfile || defaultStyleVector;
                      setBlueprint(detectedBlueprint);
                      addMessage({
                        role: 'assistant',
                        content: "[ SYSTEM: BLUEPRINT COMPILED AND READY FOR EXTRACTION ]",
                        timestamp: Date.now()
                      });
                    } else {
                      addMessage({
                        role: 'assistant',
                        content: "Error: Failed to generate blueprint.\n" + genRes,
                        timestamp: Date.now()
                      });
                    }
                  } catch {
                    addMessage({
                      role: 'assistant',
                      content: "Error during generation loop.",
                      timestamp: Date.now()
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full py-4 bg-fresh-blood text-white text-xs uppercase tracking-[0.3em] font-bold hover:bg-red-700 transition-colors shadow-[0_0_20px_rgba(255,0,0,0.2)] disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '[ INITIALIZE BLUEPRINT SUMMARY ]'}
              </button>
            </motion.div>
          ) : (
            <>
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

              <form onSubmit={handleSend} className="relative flex flex-col gap-4">
                {/* Architect Diagnostic Banner */}
                <div className="border border-zinc-800 bg-zinc-950/50 p-4 rounded text-xs mb-2 w-full">
                  <div className="text-red-500 font-bold mb-2 uppercase tracking-widest">// ARCHITECT DIRECTIVE: INTAKE INITIALIZATION</div>
                  <p className="text-zinc-400 leading-relaxed mb-3">
                    Welcome to the Forge. This console compiles arbitrary conceptual parameters into a flat, 
                    functional JSON state matrix. To instantiate an isolated multi-interactor simulation, 
                    you must explicitly decouple your scenario into five discrete vector layers.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600 text-[11px] border-t border-zinc-900 pt-2">
                    <div>• SYSTEM CAPACITY: STRICT COMPLIANCE PARSING</div>
                    <div>• LORE INJECTION: CANONICAL ENFORCEMENT ACTIVE</div>
                    <div>• EXPECTED OUTPUT: ROOT-LEVEL STATE BLUEPRINT</div>
                    <div>• TARGET RUNTIME: THE NIGHTMARE MACHINE 2.0</div>
                  </div>
                </div>

                {/* 4-Column Upper Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'who', label: 'SYSTEM SUBJECT (WHO)', placeholder: 'Define the isolated entities, forms, or specimens...', value: who, onChange: setWho },
                    { id: 'what', label: 'CORE CONSTRAINT (WHAT)', placeholder: 'Set the overarching dilemma, system rule, or conflict...', value: what, onChange: setWhat },
                    { id: 'where', label: 'ENCLOSURE ENVIRONMENT (WHERE)', placeholder: 'Map out the explicit physical structures...', value: where, onChange: setWhere },
                    { id: 'when', label: 'TEMPORAL ANCHOR (WHEN)', placeholder: 'Historical era, cosmic coordinate, or baseline...', value: when, onChange: setWhen },
                  ].map((field) => (
                    <div key={field.id} className="flex flex-col gap-2 border border-zinc-800 bg-zinc-950 p-3 rounded shadow-inner">
                      <label className="text-[10px] font-bold tracking-wider text-zinc-500">{field.label}</label>
                      <textarea
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLoading}
                        className="w-full h-32 bg-transparent text-sm text-zinc-200 placeholder-zinc-700 resize-none outline-none focus:text-white transition-colors scrollbar-hide"
                      />
                    </div>
                  ))}
                </div>

                {/* Broad Structural Baseline Input (Why/How) */}
                <div className="flex flex-col gap-2 border border-zinc-800 bg-zinc-950 p-4 rounded shadow-inner w-full relative">
                  <label className="text-[10px] font-bold tracking-wider text-zinc-500">SYSTEMIC VECTOR DIRECTIVE (WHY / HOW)</label>
                  <textarea
                    value={whyHow}
                    onChange={(e) => setWhyHow(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Calibrate the initial psychological or logic vectors. Describe the experimental purpose..."
                    disabled={isLoading}
                    className="w-full h-24 bg-transparent text-sm text-zinc-200 placeholder-zinc-700 resize-none outline-none focus:text-white transition-colors pr-24 scrollbar-hide"
                  />
                  <div className="absolute right-4 bottom-4 flex items-center gap-4 bg-zinc-950 px-2 py-1 rounded">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="text-zinc-700 hover:text-white transition-all duration-300 disabled:opacity-50 hover:scale-110 active:scale-95"
                      title="Attach Files (JSON, PDF, Images, MD)"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || (!(who.trim() || what.trim() || where.trim() || when.trim() || whyHow.trim()) && attachments.length === 0)}
                      className="text-zinc-700 hover:text-white transition-all duration-300 disabled:opacity-50 hover:scale-110 active:scale-95"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept=".json,.pdf,image/*,.md,text/markdown"
                  className="hidden"
                />
              </form>
            </>
          )}
        </div>
        <div className="mt-4 text-center">
          <p className="text-[8px] text-zinc-800 uppercase tracking-[0.4em]">
            {isLoading ? "Neural Link Active // Processing" : "Awaiting Full Matrix Compilation // Structural Integrity Verified"}
          </p>
        </div>
      </div>
    </div>
  );
}

