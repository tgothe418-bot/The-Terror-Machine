const fs = require('fs');
let content = fs.readFileSync('src/store/useAppStore.ts', 'utf8');

// Insert interface method
content = content.replace(
  /isGenerating: boolean;/,
  `isGenerating: boolean;\n  // eslint-disable-next-line @typescript-eslint/no-explicit-any\n  injectGeneratedNode: (sourceNodeId: string, exitDirection: string, newNodeDef: any) => void;`
);

// Insert implementation
content = content.replace(
  /setGenerating: \(status: boolean\) => set\(\{ isGenerating: status \}\),/,
  `setGenerating: (status: boolean) => set({ isGenerating: status }),\n  // eslint-disable-next-line @typescript-eslint/no-explicit-any\n  injectGeneratedNode: (sourceNodeId: string, exitDirection: string, newNodeDef: any) => set((state) => {\n    if (!state.spatialGraph) return state;\n    \n    // Create actual SpatialNode from newNodeDef\n    const newNode: SpatialNode = {\n      id: newNodeDef.id,\n      name: newNodeDef.geometry || "Unmapped Region",\n      description: newNodeDef.hazards?.join(' ') || "",\n      connectedNodes: [],\n      exits: newNodeDef.exitVectors?.map((ev: any) => ({\n        targetNodeId: ev.targetNodeId,\n        description: ev.direction,\n        isOpen: true\n      })) || []\n    } as any;\n    \n    const updatedGraph = state.spatialGraph.map(node => {\n      if (node.id === sourceNodeId && (node as any).exits) {\n        return {\n          ...node,\n          exits: (node as any).exits.map((exit: any) => {\n            if (exit.description === exitDirection) {\n              return { ...exit, targetNodeId: newNodeDef.id };\n            }\n            return exit;\n          })\n        };\n      }\n      return node;\n    });\n    \n    return {\n      spatialGraph: [...updatedGraph, newNode],\n      currentNodeId: newNodeDef.id\n    };\n  }),`
);

fs.writeFileSync('src/store/useAppStore.ts', content);
