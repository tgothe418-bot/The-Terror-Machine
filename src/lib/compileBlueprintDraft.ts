import { Blueprint } from '../types';
import { normalizeBlueprint } from './normalizeBlueprint';
import {
  compileForgeDraft,
  compileForgeDraftOrThrow,
  validateForgeDraft,
  ForgeCompilationError,
} from './forgeCompiler';
import { ForgeReviewArtifact, ForgeCompilationContext } from '../types/forge';

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
 * Both revisions must be explicitly supplied.
 */
export function prepareBlueprintExport(
  rawDraft: unknown,
  context: ForgeCompilationContext
): BlueprintExportArtifact {
  return compileForgeDraftOrThrow(rawDraft, context);
}
