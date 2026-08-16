import { Blueprint } from '../types';
import { normalizeBlueprint } from './normalizeBlueprint';
import {
  compileForgeDraft,
  compileForgeDraftOrThrow,
  validateForgeDraft,
  ForgeCompilationError,
} from './forgeCompiler';
import { ForgeReviewArtifact } from '../types/forge';

export {
  compileForgeDraft,
  compileForgeDraftOrThrow,
  validateForgeDraft,
  ForgeCompilationError,
};

export type BlueprintExportArtifact = ForgeReviewArtifact;

/**
 * Normalizes a raw draft or partial object into the canonical Blueprint structure.
 */
export function compileBlueprintDraft(rawDraft: unknown): Blueprint {
  return normalizeBlueprint(rawDraft);
}

/**
 * Prepares an immutable Blueprint export review artifact.
 * Validates the draft against the canonical Forge compilation rules first.
 */
export function prepareBlueprintExport(rawDraft: unknown): BlueprintExportArtifact {
  return compileForgeDraftOrThrow(rawDraft);
}
