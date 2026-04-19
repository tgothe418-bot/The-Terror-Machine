import { expect, test, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { useForgeStore } from './useForgeStore';

beforeEach(() => {
  // Reset the store before each test run
  useForgeStore.setState({ selectedCharacters: [] });
});

test('should add a character to the cast', () => {
  // 1. Arrange: Get the action from the store
  const { addCharacterToCast } = useForgeStore.getState();
  
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
  addCharacterToCast(testChar);

  // 3. Assert: Verify the state changed correctly
  const state = useForgeStore.getState();
  expect(state.selectedCharacters.length).toBe(1);
  expect(state.selectedCharacters[0].name).toBe('Test Victim');
});
