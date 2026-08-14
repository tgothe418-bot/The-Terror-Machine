/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAppStore } from './store/useAppStore';
import WelcomeScreen from './components/hub/WelcomeScreen';
import Forge from './components/forge/Forge';
import Engine from './components/engine/Engine';
import TheVoice from './components/hub/TheVoice';

export default function App() {
  const rawPhase = useAppStore((state) => state.phase);
  const phase = typeof rawPhase === 'string' ? rawPhase.toUpperCase() : 'HUB';

  const currentNodeId = useAppStore((state) => state.currentNodeId);
  const isShattered = useAppStore((state) => state.isShattered);
  const spatialGraph = useAppStore((state) => state.spatialGraph);

  const currentNodeName = spatialGraph?.find((n) => n.id === currentNodeId)?.name || 'Unknown';

  const isEnginePhase = ['LATENT', 'MANIFEST', 'TERMINAL', 'TERMINATED', 'ENGINE'].includes(phase);

  return (
    <main className="min-h-screen bg-black selection:bg-white selection:text-black">
      {phase === 'HUB' && <WelcomeScreen />}
      {phase === 'FORGE' && <Forge />}
      {isEnginePhase && <Engine />}
      {phase === 'VOICE' && (
        <TheVoice engineState={{ currentNode: currentNodeName, isShattered }} />
      )}
    </main>
  );
}
