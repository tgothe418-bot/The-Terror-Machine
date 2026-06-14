import React, { useState } from 'react';
import { useForgeStore } from '../../store/useForgeStore';
import { fileToBase64, parseBlueprintFile } from '../../lib/fileParser';

export const FileDropzone = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const updateDraft = useForgeStore(state => state.updateDraft);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError('');

    try {
      // 1. If it's already a JSON Blueprint, just load it natively
      if (file.type === 'application/json') {
        const blueprint = await parseBlueprintFile(file);
        updateDraft(blueprint);
        setIsProcessing(false);
        return;
      }

      // 2. If it's a document (PDF, TXT, HTML, MD), send it to the Architect for extraction
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
        // OVERWRITE THE STORE WITH EXTRACTED DATA
        updateDraft({
          title: data.blueprint.title,
          premise: data.blueprint.premise,
          startingVector: data.blueprint.startingVector,
          startingTier: data.blueprint.startingTier,
          environmentalRules: data.blueprint.environmentalRules,
          cast: data.blueprint.cast
        });
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred during extraction.");
    } finally {
      setIsProcessing(false);
      // Clear the input so the same file can be uploaded again if needed
      event.target.value = '';
    }
  };

  return (
    <div className="bg-zinc-950 border border-dashed border-zinc-700 hover:border-zinc-500 rounded p-6 flex flex-col items-center justify-center transition-colors relative mt-4">
      <input 
        type="file" 
        accept=".json,.pdf,.txt,.html,.md"
        onChange={handleFileUpload} 
        disabled={isProcessing}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
      />
      
      {isProcessing ? (
        <div className="text-blue-400 font-mono text-sm animate-pulse">
          [ ARCHITECT EXTRACTING KNOWLEDGEBASE... ]
        </div>
      ) : (
        <>
          <div className="text-zinc-400 font-mono text-sm text-center">
            DROP OR SELECT KNOWLEDGEBASE
            <br/>
            <span className="text-xs text-zinc-600 mt-1 block">Supports: .JSON (Native) | .PDF, .MD, .TXT, .HTML (Architect Extraction)</span>
          </div>
        </>
      )}
      {error && <div className="text-red-500 font-mono text-xs mt-2 absolute bottom-2">{error}</div>}
    </div>
  );
};
