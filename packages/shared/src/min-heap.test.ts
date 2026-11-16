import { describe, expect, it } from 'vitest';
import { MinHeap } from './min-heap';

type Item = { id: string; at: number };

describe('MinHeap', () => {
  const byTime = (a: Item, b: Item) => a.at - b.at;

  it('pops items in ascending order regardless of insertion order', () => {
    const heap = new MinHeap<Item>(byTime);
    [{ id: 'c', at: 30 }, { id: 'a', at: 10 }, { id: 'd', at: 40 }, { id: 'b', at: 20 }].forEach((item) => heap.push(item));
    expect([heap.pop()?.id, heap.pop()?.id, heap.pop()?.id, heap.pop()?.id]).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps the smallest item on top and reports its size', () => {
    const heap = new MinHeap<Item>(byTime);
    expect(heap.peek()).toBeUndefined();
    heap.push({ id: 'late', at: 100 });
    heap.push({ id: 'early', at: 5 });
    expect(heap.size).toBe(2);
    expect(heap.peek()?.id).toBe('early');
  });

  it('returns undefined when empty', () => {
    expect(new MinHeap<Item>(byTime).pop()).toBeUndefined();
  });
});
