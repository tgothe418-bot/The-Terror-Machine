import { useState } from 'react';
import { useForgeState } from '../../store/useForgeStore';

export const BlueprintTester = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [sceneText, setSceneText] = useState("");
  const blueprint = useForgeState((state) => state.draftBlueprint);

  const handleTest = async () => {
    if (!blueprint) return;
    
    setIsTesting(true);
    setSceneText("");
    
    try {
      const response = await fetch('/api/test-scene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blueprint }),
      });
      
      const data = await response.json();
      if (data.text) {
        setSceneText(data.text);
      } else {
        setSceneText("[ SYSTEM ERROR: UNEXPECTED RESPONSE ]");
      }
    } catch (error) {
      console.error("Test scene error:", error);
      setSceneText("[ SYSTEM ERROR: FAILED TO COMPILE SCENE ]");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="border border-zinc-800 bg-black p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase">
          [ ATMOSPHERIC VALIDATION ]
        </div>
        <button 
          onClick={handleTest}
          disabled={isTesting || !blueprint}
          className="px-3 py-1 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 font-mono text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          TEST OPENING SCENE
        </button>
      </div>
      <div className="flex-grow border border-zinc-900 bg-zinc-950 p-4 font-mono text-sm text-zinc-400 overflow-y-auto whitespace-pre-wrap">
        {isTesting ? (
          <span className="animate-pulse text-cyan-500">Compiling matrix parameters...</span>
        ) : sceneText ? (
          sceneText
        ) : (
          <span className="text-zinc-600">Awaiting test initialization...</span>
        )}
      </div>
    </div>
  );
};
