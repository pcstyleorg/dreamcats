import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck } from '@/lib/game-logic';

describe('createDeck', () => {
  it('creates a deck with 54 total cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(54);
  });

  it('has correct distribution of normal cards (values 0-8: 4 each)', () => {
    const deck = createDeck();
    
    for (let value = 0; value <= 8; value++) {
      const count = deck.filter(c => c.value === value && !c.isSpecial).length;
      expect(count).toBe(4);
    }
  });

  it('has 9 copies of value 9', () => {
    const deck = createDeck();
    const nines = deck.filter(c => c.value === 9 && !c.isSpecial);
    expect(nines).toHaveLength(9);
  });

  it('has 3 copies of each special card type', () => {
    const deck = createDeck();
    
    const take2 = deck.filter(c => c.isSpecial && c.specialAction === 'take_2');
    const peek1 = deck.filter(c => c.isSpecial && c.specialAction === 'peek_1');
    const swap2 = deck.filter(c => c.isSpecial && c.specialAction === 'swap_2');
    
    expect(take2).toHaveLength(3);
    expect(peek1).toHaveLength(3);
    expect(swap2).toHaveLength(3);
  });

  it('assigns unique IDs to all cards', () => {
    const deck = createDeck();
    const ids = deck.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(deck.length);
  });

  it('special cards have correct values (take_2=5, peek_1=6, swap_2=7)', () => {
    const deck = createDeck();
    
    const take2Cards = deck.filter(c => c.specialAction === 'take_2');
    const peek1Cards = deck.filter(c => c.specialAction === 'peek_1');
    const swap2Cards = deck.filter(c => c.specialAction === 'swap_2');
    
    expect(take2Cards.every(c => c.value === 5)).toBe(true);
    expect(peek1Cards.every(c => c.value === 6)).toBe(true);
    expect(swap2Cards.every(c => c.value === 7)).toBe(true);
  });

  it('all normal cards have isSpecial = false', () => {
    const deck = createDeck();
    const normalCards = deck.filter(c => !c.isSpecial);
    
    expect(normalCards.every(c => c.specialAction === undefined)).toBe(true);
  });
});

describe('shuffleDeck', () => {
  it('returns a deck with the same length', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(deck.length);
  });

  it('contains all the same cards (by id)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    
    const originalIds = new Set(deck.map(c => c.id));
    const shuffledIds = new Set(shuffled.map(c => c.id));
    
    expect(shuffledIds).toEqual(originalIds);
  });

  it('does not modify the original deck', () => {
    const deck = createDeck();
    const originalOrder = deck.map(c => c.id);
    
    shuffleDeck(deck);
    
    const newOrder = deck.map(c => c.id);
    expect(newOrder).toEqual(originalOrder);
  });

  it('produces different orders on multiple shuffles (statistical test)', () => {
    const deck = createDeck();
    
    // Shuffle multiple times and check that not all results are identical
    const results = Array.from({ length: 5 }, () => 
      shuffleDeck(deck).map(c => c.id).join(',')
    );
    
    const uniqueResults = new Set(results);
    // With 54 cards, the probability of getting the same order twice is negligible
    expect(uniqueResults.size).toBeGreaterThan(1);
  });
});

describe('deck composition totals', () => {
  it('sums to correct total: 36 normal (0-8) + 9 nines + 9 special = 54', () => {
    const deck = createDeck();
    
    const normal0to8 = deck.filter(c => !c.isSpecial && c.value >= 0 && c.value <= 8).length;
    const nines = deck.filter(c => !c.isSpecial && c.value === 9).length;
    const special = deck.filter(c => c.isSpecial).length;
    
    expect(normal0to8).toBe(36); // 4 each for 0-8 = 36
    expect(nines).toBe(9);
    expect(special).toBe(9); // 3 each for 3 types
    expect(normal0to8 + nines + special).toBe(54);
  });
});
