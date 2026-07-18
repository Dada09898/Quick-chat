export class RetryManager {
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(maxRetries: number = 3, baseDelayMs: number = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        if (attempt >= this.maxRetries) throw error;
        const delay = this.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries exceeded");
  }
}
