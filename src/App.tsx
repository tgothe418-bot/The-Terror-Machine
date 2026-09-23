/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import WelcomeScreen from './components/hub/WelcomeScreen';
import Forge from './components/forge/Forge';
import Engine from './components/engine/Engine';
import TheVoice from './components/hub/TheVoice';
import { AiCalibrationModal } from './components/hub/AiCalibrationModal';

export default function App() {
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);
  const rawPhase = useAppStore((state) => state.phase);
  const phase = typeof rawPhase === 'string' ? rawPhase.toUpperCase() : 'HUB';

  const currentNodeId = useAppStore((state) => state.currentNodeId);
  const isShattered = useAppStore((state) => state.isShattered);
  const spatialGraph = useAppStore((state) => state.spatialGraph);

  const currentNodeName = spatialGraph?.find((n) => n.id === currentNodeId)?.name || 'Unknown';

  const isEnginePhase = ['LATENT', 'MANIFEST', 'TERMINAL', 'TERMINATED', 'ENGINE', 'RUNTIME'].includes(phase);

  const renderContent = () => {
    if (phase === 'FORGE' || phase === 'ARCHITECT') return <Forge />;
    if (isEnginePhase) return <Engine />;
    if (phase === 'VOICE') {
      return <TheVoice engineState={{ currentNode: currentNodeName, isShattered }} />;
    }
    return <WelcomeScreen />;
  };

  return (
    <div className="app-root relative min-h-screen bg-black text-zinc-100 selection:bg-white selection:text-black">
      {/* Pinned Global Calibration Cogwheel (Top-Left) */}
      <button
        onClick={() => setIsCalibrationModalOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 rounded-md bg-zinc-950/80 border border-zinc-800/80 hover:border-amber-600/60 text-zinc-400 hover:text-amber-400 backdrop-blur transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-md"
        title="AI Calibration & Provider Configuration"
        aria-label="Open AI Calibration"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Primary View Routing (Hub / Forge / Engine) */}
      {renderContent()}

      {/* Non-Destructive Overlay Modal */}
      {isCalibrationModalOpen && (
        <AiCalibrationModal
          isOpen={isCalibrationModalOpen}
          onClose={() => setIsCalibrationModalOpen(false)}
        />
      )}
    </div>
  );
}
