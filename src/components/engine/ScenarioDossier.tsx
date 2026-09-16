/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  BookOpen,
  MapPin,
  Compass,
  ChevronDown,
  ChevronRight,
  Flame,
  Clock,
  Radio,
  Users,
  Activity,
  ShieldAlert,
  Binary,
} from 'lucide-react';

export interface SettingDossier {
  location?: string;
  atmosphere?: string;
  timePeriod?: string;
}

export interface CharacterRelationshipDossier {
  sourceName?: string;
  targetName?: string;
  relation?: string;
  tension?: string | number;
  sentiment?: string;
}

export interface CharacterSummaryDossier {
  id?: string;
  name: string;
  role?: string;
  status?: string;
  psychological_status?: string;
  location?: string;
  traits?: string[];
  relationships?: string | string[];
}

export interface ScenarioBlueprintDossier {
  title?: string;
  scale?: string | number;
  contentScale?: string | number;
  contentLevelDescription?: string;
  coverImageUrl?: string;
  backCoverBlurb?: string;
  premise?: string;
  globalPremise?: string;
  setting?: SettingDossier;
  cast?: Array<CharacterSummaryDossier | any>;
  characters?: Array<CharacterSummaryDossier | any>;
  relationships?: Array<CharacterRelationshipDossier | any>;
  cast_relationships?: Array<CharacterRelationshipDossier | any>;
  [key: string]: any;
}

export interface EngineTelemetryDossier {
  tension?: string;
  pacing?: string;
  engineLogic?: string;
  currentPhase?: string;
  turnCount?: number;
  activeLocation?: string;
  cognitiveStrain?: string | number;
  threatLevel?: string;
  castLedger?: Array<any>;
  [key: string]: any;
}

export interface ScenarioDossierProps {
  blueprint?: ScenarioBlueprintDossier;
  telemetry?: EngineTelemetryDossier;
  turnCount?: number;
  latestForensicRecord?: any;
  activeLocation?: string;
  className?: string;
}

export default function ScenarioDossier({
  blueprint,
  telemetry,
  turnCount,
  latestForensicRecord,
  activeLocation,
  className = '',
}: ScenarioDossierProps) {
  const [showDiagnosticLedger, setShowDiagnosticLedger] = useState(false);
  const [isActivityExpanded, setIsActivityExpanded] = useState(true);
  const [isPressureExpanded, setIsPressureExpanded] = useState(true);

  // Scenario metadata resolution
  const title = blueprint?.title || 'Uninscribed Scenario';
  const scale = blueprint?.scale ?? blueprint?.contentScale ?? 'Unspecified';
  const scaleDescription = blueprint?.contentLevelDescription;
  const topologyLocation = blueprint?.setting?.location || 'Uncharted Topology';
  const currentActiveLocation =
    activeLocation ||
    telemetry?.activeLocation ||
    latestForensicRecord?.activeLocation ||
    topologyLocation;
  const atmosphere = blueprint?.setting?.atmosphere || 'Perceptual Silence';
  const timePeriod = blueprint?.setting?.timePeriod;
  const blurb =
    blueprint?.backCoverBlurb ||
    blueprint?.premise ||
    blueprint?.globalPremise ||
    'No scenario premise inscribed into the occult grimoire.';

  // Telemetry resolution
  const effectiveTurn = turnCount ?? telemetry?.turnCount ?? latestForensicRecord?.turnNumber ?? 1;
  const tension = (telemetry?.tension || 'LOW').toUpperCase();
  const pacing = (telemetry?.pacing || 'CREEPING').toUpperCase();
  const currentPhase = telemetry?.currentPhase || 'INVESTIGATION';
  const threatLevel = telemetry?.threatLevel || telemetry?.cognitiveStrain || 'NOMINAL';
  const engineLogic = telemetry?.engineLogic;

  // Character resolution: merge blueprint cast/characters with telemetry castLedger
  const rawCast: Array<any> =
    blueprint?.cast && blueprint.cast.length > 0
      ? blueprint.cast
      : blueprint?.characters && blueprint.characters.length > 0
      ? blueprint.characters
      : telemetry?.castLedger && telemetry.castLedger.length > 0
      ? telemetry.castLedger
      : [];

  const characterProfiles = rawCast.map((c: any) => {
    const ledgerMatch = telemetry?.castLedger?.find(
      (l: any) => (c.id && l.character_id === c.id) || (c.name && l.character_name === c.name)
    );
    return {
      name: c.name || c.character_name || 'Unknown Soul',
      role: c.role || (c.isUserCharacter ? 'Conductor Vessel' : 'Cohort Member'),
      status: ledgerMatch?.psychological_status || c.psychological_status || c.status || 'Composed',
      location: ledgerMatch?.current_location || c.location || c.starting_location || 'Co-present',
      relationships: c.relationships || c.traits || [],
    };
  });

  // Explicit relationships resolution
  const explicitRelationships: CharacterRelationshipDossier[] =
    blueprint?.relationships || blueprint?.cast_relationships || [];

  // Tension level color & width helper
  const getTensionConfig = (lvl: string) => {
    switch (lvl) {
      case 'CRITICAL':
      case 'TERROR':
      case 'PEAK':
        return { width: '95%', color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/60' };
      case 'HIGH':
      case 'ELEVATED':
      case 'INTENSE':
        return { width: '75%', color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/60' };
      case 'MEDIUM':
      case 'RISING':
      case 'BUILDING':
        return { width: '50%', color: 'bg-amber-600', text: 'text-amber-500', border: 'border-amber-600/60' };
      case 'LOW':
      case 'CALM':
      default:
        return { width: '25%', color: 'bg-zinc-500', text: 'text-zinc-400', border: 'border-zinc-600/60' };
    }
  };

  const tensionConfig = getTensionConfig(tension);

  return (
    <div
      data-testid="scenario-dossier"
      className={`rounded-lg border border-zinc-800/80 bg-zinc-950/80 text-zinc-300 font-mono shadow-2xl backdrop-blur flex flex-col select-none overflow-hidden ${className}`}
    >
      {/* Occult Scrying Header */}
      <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-black/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#d97706] shadow-[0_0_8px_#d97706]" />
          <h2 className="font-serif tracking-widest text-[#e6e4dc] uppercase text-xs sm:text-sm font-bold">
            Scenario Dossier // Inscribed Grimoire
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
          <BookOpen className="w-3.5 h-3.5 text-[#d97706]" />
          <span className="hidden sm:inline">ARCHIVE PROTOCOL</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
        {/* Scenario Cover Art or Austin Osman Spare Sigil Talisman (Compact Header Emblem, max h-24 with Vignette Fade) */}
        {blueprint?.coverImageUrl ? (
          <div
            data-testid="scenario-cover-image-container"
            className="w-full h-24 max-h-24 rounded border border-zinc-800/80 bg-zinc-950/90 overflow-hidden shadow-lg relative group shrink-0"
          >
            <img
              src={blueprint.coverImageUrl}
              alt={title}
              className="w-full h-full object-cover object-center opacity-85 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
            />
            {/* Vignette Fade Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-zinc-950 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40 pointer-events-none" />
            <div className="absolute inset-0 ring-1 ring-inset ring-black/60 pointer-events-none" />

            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <span className="text-xs font-serif uppercase tracking-widest text-[#e6e4dc] font-bold truncate drop-shadow">
                {title}
              </span>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-black/80 border border-zinc-700/60 rounded text-[#d97706] font-mono font-semibold shrink-0">
                ILLUMINATED
              </span>
            </div>
          </div>
        ) : (
          <div
            data-testid="talisman-flourish"
            className="w-full h-24 max-h-24 rounded border border-zinc-800/80 bg-zinc-950/60 px-4 py-2 flex items-center justify-between relative overflow-hidden group shadow-inner shrink-0"
          >
            {/* Austin Osman Spare Sigil Talisman SVG with Vignette Fade */}
            <svg
              className="absolute inset-0 w-full h-full text-zinc-700/40 stroke-current group-hover:text-amber-600/40 transition-colors duration-700 pointer-events-none"
              viewBox="0 0 320 80"
              fill="none"
              strokeWidth="0.8"
            >
              {/* Occult Scrying Radial Lines & Concentric Talismans */}
              <circle cx="160" cy="40" r="32" strokeDasharray="3 4" stroke="#52525b" opacity="0.4" />
              <circle cx="160" cy="40" r="22" stroke="#71717a" opacity="0.5" />
              <circle cx="160" cy="40" r="12" strokeDasharray="2 2" stroke="#d97706" opacity="0.6" />
              <circle cx="160" cy="40" r="4" stroke="#e6e4dc" opacity="0.8" />
              {/* Spare Automatic Curved Strokes */}
              <path d="M40 40 C80 15, 120 65, 160 40 S240 15, 280 40" stroke="#71717a" opacity="0.4" />
              <path d="M60 55 C110 25, 150 60, 200 30 S260 55, 290 40" stroke="#52525b" opacity="0.3" />
              <path d="M160 8 C130 25, 190 55, 160 72" stroke="#d97706" opacity="0.5" strokeWidth="1" />
              {/* Axis Reticles */}
              <line x1="160" y1="5" x2="160" y2="75" stroke="#3f3f46" strokeDasharray="1 3" />
              <line x1="80" y1="40" x2="240" y2="40" stroke="#3f3f46" strokeDasharray="1 3" />
              {/* Austin Osman Spare Glyphs / Sigil points */}
              <circle cx="160" cy="40" r="2.5" fill="#d97706" />
              <circle cx="112" cy="40" r="1.5" fill="#e6e4dc" />
              <circle cx="208" cy="40" r="1.5" fill="#e6e4dc" />
              <circle cx="160" cy="16" r="1.5" fill="#e6e4dc" />
              <circle cx="160" cy="64" r="1.5" fill="#e6e4dc" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-zinc-950 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none" />
            <div className="relative z-10 w-full flex items-center justify-between text-[10px] font-mono tracking-wider">
              <span className="text-zinc-400 uppercase font-medium">Austin Osman Spare · Sigil Talisman</span>
              <span className="text-[#d97706] font-semibold text-[9px] px-1.5 py-0.5 rounded bg-black/80 border border-amber-900/40">
                SIGIL VEILED
              </span>
            </div>
          </div>
        )}

        {/* Title, Scale & Inscription Overview */}
        <div className="space-y-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 block font-mono font-semibold">
              Canonical Inscription
            </span>
            <h3
              data-testid="scenario-title"
              className="text-base sm:text-lg font-serif font-bold text-[#e6e4dc] tracking-wide uppercase leading-snug"
            >
              {title}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Content Scale */}
            <div
              data-testid="scenario-scale"
              className="p-2.5 rounded bg-black/40 border border-zinc-800/80 space-y-1"
            >
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                <Flame className="w-3 h-3 text-[#d97706]" />
                <span>Content Scale</span>
              </div>
              <div className="text-zinc-200 font-bold">
                {String(scale)}
                {scaleDescription && (
                  <span className="text-zinc-400 font-normal ml-1">({scaleDescription})</span>
                )}
              </div>
            </div>

            {/* Setting Topology / Active Location */}
            <div
              data-testid="scenario-location"
              className="p-2.5 rounded bg-black/40 border border-zinc-800/80 space-y-1"
            >
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                <MapPin className="w-3 h-3 text-red-400" />
                <span>Setting Topology</span>
              </div>
              <div className="text-zinc-200 font-bold truncate" title={currentActiveLocation}>
                {currentActiveLocation}
              </div>
            </div>
          </div>

          {/* Active Location Display (Reclaimed Dynamic Space) */}
          <div
            data-testid="active-location-display"
            className="p-2.5 rounded bg-black/30 border border-zinc-800/60 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-mono">
                ACTIVE LOCATION:
              </span>
              <span className="text-zinc-200 font-semibold font-serif">{currentActiveLocation}</span>
            </div>
            {timePeriod && (
              <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                <Clock className="w-2.5 h-2.5 text-zinc-400" />
                {timePeriod}
              </span>
            )}
          </div>

          {/* Setting Atmosphere & Sensory Constraints */}
          <div
            data-testid="scenario-atmosphere"
            className="p-2.5 rounded bg-black/40 border border-zinc-800/80 space-y-1 text-xs"
          >
            <div className="flex items-center justify-between text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
              <div className="flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-[#d97706]" />
                <span>Atmosphere &amp; Sensory Constraints</span>
              </div>
              {timePeriod && (
                <div className="flex items-center gap-1 text-zinc-400">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{timePeriod}</span>
                </div>
              )}
            </div>
            <div className="text-zinc-300 italic font-serif leading-relaxed">
              "{atmosphere}"
            </div>
          </div>

          {/* Premise / Back Cover Blurb */}
          <div
            data-testid="scenario-blurb"
            className="p-3.5 rounded border border-zinc-800/70 bg-zinc-950/60 backdrop-blur-sm shadow-xl space-y-1.5"
          >
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#d97706] block font-mono font-semibold">
              Scenario Synopsis // Blurb
            </span>
            <p className="font-serif italic text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
              {blurb}
            </p>
          </div>
        </div>

        {/* Dynamic Situation Metrics (Reclaimed Vertical Space) */}
        <div data-testid="situation-metrics" className="space-y-3 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-mono font-semibold flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[#d97706]" />
              Situation Metrics // Resonances
            </span>
            <div
              data-testid="telemetry-cycle-counter"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono"
            >
              <Radio className="w-3 h-3 text-[#d97706]" />
              <span className="text-zinc-500 uppercase">CYCLE:</span>
              <span className="text-[#e6e4dc] font-bold">{effectiveTurn}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Tension Meter */}
            <div
              data-testid="telemetry-tension"
              className="p-3 rounded bg-black/40 border border-zinc-800/80 space-y-2"
            >
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold">
                <span className="text-zinc-500">Tension Level</span>
                <span className={`font-bold ${tensionConfig.text}`}>{tension}</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                <div
                  className={`h-full ${tensionConfig.color} transition-all duration-500`}
                  style={{ width: tensionConfig.width }}
                />
              </div>
            </div>

            {/* Narrative Pacing */}
            <div
              data-testid="telemetry-pacing"
              className="p-3 rounded bg-black/40 border border-zinc-800/80 space-y-1"
            >
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                Narrative Pacing
              </div>
              <div className="text-cyan-400 font-bold tracking-wider uppercase text-xs sm:text-sm">
                {pacing}
              </div>
            </div>

            {/* Cognitive Threat / Dread Status */}
            <div className="p-2.5 rounded bg-black/40 border border-zinc-800/80 space-y-1 sm:col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                <ShieldAlert className="w-3 h-3 text-amber-500" />
                <span>Cognitive Strain / Threat Vector</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400/90 uppercase tracking-wider">
                {String(threatLevel)} // {currentPhase}
              </span>
            </div>
          </div>

          {/* Engine Rationale (if present) */}
          {engineLogic && (
            <div
              data-testid="telemetry-engine-logic"
              className="p-3 rounded bg-[#040405] border border-zinc-800/90 text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap shadow-inner"
            >
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1 font-semibold">
                System Logic Rationale
              </span>
              {engineLogic}
            </div>
          )}
        </div>

        {/* Character Relationship Summary (Reclaimed Vertical Space) */}
        <div data-testid="character-relationship-summary" className="space-y-3 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-mono font-semibold flex items-center gap-1.5">
              <Users className="w-3 h-3 text-[#d97706]" />
              Cohort &amp; Character Relationships
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {characterProfiles.length} INSCRIBED
            </span>
          </div>

          {characterProfiles.length > 0 ? (
            <div className="space-y-2">
              {characterProfiles.map((char, i) => (
                <div
                  key={`${char.name}-${i}`}
                  data-testid={`character-summary-${i}`}
                  className="p-2.5 rounded bg-black/40 border border-zinc-800/80 space-y-1.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-zinc-200 tracking-wide text-xs sm:text-sm">
                      {char.name}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {char.role}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="text-zinc-500">Status:</span>
                    <span
                      className={`font-semibold uppercase tracking-wider ${
                        char.status.toLowerCase().includes('panic') ||
                        char.status.toLowerCase().includes('trauma') ||
                        char.status.toLowerCase().includes('critical')
                          ? 'text-red-400'
                          : char.status.toLowerCase().includes('strained')
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {char.status}
                    </span>
                    <span className="text-zinc-700">|</span>
                    <span className="text-zinc-500">Location:</span>
                    <span className="text-zinc-300 truncate max-w-[130px]">{char.location}</span>
                  </div>

                  {Array.isArray(char.relationships) && char.relationships.length > 0 && (
                    <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-900 flex flex-wrap gap-1">
                      <span className="text-zinc-600">Ties:</span>
                      {char.relationships.map((rel: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800/60 text-zinc-400"
                        >
                          {rel}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Explicit Relational Links if present */}
              {explicitRelationships.length > 0 && (
                <div className="p-2.5 rounded bg-zinc-950/60 border border-zinc-800/70 space-y-1 text-xs font-mono">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 block font-semibold">
                    Relational Dynamics:
                  </span>
                  <div className="space-y-1">
                    {explicitRelationships.map((rel, idx) => (
                      <div key={idx} className="text-[10px] text-zinc-300 flex items-center justify-between">
                        <span>
                          <span className="text-zinc-400">{rel.sourceName || 'Subject'}</span>
                          <span className="text-amber-500 mx-1">↔</span>
                          <span className="text-zinc-400">{rel.targetName || 'Subject'}</span>
                        </span>
                        <span className="text-zinc-500 italic">{rel.relation || 'Bound'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              data-testid="character-summary-empty"
              className="p-3 rounded bg-[#030304] border border-zinc-800/60 text-xs text-zinc-500 italic font-mono text-center"
            >
              No active cohort members inscribed into this grimoire topology.
            </div>
          )}
        </div>

        {/* Developer Plumbing: Horror Grammar Forensics (Hidden behind explicit toggle) */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Binary className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-mono font-semibold">
                Forensic Diagnostics
              </span>
              {latestForensicRecord && (
                <span className="text-[9px] text-zinc-600 font-mono">
                  TURN #{latestForensicRecord.turnNumber}
                </span>
              )}
            </div>
            <button
              type="button"
              data-testid="toggle-diagnostic-ledger"
              onClick={() => setShowDiagnosticLedger(!showDiagnosticLedger)}
              className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#d97706] hover:text-amber-300 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 rounded transition-colors cursor-pointer"
            >
              {showDiagnosticLedger ? '[ Hide Diagnostic Ledger ]' : '[ Show Diagnostic Ledger ]'}
            </button>
          </div>

          {showDiagnosticLedger && (
            <div data-testid="diagnostic-ledger-panel" className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono font-bold flex items-center justify-between">
                <span>Horror Grammar Forensics</span>
                {latestForensicRecord && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    TURN #{latestForensicRecord.turnNumber}
                  </span>
                )}
              </div>

              {latestForensicRecord ? (
                <div data-testid="forensics-content" className="space-y-3 text-xs font-mono">
                  {/* Turn Identity & Fictional Time Matrix */}
                  <div className="p-3 rounded bg-black/40 border border-zinc-800/80 space-y-1.5">
                    <div className="text-zinc-400 text-[11px] uppercase tracking-wider font-bold">
                      Time &amp; Selection Horizon
                    </div>
                    <div className="text-zinc-300">
                      <span className="text-zinc-500">Moment:</span>{' '}
                      {latestForensicRecord.preFictionalTime?.moment_revision ?? 0} →{' '}
                      {latestForensicRecord.postFictionalTime?.moment_revision ??
                        latestForensicRecord.preFictionalTime?.moment_revision ??
                        0}
                    </div>
                    {latestForensicRecord.presentOpportunityIds && (
                      <div className="text-zinc-300 truncate">
                        <span className="text-zinc-500">Opportunities:</span>{' '}
                        {latestForensicRecord.presentOpportunityIds.length > 0
                          ? latestForensicRecord.presentOpportunityIds.join(', ')
                          : 'None'}
                      </div>
                    )}
                    {latestForensicRecord.selectedOffscreenPursuitIds && (
                      <div className="text-zinc-300 truncate">
                        <span className="text-zinc-500">Selected Offscreen:</span>{' '}
                        {latestForensicRecord.selectedOffscreenPursuitIds.length > 0
                          ? latestForensicRecord.selectedOffscreenPursuitIds.join(', ')
                          : 'None'}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Activity Proposal Evidence */}
                  <div className="rounded border border-zinc-800/80 bg-zinc-950/60 overflow-hidden">
                    <button
                      type="button"
                      data-testid="toggle-activity-evidence"
                      onClick={() => setIsActivityExpanded(!isActivityExpanded)}
                      className="w-full px-3 py-2.5 flex items-center justify-between bg-black/50 hover:bg-zinc-900/60 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isActivityExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className="text-xs uppercase tracking-wider font-bold text-zinc-300">
                          Activity Proposal Evidence
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          latestForensicRecord.activityEvidence?.disposition === 'ACCEPTED'
                            ? 'text-emerald-400 border-emerald-900/60 bg-emerald-950/30'
                            : latestForensicRecord.activityEvidence?.disposition === 'REJECTED'
                            ? 'text-red-400 border-red-900/60 bg-red-950/30'
                            : 'text-zinc-500 border-zinc-800 bg-zinc-900/40'
                        }`}
                      >
                        {latestForensicRecord.activityEvidence?.disposition === 'ACCEPTED'
                          ? 'ACCEPTED'
                          : latestForensicRecord.activityEvidence?.disposition === 'REJECTED'
                          ? 'REJECTED'
                          : 'NO PROPOSAL'}
                      </span>
                    </button>

                    {isActivityExpanded && (
                      <div
                        data-testid="activity-evidence-body"
                        className="p-3 border-t border-zinc-900/80 space-y-1.5 text-xs bg-black/20"
                      >
                        <div className="text-zinc-300">
                          <span className="text-zinc-500">Reason Code:</span>{' '}
                          <span className="text-[#e6e4dc]">
                            {latestForensicRecord.activityEvidence?.reasonCode || 'N/A'}
                          </span>
                        </div>
                        {latestForensicRecord.activityEvidence?.castMemberId && (
                          <div className="text-zinc-300">
                            <span className="text-zinc-500">Actor:</span>{' '}
                            {latestForensicRecord.activityEvidence.castMemberId}
                            {latestForensicRecord.activityEvidence.perceptionPath && (
                              <span className="text-zinc-400 ml-1">
                                [{latestForensicRecord.activityEvidence.perceptionPath}]
                              </span>
                            )}
                          </div>
                        )}
                        {latestForensicRecord.activityEvidence?.activitySummary && (
                          <div className="text-zinc-300">
                            <span className="text-zinc-500">Summary:</span>{' '}
                            {latestForensicRecord.activityEvidence.activitySummary}
                          </div>
                        )}
                        {latestForensicRecord.activityEvidence?.manifestationBlock && (
                          <div className="mt-2 p-2.5 rounded bg-black/80 border border-zinc-800/80 text-zinc-300 italic font-serif">
                            <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono not-italic mb-1 font-semibold">
                              Manifestation Content
                            </div>
                            "{latestForensicRecord.activityEvidence.manifestationBlock.content}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Situated Pressure Evidence */}
                  <div className="rounded border border-zinc-800/80 bg-zinc-950/60 overflow-hidden">
                    <button
                      type="button"
                      data-testid="toggle-pressure-evidence"
                      onClick={() => setIsPressureExpanded(!isPressureExpanded)}
                      className="w-full px-3 py-2.5 flex items-center justify-between bg-black/50 hover:bg-zinc-900/60 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isPressureExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className="text-xs uppercase tracking-wider font-bold text-zinc-300">
                          Situated Pressure Evidence
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          latestForensicRecord.pressureEvidence?.disposition === 'ACCEPTED'
                            ? 'text-emerald-400 border-emerald-900/60 bg-emerald-950/30'
                            : latestForensicRecord.pressureEvidence?.disposition === 'REJECTED'
                            ? 'text-red-400 border-red-900/60 bg-red-950/30'
                            : 'text-zinc-500 border-zinc-800 bg-zinc-900/40'
                        }`}
                      >
                        {latestForensicRecord.pressureEvidence?.disposition === 'ACCEPTED'
                          ? 'ACCEPTED'
                          : latestForensicRecord.pressureEvidence?.disposition === 'REJECTED'
                          ? 'REJECTED'
                          : 'NO PROPOSAL'}
                      </span>
                    </button>

                    {isPressureExpanded && (
                      <div
                        data-testid="pressure-evidence-body"
                        className="p-3 border-t border-zinc-900/80 space-y-1.5 text-xs bg-black/20"
                      >
                        <div className="text-zinc-300">
                          <span className="text-zinc-500">Reason Code:</span>{' '}
                          <span className="text-[#e6e4dc]">
                            {latestForensicRecord.pressureEvidence?.reasonCode || 'N/A'}
                          </span>
                        </div>
                        {latestForensicRecord.pressureEvidence?.valueAnchorId && (
                          <div className="text-zinc-300">
                            <span className="text-zinc-500">Value Anchor:</span>{' '}
                            {latestForensicRecord.pressureEvidence.valueAnchorId}
                            {latestForensicRecord.pressureEvidence.operator && (
                              <span className="text-zinc-400 ml-1">
                                ({latestForensicRecord.pressureEvidence.operator})
                              </span>
                            )}
                          </div>
                        )}
                        {latestForensicRecord.pressureEvidence?.adverseProspect && (
                          <div className="text-zinc-300">
                            <span className="text-zinc-500">Prospect:</span>{' '}
                            {latestForensicRecord.pressureEvidence.adverseProspect}
                          </div>
                        )}
                        {latestForensicRecord.pressureEvidence?.manifestationBlock && (
                          <div className="mt-2 p-2.5 rounded bg-black/80 border border-zinc-800/80 text-zinc-300 italic font-serif">
                            <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono not-italic mb-1 font-semibold">
                              Manifestation Content
                            </div>
                            "{latestForensicRecord.pressureEvidence.manifestationBlock.content}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  data-testid="forensics-empty"
                  className="p-4 rounded bg-[#020202] border border-zinc-800/80 text-xs text-zinc-500 italic font-mono text-center"
                >
                  Awaiting committed Horror Grammar turn telemetry...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
