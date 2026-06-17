import React, { useState } from 'react';
import { useForgeState, forgeActions, CastRole } from '../../store/useForgeStore';

export const CastManager: React.FC = () => {
  const { castLedger } = useForgeState();
  const { addCastMember, removeCastMember } = forgeActions;
  
  const [name, setName] = useState('');
  const [role, setRole] = useState<CastRole>('PROTAGONIST');
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState('NODE_INIT');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    addCastMember({
      name,
      role,
      psychological_status: status || 'Baseline.',
      starting_location: location || 'NODE_INIT'
    });
    
    setName('');
    setStatus('');
  };

  return (
    <div className="w-full flex flex-col gap-6 text-zinc-300 font-mono">
      <div className="border border-zinc-800 bg-black/40 p-4">
        <h2 className="text-xs tracking-[0.2em] text-zinc-500 uppercase mb-4 border-b border-zinc-800 pb-2">
          [ Forge // Cast Ledger Entry ]
        </h2>
        
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Entity Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 p-2 text-sm focus:outline-none focus:border-zinc-500"
            />
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as CastRole)}
              className="bg-zinc-900 border border-zinc-700 p-2 text-sm focus:outline-none focus:border-zinc-500"
            >
              <option value="PROTAGONIST">PROTAGONIST</option>
              <option value="ANTAGONIST">ANTAGONIST</option>
              <option value="SENTINEL">SENTINEL</option>
              <option value="ENTITY">ENTITY</option>
              <option value="OBSERVER">OBSERVER</option>
            </select>
          </div>
          
          <input 
            type="text" 
            placeholder="Starting Location ID (e.g. NODE_01)" 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 p-2 text-sm focus:outline-none focus:border-zinc-500"
          />

          <textarea 
            placeholder="Initial Psychological Status & Somatic Baseline..." 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            rows={3}
            className="bg-zinc-900 border border-zinc-700 p-2 text-sm focus:outline-none focus:border-zinc-500 resize-none"
          />

          <button 
            type="submit" 
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 p-2 text-xs tracking-widest uppercase transition-colors"
          >
            Inject Entity to Ledger
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {castLedger.map((member) => (
          <div key={member.id} className="border border-zinc-800 bg-zinc-950 p-4 relative group">
            <button 
              onClick={() => removeCastMember(member.id)}
              className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 text-xs"
            >
              [X]
            </button>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-lg font-bold text-zinc-100">{member.name}</span>
              <span className="text-[10px] tracking-widest text-zinc-500">[{member.role}]</span>
            </div>
            <p className="text-xs text-zinc-400 mb-2">
              <span className="text-zinc-600">LOC:</span> {member.starting_location}
            </p>
            <p className="text-sm text-zinc-300 italic border-l-2 border-zinc-700 pl-3 py-1">
              "{member.psychological_status}"
            </p>
          </div>
        ))}
        
        {castLedger.length === 0 && (
          <div className="text-center p-8 border border-dashed border-zinc-800 text-zinc-600 text-sm">
            LEDGER EMPTY. AWAITING ENTITY INJECTION.
          </div>
        )}
      </div>
    </div>
  );
};
