import React, { useState } from 'react';
import { useForgeState, forgeActions, DraftBlueprintPatch } from '../../store/useForgeStore';
import { fileToBase64, parseBlueprintFile } from '../../lib/fileParser';

export const FileDropzone = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  
  const draftBlueprint = useForgeState(state => state.draftBlueprint);
  const { updateDraft, removeReference, addArchitectMessage } = forgeActions;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError('');
    setLoadingMsg(`[ ARCHITECT ASSIMILATING LORE: ${file.name} ]\nThis may take a moment for large files...`);

    try {
      // 1. JSON Blueprint Native Load
      if (file.type === 'application/json') {
        const blueprint = await parseBlueprintFile(file) as DraftBlueprintPatch;
        updateDraft(blueprint || {});
        setIsProcessing(false);
        return;
      }

      // 2. Document Extraction
      const supportedTypes = ['application/pdf', 'text/plain', 'text/html', 'text/markdown'];
      if (!supportedTypes.includes(file.type) && !file.name.endsWith('.md')) {
        throw new Error("Unsupported file type. Please upload JSON, PDF, TXT, HTML, or MD.");
      }

      const base64Data = await fileToBase64(file);
      
      const response = await fetch('/api/extract-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'text/plain',
          base64Data
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);
      
      if (data.blueprint) {
        // Merge existing references with the new one
        const currentRefs = draftBlueprint?.references || [];
        const updatedRefs = currentRefs.includes(file.name) ? currentRefs : [...currentRefs, file.name];

        updateDraft({
          ...data.blueprint,
          references: updatedRefs
        });

        if (data.architectGreeting) {
          addArchitectMessage({
            role: 'architect',
            content: `[KNOWLEDGEBASE EXTRACTED: ${file.name}]\n\n${data.architectGreeting}`
          });
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setIsProcessing(false);
      setLoadingMsg('');
      event.target.value = '';
    }
  };

  return (
    <div className="flex flex-col space-y-2 mt-4">
      <div className="bg-zinc-950 border border-dashed border-zinc-700 hover:border-zinc-500 rounded p-6 flex flex-col items-center justify-center transition-colors relative min-h-[120px]">
        <input 
          type="file" 
          accept=".json,.pdf,.txt,.html,.md"
          onChange={handleFileUpload} 
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
        />
        
        {isProcessing ? (
          <div className="text-blue-400 font-mono text-xs text-center animate-pulse whitespace-pre-line">
            {loadingMsg}
          </div>
        ) : (
          <div className="text-zinc-400 font-mono text-sm text-center">
            DRAG & DROP KNOWLEDGEBASE
            <br/>
            <span className="text-xs text-zinc-600 mt-1 block">Supports: .JSON | .PDF, .MD, .TXT, .HTML</span>
          </div>
        )}
        {error && <div className="text-red-500 font-mono text-xs mt-2 absolute bottom-2">{error}</div>}
      </div>

      {/* Reference Tracker UI */}
      {draftBlueprint?.references && draftBlueprint.references.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {draftBlueprint.references.map((ref, idx) => (
            <div key={idx} className="flex items-center bg-zinc-900 border border-zinc-700 rounded px-2 py-1">
              <span className="text-zinc-400 font-mono text-xs mr-2 border-r border-zinc-700 pr-2">🔗 {ref}</span>
              <button 
                onClick={() => removeReference(ref)}
                className="text-red-500 hover:text-red-400 font-mono text-xs leading-none"
                title="Remove Reference from Active Context"
              >
                [X]
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
