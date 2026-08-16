import React, { useState } from 'react';
import { ShieldAlert, Users, User, ChevronDown, ChevronUp, Lock, Sparkles, Activity } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import { normalizeParticipationContext } from '../../types';

export default function AntagonistContractDisplay() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVictimsOpen, setIsVictimsOpen] = useState(false);

  const rawParticipationContext = useAppStore(
    (state) => state.participationContext || useEngineStore.getState().participationContext
  );
  const participationContext = normalizeParticipationContext(rawParticipationContext);

  if (!participationContext || participationContext.mode !== 'antagonist') {
    return null;
  }

  const { seat, authorityContract, victimField, initialGoal } = participationContext;
  const isForce = seat?.kind === 'force';
  const name = seat?.name || 'Opposition';
  const seatKindLabel = isForce ? 'Environmental Force' : 'Physical Entity';

  const authorityText =
    authorityContract?.authority ||
    seat?.ability ||
    'Only already authored and ratified scenario facts apply. Grants no new reach, perception, mutation, omniscience, or control until re-inducted with an explicit Authority Contract.';
  const limitsText =
    authorityContract?.limits ||
    seat?.limitation ||
    'Strictly bounded to authored scenario facts and ratified state. Grants no new reach, perception, mutation, omniscience, or control without an explicit Authority Contract.';

  const isGroupVictim = victimField?.kind === 'group';
  const victimLabel = victimField
    ? isGroupVictim
      ? victimField.collectiveDesignation
      : victimField.name
    : 'Unknown target';

  const namedMembers = isGroupVictim && victimField.members ? victimField.members : [];

  return (
    <div
      id="antagonist-contract-display"
      className="w-full bg-zinc-950 border-b border-red-950/60 text-zinc-200 font-mono select-none"
    >
      {/* Compact Top Bar */}
      <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
        {/* Antagonist Seat Badge & Name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/40 border border-red-800/60 rounded text-red-400 font-bold uppercase tracking-wider text-xs">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{name}</span>
          </div>
          <span className="text-zinc-500 uppercase tracking-widest text-xs hidden sm:inline-block">
            [{seatKindLabel}]
          </span>
        </div>

        {/* Compact Summary info: Authority preview & Victim preview */}
        <div className="hidden lg:flex items-center gap-6 text-xs text-zinc-400 flex-1 justify-center max-w-3xl px-4">
          <div className="truncate flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400/80 shrink-0" />
            <span className="text-zinc-500 uppercase font-bold text-xs">Authority:</span>
            <span className="text-zinc-300 truncate" title={authorityText}>
              {authorityText}
            </span>
          </div>
          <div className="truncate flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-red-400/80 shrink-0" />
            <span className="text-zinc-500 uppercase font-bold text-xs">Limits:</span>
            <span className="text-zinc-300 truncate" title={limitsText}>
              {limitsText}
            </span>
          </div>
        </div>

        {/* Target Victim & Expansion Toggle */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 text-xs">
            {isGroupVictim ? (
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="text-zinc-500 uppercase font-bold text-xs">Target:</span>
            <span className="text-zinc-200 font-semibold">{victimLabel}</span>
            {namedMembers.length > 0 && (
              <span className="text-zinc-400 text-xs">({namedMembers.length})</span>
            )}
          </div>

          <button
            type="button"
            id="toggle-antagonist-contract-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-3 py-1 text-xs uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Hide Scope' : 'View Scope'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Read-Only Contract Presentation */}
      {isExpanded && (
        <div className="border-t border-zinc-900 bg-black/90 px-6 py-6 max-w-7xl mx-auto space-y-4 text-xs sm:text-sm animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Authority Scope */}
            <div className="p-4 bg-zinc-950 border border-amber-900/30 rounded space-y-2">
              <div className="flex items-center gap-2 text-amber-400 uppercase font-bold tracking-wider text-xs sm:text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Your Authority</span>
              </div>
              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">{authorityText}</p>
            </div>

            {/* 2. Limits & Counterplay */}
            <div className="p-4 bg-zinc-950 border border-red-900/30 rounded space-y-2">
              <div className="flex items-center gap-2 text-red-400 uppercase font-bold tracking-wider text-xs sm:text-sm">
                <Lock className="w-4 h-4" />
                <span>Your Limits & Anchors</span>
              </div>
              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">{limitsText}</p>
            </div>

            {/* 3. Objective & Manifestation */}
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2">
              <div className="flex items-center gap-2 text-zinc-400 uppercase font-bold tracking-wider text-xs sm:text-sm">
                <Activity className="w-4 h-4 text-zinc-400" />
                <span>Objective & Manifestation</span>
              </div>
              <div className="text-zinc-300 leading-relaxed text-xs sm:text-sm">
                <p className="font-semibold text-white mb-1">{initialGoal}</p>
                {seat?.description && (
                  <p className="text-zinc-400 text-xs">{seat.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Victim Details Section */}
          {victimField && (
            <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isGroupVictim ? (
                    <Users className="w-4 h-4 text-amber-400" />
                  ) : (
                    <User className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="text-zinc-200 font-bold uppercase tracking-wider text-xs sm:text-sm">
                    Victims:{' '}
                    {isGroupVictim
                      ? `Collective Group — ${victimField.collectiveDesignation}`
                      : `Individual — ${victimField.name}`}
                  </span>
                </div>
                {namedMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsVictimsOpen(!isVictimsOpen)}
                    className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <span>
                      {isVictimsOpen
                        ? 'Hide Member Profiles'
                        : `View ${namedMembers.length} Member Profiles`}
                    </span>
                    {isVictimsOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {victimField.description && (
                <p className="text-zinc-400 text-xs sm:text-sm italic">{victimField.description}</p>
              )}

              {!isGroupVictim && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs sm:text-sm">
                  {victimField.goal && (
                    <div className="text-zinc-400">
                      <span className="text-zinc-500 uppercase font-semibold text-xs">
                        Immediate Goal:{' '}
                      </span>
                      <span className="text-zinc-300">{victimField.goal}</span>
                    </div>
                  )}
                  {victimField.knownFact && (
                    <div className="text-zinc-400">
                      <span className="text-zinc-500 uppercase font-semibold text-xs">
                        Intel / Known Fact:{' '}
                      </span>
                      <span className="text-zinc-300">{victimField.knownFact}</span>
                    </div>
                  )}
                </div>
              )}

              {isGroupVictim && namedMembers.length > 0 && isVictimsOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {namedMembers.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-3 bg-black/60 border border-zinc-800 rounded text-xs space-y-1.5"
                    >
                      <div className="font-bold text-zinc-200 text-xs sm:text-sm">{m.name}</div>
                      {m.description && (
                        <div className="text-zinc-400 text-xs">{m.description}</div>
                      )}
                      {m.goal && (
                        <div className="text-zinc-400 text-xs">
                          <span className="text-zinc-500 uppercase font-semibold">Goal: </span>
                          {m.goal}
                        </div>
                      )}
                      {m.knownFact && (
                        <div className="text-zinc-400 text-xs">
                          <span className="text-zinc-500 uppercase font-semibold">Intel: </span>
                          {m.knownFact}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
