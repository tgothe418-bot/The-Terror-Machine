import { expect, test, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { useForgeStoreInternal, forgeActions, getForgeState } from './useForgeStore';

beforeEach(() => {
  // Reset the store before each test run
  useForgeStoreInternal.setState({ selectedCharacters: [] });
});

test('should add a character to the cast', () => {
  // 1. Arrange: Get the action from the store
  const { addCharacterToCast } = forgeActions;
  
  const testChar = {
    id: '1',
    name: 'Test Victim',
    role: 'Target',
    personality: 'Anxious',
    goals: 'Survive',
    traits: ['Nervous'],
    isUserCharacter: false
  };

  // 2. Act: Execute the function
  addCharacterToCast(testChar as any);

  // 3. Assert: Verify the state changed correctly
  const state = getForgeState();
  expect(state.selectedCharacters.length).toBe(1);
  expect(state.selectedCharacters[0].name).toBe('Test Victim');
});
