import React, { useState } from 'react';
import { User, UserPlus, UserMinus, Shield, AlertTriangle, Edit3, Fingerprint, Loader2 } from 'lucide-react';
import { useForgeStore } from '../../store/useForgeStore';
import { analyzeReferenceMaterial } from '../../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

export default function CastManager() {
  const { 
    availableReferenceCharacters, 
    selectedCharacters, 
    addCharacterToCast, 
    removeCharacterFromCast, 
    updateCharacterDetails,
    hasReferenceMaterial,
    setAvailableReferenceCharacters,
    forgePhase,
    setForgePhase,
    referenceMaterials,
    setExtractedSetting,
    setExtractedThreat,
    setExtractedStyle,
    addMessage
  } = useForgeStore();

  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractCast = async () => {
    setIsExtracting(true);
    try {
      if (referenceMaterials && referenceMaterials.length > 0) {
        // 1. Fire the Universal Extractor
        const lore = await analyzeReferenceMaterial(referenceMaterials);
        
        // 2. Hydrate the Store with all parsed data
        if (lore.extracted_cast && lore.extracted_cast.length > 0) {
          setAvailableReferenceCharacters(lore.extracted_cast);
        }
        if (lore.extracted_setting) setExtractedSetting(lore.extracted_setting);
        if (lore.extracted_threat) setExtractedThreat(lore.extracted_threat);
        if (lore.extracted_style) setExtractedStyle(lore.extracted_style);

        // 3. Evaluate and Route the State Machine
        const hasExternalThreat = Boolean(lore.extracted_setting && lore.extracted_threat);

        if (hasExternalThreat) {
          // Skip Phase 1 entirely
          addMessage({ 
            role: 'assistant', 
            content: `[ SYSTEM: Lore Extracted. Setting and Threat parameters identified from reference material. Bypassing Phase 1. ]`, 
            timestamp: Date.now() 
          });
          setForgePhase('INTERVIEW_PHASE_2');
        } else {
          // Proceed normally
          addMessage({ 
            role: 'assistant', 
            content: `[ SYSTEM: Lore Extracted. Awaiting clarification on external threats. ]`, 
            timestamp: Date.now() 
          });
          setForgePhase('INTERVIEW_PHASE_1');
        }
      }
    } catch (error) {
      console.error("Extraction Failed:", error);
      addMessage({ role: 'assistant', content: "[ SYSTEM ERROR: Failed to parse reference material. ]", timestamp: Date.now() });
    } finally {
      setIsExtracting(false);
    }
  };

  const isLimitReached = selectedCharacters.filter(c => !c.isUserCharacter).length >= 5;

  return (
    <div className="border border-zinc-800 bg-zinc-950/50 p-4 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400">Cast Management</h3>
        <span className="text-[8px] text-zinc-600 uppercase tracking-widest">
          {selectedCharacters.filter(c => !c.isUserCharacter).length} / 5 NPCs Established
        </span>
      </div>

      {hasReferenceMaterial && forgePhase === 'CAST_EXTRACTION' && availableReferenceCharacters.length === 0 && (
        <div className="space-y-4">
          <button 
            onClick={handleExtractCast}
            disabled={isExtracting}
            className="w-full flex items-center justify-center gap-2 p-3 border border-zinc-800 bg-black text-xs uppercase tracking-widest hover:border-white hover:text-white transition-all disabled:opacity-50"
          >
            {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
            {isExtracting ? 'Extracting Cast Details...' : 'Parse Characters from Reference'}
          </button>
        </div>
      )}

      {hasReferenceMaterial && availableReferenceCharacters.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[9px] uppercase tracking-widest text-zinc-500">Extracted from Reference</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableReferenceCharacters.map((char) => {
              const isSelected = selectedCharacters.some(c => c.id === char.id);
              return (
                <div 
                  key={char.id}
                  className={`p-3 border transition-all ${
                    isSelected ? 'border-white bg-white/5' : 'border-zinc-900 bg-black/20 opacity-60 grayscale'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold block">{char.name}</span>
                      <span className="text-[9px] text-zinc-500 uppercase">{char.role}</span>
                    </div>
                    <button
                      onClick={() => isSelected ? removeCharacterFromCast(char.id) : addCharacterToCast(char)}
                      disabled={!isSelected && isLimitReached}
                      className={`p-1.5 border transition-all ${
                        isSelected 
                          ? 'border-fresh-blood text-fresh-blood hover:bg-fresh-blood hover:text-white' 
                          : 'border-zinc-700 text-zinc-500 hover:border-white hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isSelected ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                    </button>
                  </div>
                  {isSelected && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-zinc-900">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-2.5 h-2.5 text-zinc-600" />
                        <span className="text-[8px] uppercase text-zinc-600">Alter Traits</span>
                      </div>
                      <textarea
                        value={char.personality}
                        onChange={(e) => updateCharacterDetails(char.id, { personality: e.target.value })}
                        placeholder="Modify personality or behavior..."
                        className="w-full bg-black border border-zinc-800 p-2 text-[10px] focus:outline-none focus:border-zinc-600 resize-none h-12 scrollbar-hide"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-[9px] uppercase tracking-widest text-zinc-500">Selected Cast</h4>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {selectedCharacters.length === 0 ? (
              <div className="text-[9px] text-zinc-600 italic py-4 text-center border border-dashed border-zinc-900">
                No characters established. Architect awaiting description...
              </div>
            ) : (
              selectedCharacters.map((char) => (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={`p-3 border ${char.isUserCharacter ? 'border-fresh-blood/50 bg-fresh-blood/5' : 'border-zinc-800 bg-black/40'} flex items-center justify-between group`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 border ${char.isUserCharacter ? 'border-fresh-blood text-fresh-blood' : 'border-zinc-700 text-zinc-500'}`}>
                      {char.isUserCharacter ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{char.name}</span>
                        {char.isUserCharacter && <span className="text-[8px] bg-fresh-blood px-1 text-white uppercase tracking-tighter">User</span>}
                      </div>
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{char.role}</span>
                    </div>
                  </div>
                  {!char.isUserCharacter && (
                    <button
                      onClick={() => removeCharacterFromCast(char.id)}
                      className="p-2 text-zinc-700 hover:text-fresh-blood opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {isLimitReached && (
        <div className="p-3 border border-fresh-blood/20 bg-fresh-blood/5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-fresh-blood" />
          <span className="text-[9px] uppercase tracking-widest text-fresh-blood">
            Character Limit Reached (5 NPCs Max)
          </span>
        </div>
      )}
    </div>
  );
}
