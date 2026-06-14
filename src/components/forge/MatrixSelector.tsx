import React from 'react';
import { useForgeStore } from '../../store/useForgeStore';
import { HorrorVector, ExposureTier } from '../../types';

const VECTORS: HorrorVector[] = ['SOMATIC', 'COGNITIVE', 'COSMIC', 'SOCIO_MORAL'];
const TIERS: ExposureTier[] = ['GATEWAY', 'LATENT', 'MANIFEST', 'TERMINAL'];

export const MatrixSelector = () => {
  const draftBlueprint = useForgeStore(state => state.draftBlueprint);
  const updateDraft = useForgeStore(state => state.updateDraft);
  const initializeDraft = useForgeStore(state => state.initializeDraft);

  React.useEffect(() => {
    if (!draftBlueprint) {
      initializeDraft();
    }
  }, [draftBlueprint, initializeDraft]);

  if (!draftBlueprint) return null;

  return (
    <div className="matrix-selector-container bg-black p-4 border border-zinc-800 rounded">
      <h3 className="text-zinc-400 font-mono text-xs mb-4 uppercase tracking-widest">
        [ Initialize Matrix Coordinates ]
      </h3>
      <div className="grid grid-cols-5 gap-2 text-xs font-mono">
        {/* Top-left empty corner */}
        <div></div>
        
        {/* Tier Headers (X-Axis visualization) */}
        {TIERS.map(tier => (
          <div key={tier} className="text-center text-zinc-500 py-2 border-b border-zinc-800">
            {tier}
          </div>
        ))}

        {/* Matrix Rows */}
        {VECTORS.map(vector => (
          <React.Fragment key={vector}>
            {/* Vector Header (Y-Axis visualization) */}
            <div className="flex items-center justify-end pr-4 text-zinc-500 border-r border-zinc-800 text-[10px] break-words">
              {vector}
            </div>
            
            {/* Clickable Coordinate Cells */}
            {TIERS.map(tier => {
              const isSelected = draftBlueprint.startingVector === vector && draftBlueprint.startingTier === tier;
              return (
                <button
                  key={`${vector}-${tier}`}
                  onClick={() => updateDraft({ startingVector: vector, startingTier: tier })}
                  className={`
                    p-3 border transition-all duration-200
                    ${isSelected 
                      ? 'bg-red-900/20 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-300'
                    }
                  `}
                  title={`Set starting coordinate to [${vector}, ${tier}]`}
                >
                  {isSelected ? '[ X ]' : '[   ]'}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
