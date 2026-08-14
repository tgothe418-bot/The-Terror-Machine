import { Blueprint } from '../types';
import { normalizeBlueprint } from './normalizeBlueprint';

export interface BlueprintExportArtifact {
  blueprint: Blueprint;
  json: string;
  fileName: string;
}

export function compileBlueprintDraft(rawDraft: unknown): Blueprint {
  return normalizeBlueprint(rawDraft);
}

export function prepareBlueprintExport(rawDraft: unknown): BlueprintExportArtifact {
  const compiled = compileBlueprintDraft(rawDraft);
  const json = JSON.stringify(compiled, null, 2);

  const titleStr = compiled.identity?.title || compiled.title || 'blueprint';
  const safeTitle = titleStr.replace(/[\s\W]+/g, '_').toLowerCase();

  const references = compiled.references;
  const safeRefs =
    references && Array.isArray(references) && references.length > 0
      ? references.map((r: string) => r.replace(/[\s\W]+/g, '_').toLowerCase()).join('_') + '_'
      : '';

  const fileName = `${safeRefs}${safeTitle}.json`;

  return {
    blueprint: compiled,
    json,
    fileName,
  };
}
