import { describe, expect, it } from 'vitest';
import { createCastInteractionReceipt } from './castInteraction';

describe('createCastInteractionReceipt', () => {
  it('returns RESPONDED when addressed and responding character IDs match', () => {
    const receipt = createCastInteractionReceipt({
      addressedCharacterId: 'char-a',
      respondingCharacterId: 'char-a',
    });

    expect(receipt).toEqual({
      version: 1,
      addressedCharacterId: 'char-a',
      respondingCharacterId: 'char-a',
      outcome: 'RESPONDED',
    });
  });

  it('returns ADDRESS_UNANSWERED when addressed is present but responding is null or undefined', () => {
    const receiptNull = createCastInteractionReceipt({
      addressedCharacterId: 'char-a',
      respondingCharacterId: null,
    });

    expect(receiptNull).toEqual({
      version: 1,
      addressedCharacterId: 'char-a',
      respondingCharacterId: null,
      outcome: 'ADDRESS_UNANSWERED',
    });

    const receiptUndefined = createCastInteractionReceipt({
      addressedCharacterId: 'char-a',
    });

    expect(receiptUndefined).toEqual({
      version: 1,
      addressedCharacterId: 'char-a',
      respondingCharacterId: null,
      outcome: 'ADDRESS_UNANSWERED',
    });
  });

  it('returns UNSOLICITED_DIALOGUE when addressed is null or undefined but responding is present', () => {
    const receiptNull = createCastInteractionReceipt({
      addressedCharacterId: null,
      respondingCharacterId: 'char-b',
    });

    expect(receiptNull).toEqual({
      version: 1,
      addressedCharacterId: null,
      respondingCharacterId: 'char-b',
      outcome: 'UNSOLICITED_DIALOGUE',
    });

    const receiptUndefined = createCastInteractionReceipt({
      respondingCharacterId: 'char-b',
    });

    expect(receiptUndefined).toEqual({
      version: 1,
      addressedCharacterId: null,
      respondingCharacterId: 'char-b',
      outcome: 'UNSOLICITED_DIALOGUE',
    });
  });

  it('returns MISMATCH when addressed and responding IDs are distinct non-null values', () => {
    const receipt = createCastInteractionReceipt({
      addressedCharacterId: 'char-a',
      respondingCharacterId: 'char-b',
    });

    expect(receipt).toEqual({
      version: 1,
      addressedCharacterId: 'char-a',
      respondingCharacterId: 'char-b',
      outcome: 'MISMATCH',
    });
  });

  it('returns NONE when both addressed and responding IDs are null or undefined', () => {
    const receiptNull = createCastInteractionReceipt({
      addressedCharacterId: null,
      respondingCharacterId: null,
    });

    expect(receiptNull).toEqual({
      version: 1,
      addressedCharacterId: null,
      respondingCharacterId: null,
      outcome: 'NONE',
    });

    const receiptEmpty = createCastInteractionReceipt({});

    expect(receiptEmpty).toEqual({
      version: 1,
      addressedCharacterId: null,
      respondingCharacterId: null,
      outcome: 'NONE',
    });
  });

  it('trims leading/trailing whitespace and normalizes blank strings to null', () => {
    const receiptTrimmed = createCastInteractionReceipt({
      addressedCharacterId: '  char-a  ',
      respondingCharacterId: '  char-a  ',
    });

    expect(receiptTrimmed).toEqual({
      version: 1,
      addressedCharacterId: 'char-a',
      respondingCharacterId: 'char-a',
      outcome: 'RESPONDED',
    });

    const receiptBlankAddressed = createCastInteractionReceipt({
      addressedCharacterId: '   ',
      respondingCharacterId: 'char-b',
    });

    expect(receiptBlankAddressed).toEqual({
      version: 1,
      addressedCharacterId: null,
      respondingCharacterId: 'char-b',
      outcome: 'UNSOLICITED_DIALOGUE',
    });

    const receiptBlankBoth = createCastInteractionReceipt({
      addressedCharacterId: '   ',
      respondingCharacterId: ' \t\n ',
    });

    expect(receiptBlankBoth).toEqual({
      version: 1,
      addressedCharacterId: null,
      respondingCharacterId: null,
      outcome: 'NONE',
    });
  });
});
