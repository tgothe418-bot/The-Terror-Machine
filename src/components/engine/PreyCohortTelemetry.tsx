import React, { useState } from 'react';
import { Users, Radio, Activity, Terminal } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { normalizeParticipationContext } from '../../types';

export default function PreyCohortTelemetry() {
  const [isExpanded, setIsExpanded] = useState(true);

  const rawParticipationContext = useAppStore(
    (state) => state.participationContext || useEngineStore.getState().participationContext
  );
  const participationContext = normalizeParticipationContext(rawParticipationContext);
  const activeBlueprint = useAppStore((state) => state.activeBlueprint);

  if (!participationContext || participationContext.mode !== 'antagonist') {
    return null;
  }

  const ap = activeBlueprint?.antagonistProfile;
  const preyCohort = ap?.preyCohort || [];
  const apparatusControls = ap?.apparatusControls || [];

  return (
    <div className="w-full bg-[#050505] border-b border-red-950/80 text-zinc-300 font-mono text-xs select-none shadow-[inset_0_1px_0_rgba(239,68,68,0.1)]">
      {/* Top Telemetry Header Strip */}
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-950/60 border border-red-800/80 rounded text-red-400 font-bold tracking-wider text-[11px] uppercase">
            <Terminal className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>APPARATUS TELEMETRY</span>
          </div>
          <span className="text-zinc-500 text-[11px] hidden sm:inline-block">
            [{ap?.name || 'DOMINION ENGINE'}] — {apparatusControls.length} Subsystems Active
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px]">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">PREY COHORT:</span>
            <span className="text-emerald-400 font-bold">{preyCohort.length} TRACKED</span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {isExpanded ? 'Collapse Radar' : 'Expand Radar'}
          </button>
        </div>
      </div>

      {/* Expanded Biometric & Apparatus Radar Grid */}
      {isExpanded && (
        <div className="border-t border-zinc-900/80 bg-black/70 px-6 py-3 max-w-7xl mx-auto space-y-3">
          {/* 1. Tracked Prey Subjects (Victims) */}
          {preyCohort.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-2">
                <Users className="w-3 h-3 text-red-400" />
                <span>Tracked Human Subjects (Biometric Feeds)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {preyCohort.map((prey, idx) => (
                  <div
                    key={prey.id || idx}
                    className="p-2.5 bg-zinc-950 border border-red-950/40 hover:border-red-800/60 rounded space-y-1.5 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-100 truncate">{prey.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-950/40 border border-red-900/40 rounded text-red-300 font-bold uppercase tracking-wider">
                        {prey.initialNodeId || 'LOCATING'}
                      </span>
                    </div>

                    {/* Vulnerabilities & Breaking Point */}
                    <div className="text-[10px] text-zinc-400 space-y-0.5 leading-tight">
                      {prey.vulnerabilities && prey.vulnerabilities.length > 0 && (
                        <div className="truncate text-amber-400/90">
                          <span className="text-zinc-600 uppercase font-semibold">Vuln: </span>
                          {prey.vulnerabilities[0]}
                        </div>
                      )}
                      {prey.breakingPoint && (
                        <div className="truncate text-zinc-400">
                          <span className="text-zinc-600 uppercase font-semibold">Limit: </span>
                          {prey.breakingPoint}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Apparatus Controls & Telemetry Feeds */}
          {apparatusControls.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1.5">
                <Activity className="w-3 h-3 text-amber-400" />
                <span>Controllable Subsystems & Actuators</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {apparatusControls.map((ctrl) => (
                  <div
                    key={ctrl.id}
                    className="px-2.5 py-1 bg-zinc-950 border border-zinc-800/80 rounded text-[10px] flex items-center gap-2 hover:border-amber-800/50 transition-colors"
                    title={ctrl.availableActions.join(', ')}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-zinc-200 font-semibold">{ctrl.name}</span>
                    <span className="text-zinc-500 uppercase">[{ctrl.kind}]</span>
                    {ctrl.affectedNodeIds && ctrl.affectedNodeIds.length > 0 && (
                      <span className="text-zinc-400 text-[9px]">
                        ({ctrl.affectedNodeIds.join(', ')})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
