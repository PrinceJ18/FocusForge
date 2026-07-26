export type CelebrationType = 'champion' | 'personal_best' | 'rank_up' | 'badge';

export interface CelebrationItem {
  id: string;
  type: CelebrationType;
  payload: any;
}

const PRIORITY_ORDER: Record<CelebrationType, number> = {
  champion: 1,
  personal_best: 2,
  rank_up: 3,
  badge: 4,
};

class CelebrationQueue {
  private queue: CelebrationItem[] = [];
  private activeCelebration: CelebrationItem | null = null;
  private listeners: Array<(active: CelebrationItem | null) => void> = [];

  public enqueue(type: CelebrationType, payload: any): void {
    // Avoid duplicate items in queue
    const exists = this.queue.some(item => item.type === type) || (this.activeCelebration?.type === type);
    if (exists) return;

    const newItem: CelebrationItem = {
      id: `${type}_${Date.now()}`,
      type,
      payload,
    };

    this.queue.push(newItem);
    // Sort queue by priority
    this.queue.sort((a, b) => PRIORITY_ORDER[a.type] - PRIORITY_ORDER[b.type]);

    this.processQueue();
  }

  public dequeue(): void {
    this.activeCelebration = null;
    this.processQueue();
  }

  private processQueue(): void {
    if (!this.activeCelebration && this.queue.length > 0) {
      this.activeCelebration = this.queue.shift() || null;
      this.notify();
    } else if (!this.activeCelebration) {
      this.notify();
    }
  }

  public subscribe(listener: (active: CelebrationItem | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.activeCelebration);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.activeCelebration));
  }

  public clear(): void {
    this.queue = [];
    this.activeCelebration = null;
    this.notify();
  }
}

export const celebrationQueue = new CelebrationQueue();
