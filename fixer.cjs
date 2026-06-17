const fs = require('fs');

const files = [
  'src/services/geminiService.ts',
  'src/components/hub/TheVoice.tsx',
  'src/components/hub/WelcomeScreen.tsx',
  'src/components/forge/MatrixSelector.tsx',
  'src/components/forge/Forge.tsx',
  'src/components/forge/ArchitectChat.tsx',
  'src/components/forge/BlueprintTester.tsx',
  'src/components/forge/FileDropzone.tsx',
];

const actionNames = new Set([
  'addCastMember', 'updateCastMember', 'removeCastMember', 'resetStore', 'addArchitectMessage', 'clearArchitectChat',
  'initializeDraft', 'updateDraft', 'removeReference', 'setWho', 'setWhat', 'setWhere', 'setWhen', 'setWhyHow',
  'clearForgeInputs', 'addMessage', 'clearHistory', 'setAvailableReferenceCharacters', 'addCharacterToCast',
  'removeCharacterFromCast', 'updateCharacterDetails', 'setHasReferenceMaterial', 'setForgePhase', 'setSummaryContext',
  'setExtractedSetting', 'setExtractedThreat', 'setExtractedStyle', 'addReferenceMaterials', 'removeReferenceMaterial'
]);

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let code = fs.readFileSync(f, 'utf8');
  
  // 1. Fix the import
  code = code.replace(/import\s+\{([^}]*)useForgeStore([^}]*)\}\s+from\s+['"]([^'"]+)['"]/, function(match, p1, p2, path) {
    return 'import { useForgeState, forgeActions ' + p1 + p2 + '} from \'' + path + '\'';
  });

  // 2. Replace the hook name
  code = code.replace(/useForgeStore/g, 'useForgeState');

  // Let's identify the lines doing: `const { ..., updateDraft, ... } = useForgeState(...);` and split or replace.
  // A simpler way is to replace destructuring from the hook that extracts actions. 
  // We can just add `const { ...actions... } = forgeActions;`
  
  fs.writeFileSync(f, code);
});
