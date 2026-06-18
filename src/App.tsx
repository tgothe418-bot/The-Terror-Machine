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
  const phase = useAppStore((state) => state.phase);
  const currentNodeId = useAppStore((state) => state.currentNodeId);
  const isShattered = useAppStore((state) => state.isShattered);
  const spatialGraph = useAppStore((state) => state.spatialGraph);

  const currentNodeName = spatialGraph?.find(n => n.id === currentNodeId)?.name || 'Unknown';

  return (
    <main className="min-h-screen bg-black selection:bg-white selection:text-black">
      {phase === 'hub' && <WelcomeScreen />}
      {phase === 'forge' && <Forge />}
      {phase === 'engine' && <Engine />}
      {phase === 'voice' && <TheVoice engineState={{ currentNode: currentNodeName, isShattered }} />}
    </main>
  );
}

