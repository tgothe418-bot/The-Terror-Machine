/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Download, Terminal, Loader2, X, FileText, Image as ImageIcon, Users } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useForgeStore, defaultStyleVector } from '../../store/useForgeStore';
import { useVoiceStore } from '../../store/useVoiceStore';
import { Message, ScenarioBlueprint, Attachment } from '../../types';
import { extractBlueprint } from '../../lib/jsonParser';
import { summarizeForgeInterview } from '../../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import CastManager from './CastManager';
import { ArchitectChat } from './ArchitectChat';
import { BlueprintTester } from './BlueprintTester';
import { FileDropzone } from './FileDropzone';

import { MatrixSelector } from './MatrixSelector';

export default function Forge() {
  const setPhase = useAppStore((state) => state.setPhase);
  const { 
    messages, 
    addMessage, 
    clearHistory, 
    selectedCharacters,
    setHasReferenceMaterial,
    forgePhase,
    setForgePhase,
    setSummaryContext,
    draftBlueprint,
    updateDraft
  } = useForgeStore();
  const voiceMessages = useVoiceStore((state) => state.messages);
  const [isLoading, setIsLoading] = useState(false);
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

  const exportBlueprint = () => {
    const store = useForgeStore.getState();
    const draft = store.draftBlueprint;
    
    if (!draft || !draft.premise) {
      alert("Cannot export an empty blueprint. Please compile a scenario first.");
      return;
    }

    // Sanitize and format the payload
    const exportPayload = {
      id: draft.id || crypto.randomUUID(),
      title: draft.title || "Untitled Nightmare",
      premise: draft.premise,
      startingVector: draft.startingVector,
      startingTier: draft.startingTier,
      environmentalRules: draft.environmentalRules,
      cast: draft.cast || []
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `blueprint-${draft.startingVector}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
            onClick={exportBlueprint}
            disabled={!draftBlueprint?.premise}
            className={`flex items-center gap-2 px-4 py-2 border transition-all duration-300 text-[10px] tracking-[0.2em] uppercase ${
              draftBlueprint?.premise
                ? 'border-white bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                : 'border-zinc-800 text-zinc-700 cursor-not-allowed opacity-50'
            }`}
          >
            <Download className={`w-3 h-3 ${draftBlueprint?.premise ? 'animate-bounce' : ''}`} />
            {draftBlueprint?.premise ? 'Export Blueprint' : 'Blueprint Locked'}
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

                      if (draftBlueprint) {
                        detectedBlueprint.startingVector = draftBlueprint.startingVector;
                        detectedBlueprint.startingTier = draftBlueprint.startingTier;
                        detectedBlueprint.environmentalRules = draftBlueprint.environmentalRules;
                      }

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

              <div className="relative flex flex-col gap-4">
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

                <div className="my-4">
                  <FileDropzone />
                </div>

                {/* Matrix Selector UI */}
                <MatrixSelector />

                {/* Architect Conversation */}
                <div className="mb-4">
                  <ArchitectChat />
                </div>
                
                {/* Dry Run Tester */}
                <div className="mb-4">
                  <BlueprintTester />
                </div>

                {/* 4-Column Upper Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col">
                    <label className="text-zinc-500 font-mono text-xs uppercase mb-2">SYSTEM SUBJECT (WHO)</label>
                    <textarea 
                      value={draftBlueprint?.cast?.[0]?.description || ''}
                      onChange={(e) => {
                        const newCast = [...(draftBlueprint?.cast || [])];
                        if (newCast.length === 0) {
                          newCast.push({ id: 'char-1', name: 'Subject 1', description: e.target.value, behaviorVector: 'ADAPTIVE' });
                        } else {
                          newCast[0].description = e.target.value;
                        }
                        updateDraft({ cast: newCast });
                      }}
                      className="flex-1 bg-transparent text-zinc-300 font-mono text-sm resize-none focus:outline-none min-h-[8rem] scrollbar-hide"
                      placeholder="Define the isolated entities..."
                    />
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col">
                    <label className="text-zinc-500 font-mono text-xs uppercase mb-2">CORE CONSTRAINT (WHAT)</label>
                    <textarea 
                      value={draftBlueprint?.environmentalRules || ''}
                      onChange={(e) => updateDraft({ environmentalRules: e.target.value })}
                      className="flex-1 bg-transparent text-zinc-300 font-mono text-sm resize-none focus:outline-none min-h-[8rem] scrollbar-hide"
                      placeholder="Set the overarching dilemma..."
                    />
                  </div>
                  
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col">
                    <label className="text-zinc-500 font-mono text-xs uppercase mb-2">ENCLOSURE ENVIRONMENT (WHERE)</label>
                    <textarea 
                      value={draftBlueprint?.title || ''}
                      onChange={(e) => updateDraft({ title: e.target.value })}
                      className="flex-1 bg-transparent text-zinc-300 font-mono text-sm resize-none focus:outline-none min-h-[8rem] scrollbar-hide"
                      placeholder="Map out the explicit physical structures..."
                    />
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col">
                    <label className="text-zinc-500 font-mono text-xs uppercase mb-2">TEMPORAL ANCHOR (WHEN)</label>
                    <textarea 
                      value={draftBlueprint?.startingTier || ''}
                      onChange={(e) => updateDraft({ startingTier: e.target.value as any })}
                      className="flex-1 bg-transparent text-zinc-300 font-mono text-sm resize-none focus:outline-none min-h-[8rem] scrollbar-hide"
                      placeholder="Historical era..."
                    />
                  </div>
                </div>

                {/* The Systemic Vector Directive (bottom wide card) */}
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col mt-4">
                  <label className="text-zinc-500 font-mono text-xs uppercase mb-2">SYSTEMIC VECTOR DIRECTIVE (WHY / HOW)</label>
                  <textarea 
                    value={draftBlueprint?.premise || ''}
                    onChange={(e) => updateDraft({ premise: e.target.value })}
                    className="h-24 bg-transparent text-zinc-300 font-mono text-sm resize-none focus:outline-none scrollbar-hide"
                    placeholder="Calibrate the initial psychological or logic vectors..."
                  />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept=".json,.pdf,image/*,.md,text/markdown"
                  className="hidden"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800 px-6 pb-6">
          <span className="text-zinc-500 font-mono text-xs">
            STATUS: AWAITING FULL MATRIX COMPILATION // STRUCTURAL INTEGRITY VERIFIED
          </span>
          <button 
            onClick={exportBlueprint}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-700 rounded transition-colors"
          >
            [ EXPORT BLUEPRINT TO ENGINE ]
          </button>
        </div>
      </div>
    </div>
  );
}

