import { describe, it, expect, beforeEach } from 'vitest';
import { useCollectionStore } from './collectionStore.ts';

describe('Collection Store', () => {
  beforeEach(() => {
    useCollectionStore.getState().clearCollection();
  });

  it('increments and decrements card count by finish', () => {
    const store = useCollectionStore.getState();
    store.incrementCard('BT01-001', 'normal');
    expect(useCollectionStore.getState().cards['BT01-001']?.normal).toBe(1);

    store.incrementCard('BT01-001', 'foil');
    expect(useCollectionStore.getState().cards['BT01-001']?.foil).toBe(1);

    store.decrementCard('BT01-001', 'normal');
    expect(useCollectionStore.getState().cards['BT01-001']?.normal).toBe(0);
  });

  it('calculates total owned cards for a given card id', () => {
    const store = useCollectionStore.getState();
    store.setCardCount('BT01-002', 'normal', 3);
    store.setCardCount('BT01-002', 'foil', 2);
    store.setCardCount('BT01-002', 'secret', 1);

    expect(store.getCardTotal('BT01-002')).toBe(6);
  });
});
