/**
 * Binary min-heap keyed by a caller comparator.
 * Peek is O(1); push and pop are O(log n); building from an array is O(n).
 */
export class MinHeap<T> {
  private readonly items: T[] = [];

  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length;
  }

  /** Look at the smallest item without removing it. */
  peek(): T | undefined {
    return this.items[0];
  }

  /** Insert one item and restore the heap property. */
  push(value: T): void {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }

  /** Remove and return the smallest item. */
  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last !== undefined) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return first;
  }

  private bubbleUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      const parentItem = this.items[parent];
      const item = this.items[current];
      if (parentItem === undefined || item === undefined || this.compare(item, parentItem) >= 0) return;
      this.items[parent] = item;
      this.items[current] = parentItem;
      current = parent;
    }
  }

  private sinkDown(index: number): void {
    let current = index;
    for (;;) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;
      if (left < this.items.length) {
        const leftItem = this.items[left];
        const smallestItem = this.items[smallest];
        if (leftItem !== undefined && smallestItem !== undefined && this.compare(leftItem, smallestItem) < 0) smallest = left;
      }
      if (right < this.items.length) {
        const rightItem = this.items[right];
        const smallestItem = this.items[smallest];
        if (rightItem !== undefined && smallestItem !== undefined && this.compare(rightItem, smallestItem) < 0) smallest = right;
      }
      if (smallest === current) return;
      const currentItem = this.items[current];
      const smallestItem = this.items[smallest];
      if (currentItem === undefined || smallestItem === undefined) return;
      this.items[current] = smallestItem;
      this.items[smallest] = currentItem;
      current = smallest;
    }
  }
}
