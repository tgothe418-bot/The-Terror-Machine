import React, { useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { parseCampaignFile, loadCampaignManifestAction } from '../../lib/fileParser';

export function CampaignTopologyPanel() {
  const activeCampaign = useAppStore((state) => state.activeCampaign);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const manifest = await parseCampaignFile(file);
        loadCampaignManifestAction(manifest);
      } catch (err) {
        console.error(err);
        alert('Failed to load campaign: ' + (err as Error).message);
      }
    }
  };

  if (!activeCampaign) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded p-8 cursor-pointer hover:bg-zinc-900/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          accept=".campaign.json"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />
        <h3 className="text-zinc-300 font-mono text-lg mb-4">[ LOAD CAMPAIGN MANIFEST ]</h3>
        <p className="text-zinc-500 font-mono text-xs text-center max-w-lg mb-6 leading-relaxed">
          Upload a <strong>.campaign.json</strong> file to view macro-topology.
          <br />
          <br />
          <strong>Campaigns</strong> define inter-blueprint routing, temporal shifts, and
          psychological continuity (CarryoverPolicies) across acts.
          <br />
          <strong>Blueprints</strong> define standard intra-node physical spaces and local runtime
          logic.
        </p>
        <div className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-mono rounded">
          Click or Drag File Here
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden w-full col-span-12">
      <div className="mb-4">
        <h3 className="text-cyan-400 font-mono text-lg tracking-widest uppercase">
          {activeCampaign.title}{' '}
          <span className="text-zinc-500 text-xs">v{activeCampaign.version}</span>
        </h3>
        <p className="text-zinc-500 font-mono text-xs">
          Initial Act: <span className="text-zinc-300">{activeCampaign.initialActId}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* ACTS COLUMN */}
        <div className="border border-zinc-800 rounded bg-zinc-950 flex flex-col">
          <div className="p-3 border-b border-zinc-800 bg-black">
            <h4 className="text-zinc-400 font-mono text-xs uppercase tracking-widest">
              Act Manifest
            </h4>
          </div>
          <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar flex-1">
            {activeCampaign.acts.map((act) => (
              <div
                key={act.actId}
                className="p-3 border border-zinc-800 rounded flex flex-col gap-1"
              >
                <span className="text-cyan-400 font-mono text-sm tracking-widest">{act.title}</span>
                <span className="text-zinc-500 font-mono text-xs">
                  Act ID: <span className="text-zinc-300">{act.actId}</span>
                </span>
                <span className="text-zinc-500 font-mono text-xs">
                  Blueprint: <span className="text-zinc-300">{act.blueprintId}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* EDGES COLUMN */}
        <div className="border border-zinc-800 rounded bg-zinc-950 flex flex-col">
          <div className="p-3 border-b border-zinc-800 bg-black">
            <h4 className="text-zinc-400 font-mono text-xs uppercase tracking-widest">
              Macro-Edges
            </h4>
          </div>
          <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar flex-1">
            {activeCampaign.edges.map((edge) => (
              <div key={edge.id} className="p-3 border border-zinc-800 rounded flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-mono text-xs flex gap-2 items-center">
                    <span className="text-cyan-400">{edge.fromActId}</span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-cyan-400">{edge.toActId}</span>
                  </span>
                  <span className="px-2 py-0.5 border border-zinc-700 bg-zinc-900 rounded font-mono text-[9px] uppercase tracking-widest text-zinc-400">
                    {edge.authority}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-[10px] uppercase">Kind:</span>
                  <span className="text-zinc-400 font-mono text-xs">{edge.kind}</span>
                </div>
                {edge.triggerFlags?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <span className="text-zinc-500 font-mono text-[10px] uppercase mr-1">
                      Requires:
                    </span>
                    {edge.triggerFlags.map((flag) => (
                      <span
                        key={flag}
                        className="px-1 border border-amber-900/50 bg-amber-950/20 text-amber-500 font-mono text-[9px] uppercase tracking-wider rounded"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
