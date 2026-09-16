import { describe, it, expect } from 'vitest';
import {
  resolveSeatAvailabilities,
  buildActiveParticipationContext,
} from './seatAvailability';
import {
  Blueprint,
  MAX_PARTICIPATION_SEAT_DESCRIPTION_LENGTH,
  ParticipationContextSchema,
} from '../types';
import { normalizeBlueprint } from './normalizeBlueprint';

describe('Seat Availability Resolver & Participation Context Builder', () => {
  const baseBlueprint: Blueprint = normalizeBlueprint({
    title: 'Experimental Habitat',
    setting: {
      location: 'Sub-Level 3',
      timePeriod: '2099',
      atmosphere: 'Sterile fluorescent humming',
    },
    cast: [
      {
        id: 'char-protagonist',
        name: 'Dr. Jennifer Hayes',
        role: 'protagonist',
        isUserCharacter: true,
        isEntity: false,
        description: 'Biochemist trapped in the research sector.',
      },
      {
        id: 'char-antagonist',
        name: 'Specimen 404',
        role: 'antagonist',
        isUserCharacter: false,
        isEntity: true,
        description: 'Synthetic predator with thermal vision.',
      },
    ],
  });

  it('correctly resolves all 3 seats when both mortal protagonist and entity antagonist are present', () => {
    const seats = resolveSeatAvailabilities(baseBlueprint);

    expect(seats.protagonist.available).toBe(true);
    expect(seats.protagonist.boundCharacterName).toBe('Dr. Jennifer Hayes');
    expect(seats.protagonist.boundCharacterId).toBe('char-protagonist');

    expect(seats.antagonist.available).toBe(true);
    expect(seats.antagonist.boundCharacterName).toBe('Specimen 404');
    expect(seats.antagonist.boundCharacterId).toBe('char-antagonist');

    expect(seats.director.available).toBe(true);
    expect(seats.director.boundCharacterName).toBe('Director');
  });

  it('marks Protagonist unavailable with reason when no mortal cast member exists', () => {
    const blueprint: Blueprint = normalizeBlueprint({
      ...baseBlueprint,
      cast: [
        {
          id: 'char-antagonist',
          name: 'The Spectral Void',
          role: 'antagonist',
          isEntity: true,
        },
      ],
    });

    const seats = resolveSeatAvailabilities(blueprint);

    expect(seats.protagonist.available).toBe(false);
    expect(seats.protagonist.reason).toBe('No mortal protagonist cast member found in blueprint.');
    expect(seats.protagonist.boundCharacterId).toBeNull();

    expect(seats.antagonist.available).toBe(true);
    expect(seats.director.available).toBe(true);
  });

  it('marks Antagonist unavailable with reason when no entity cast or antagonist perspective exists', () => {
    const blueprint: Blueprint = normalizeBlueprint({
      ...baseBlueprint,
      cast: [
        {
          id: 'char-protagonist',
          name: 'Scout Miller',
          role: 'protagonist',
          isEntity: false,
        },
      ],
    });

    const seats = resolveSeatAvailabilities(blueprint);

    expect(seats.protagonist.available).toBe(true);
    expect(seats.antagonist.available).toBe(false);
    expect(seats.antagonist.reason).toBe(
      'No antagonist entity or opposition authority found in blueprint.'
    );
    expect(seats.director.available).toBe(true);
  });

  it('keeps Director available even when cast list is completely empty', () => {
    const blueprint: Blueprint = normalizeBlueprint({
      ...baseBlueprint,
      cast: [],
    });

    const seats = resolveSeatAvailabilities(blueprint);

    expect(seats.protagonist.available).toBe(false);
    expect(seats.antagonist.available).toBe(false);
    expect(seats.director.available).toBe(true);
  });

  it('buildActiveParticipationContext constructs distinct contexts for each role without mutating blueprint', () => {
    const protagContext = buildActiveParticipationContext(baseBlueprint, 'protagonist');
    expect(protagContext?.mode).toBe('protagonist');
    expect(protagContext?.seat.name).toBe('Dr. Jennifer Hayes');

    const antagContext = buildActiveParticipationContext(baseBlueprint, 'antagonist');
    expect(antagContext?.mode).toBe('antagonist');
    expect(antagContext?.seat.name).toBe('Specimen 404');

    const directorContext = buildActiveParticipationContext(baseBlueprint, 'director');
    expect(directorContext?.mode).toBe('director');
    expect(directorContext?.seat.kind).toBe('director');

    // Verify original blueprint was not mutated
    expect(baseBlueprint.cast).toHaveLength(2);
    expect(baseBlueprint.cast[0].name).toBe('Dr. Jennifer Hayes');
  });

  it('resolves Antagonist seat when Haunted House provenance indicates antagonist mode even without entity flag in cast', () => {
    const blueprint: Blueprint = normalizeBlueprint({
      title: 'Haunted Induction Test',
      setting: { location: 'Derelict Ship' },
      cast: [],
      hauntedHouse: {
        source: 'haunted-house',
        version: 1,
        recommendedParticipationMode: 'antagonist',
        participationContext: {
          mode: 'antagonist',
          seat: {
            kind: 'force',
            name: 'The Ship Entity',
          },
          initialGoal: 'Hunt remaining crew',
          boundedFacts: [],
        },
      },
    });

    const seats = resolveSeatAvailabilities(blueprint);
    expect(seats.antagonist.available).toBe(true);
    expect(seats.antagonist.boundCharacterName).toBe('The Ship Entity');
  });

  it('buildActiveParticipationContext respects explicit resolvedCharacterId for non-default cast members', () => {
    const multiMortalBp = normalizeBlueprint({
      ...baseBlueprint,
      cast: [
        {
          id: 'char-elena',
          name: 'Elena Ward',
          role: 'Historian',
          isEntity: false,
          description: 'Senior archivist',
        },
        {
          id: 'char-marcus',
          name: 'Marcus Gray',
          role: 'Engineer',
          isEntity: false,
          description: 'Surveyor engineer',
        },
      ],
    });

    const context = buildActiveParticipationContext(multiMortalBp, 'protagonist', 'char-marcus');
    expect(context?.mode).toBe('protagonist');
    expect(context?.seat.name).toBe('Marcus Gray');
    expect(context?.seat.description).toBe('Surveyor engineer');
  });

  it('accepts a generated participation-seat summary up to 1,000 characters', () => {
    const summary = 'x'.repeat(MAX_PARTICIPATION_SEAT_DESCRIPTION_LENGTH);
    const blueprint = normalizeBlueprint({
      ...baseBlueprint,
      cast: [
        {
          id: 'char-selected',
          name: 'Selected Mortal',
          role: 'Subject',
          isEntity: false,
          description: summary,
        },
      ],
    });

    const context = buildActiveParticipationContext(
      blueprint,
      'protagonist',
      'char-selected'
    );
    const parsed = ParticipationContextSchema.safeParse(context);

    expect(context?.seat.description).toHaveLength(1000);
    expect(parsed.success).toBe(true);
  });

  it('continues to reject participation-seat summaries over 1,000 characters', () => {
    const parsed = ParticipationContextSchema.safeParse({
      mode: 'protagonist',
      seat: {
        kind: 'protagonist',
        name: 'Selected Mortal',
        description: 'x'.repeat(MAX_PARTICIPATION_SEAT_DESCRIPTION_LENGTH + 1),
      },
      initialGoal: 'Proceed through the enclosure.',
      boundedFacts: [],
    });

    expect(parsed.success).toBe(false);
  });

  it('correctly resolves Villain, Survivor, and Bystander seats for human predator scenario (e.g. American Psycho)', () => {
    const americanPsychoBlueprint: Blueprint = normalizeBlueprint({
      title: 'American Psycho - Manhattan Enclosure',
      setting: {
        location: "Evelyn's Townhouse",
        timePeriod: '1987',
        atmosphere: 'Polished marble, high-end caterers, underlying homicidal dread',
      },
      cast: [
        {
          id: 'char-bateman',
          name: 'Patrick Bateman',
          role: 'Vice President',
          isEntity: false,
          disposition: 'VILLAIN',
          description: 'Wealthy investment banker concealing escalating predatory impulses.',
        },
        {
          id: 'char-evelyn',
          name: 'Evelyn Williams',
          role: 'Fiancée',
          isEntity: false,
          disposition: 'SURVIVOR',
          description: 'Socialite trapped in shallow surface pleasantries.',
        },
        {
          id: 'char-waiter',
          name: 'Catering Waiter',
          role: 'Staff',
          isEntity: false,
          disposition: 'BYSTANDER',
          description: 'Temporary staff trying to get through the evening shift without incident.',
        },
      ],
    });

    const seats = resolveSeatAvailabilities(americanPsychoBlueprint);

    // Villain seat should be available and bound to Bateman
    expect(seats.villain.available).toBe(true);
    expect(seats.villain.boundCharacterName).toBe('Patrick Bateman');
    expect(seats.villain.boundCharacterId).toBe('char-bateman');

    // Survivor seat should be available and bound to Evelyn
    expect(seats.survivor.available).toBe(true);
    expect(seats.survivor.boundCharacterName).toBe('Evelyn Williams');
    expect(seats.survivor.boundCharacterId).toBe('char-evelyn');

    // Bystander seat should be available and bound to Waiter
    expect(seats.bystander.available).toBe(true);
    expect(seats.bystander.boundCharacterName).toBe('Catering Waiter');
    expect(seats.bystander.boundCharacterId).toBe('char-waiter');

    // Director seat is always available
    expect(seats.director.available).toBe(true);

    // Active context for Villain
    const villainContext = buildActiveParticipationContext(
      americanPsychoBlueprint,
      'villain',
      'char-bateman'
    );
    expect(villainContext?.mode).toBe('villain');
    expect(villainContext?.seat.name).toBe('Patrick Bateman');
    expect(villainContext?.authorityContract?.authority).toContain('stalk');
    expect(villainContext?.victimField?.kind).toBe('group');
    expect(villainContext?.victimField?.members?.some((m) => m.name === 'Evelyn Williams')).toBe(true);

    // Active context for Bystander
    const bystanderContext = buildActiveParticipationContext(
      americanPsychoBlueprint,
      'bystander',
      'char-waiter'
    );
    expect(bystanderContext?.mode).toBe('bystander');
    expect(bystanderContext?.seat.name).toBe('Catering Waiter');
    expect(bystanderContext?.initialGoal).toContain('Mind your own business');

    // Active context for Survivor
    const survivorContext = buildActiveParticipationContext(
      americanPsychoBlueprint,
      'survivor',
      'char-evelyn'
    );
    expect(survivorContext?.mode).toBe('survivor');
    expect(survivorContext?.seat.name).toBe('Evelyn Williams');
  });
});
