/**
 * Rate Limiter and Queue for external vulnerability APIs (specifically NVD).
 * Adheres strictly to NVD NIST rate ceilings:
 * - With API Key: 50 requests per 30 seconds window (~600ms spacing)
 * - Without API Key: 5 requests per 30 seconds window (~6000ms spacing)
 */
export class NvdRateLimiter {
  private static lastRequestTimestamp = 0;
  private static queue: Array<() => void> = [];
  private static isProcessing = false;

  private static getDelay(): number {
    const hasKey = !!process.env.NVD_API_KEY && process.env.NVD_API_KEY.trim().length > 0;
    return hasKey ? 650 : 6100;
  }

  static async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private static async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastRequestTimestamp;
      const delay = this.getDelay();

      if (elapsed < delay) {
        await new Promise((res) => setTimeout(res, delay - elapsed));
      }

      this.lastRequestTimestamp = Date.now();
      const nextTask = this.queue.shift();
      if (nextTask) {
        await nextTask();
      }
    }

    this.isProcessing = false;
  }
}
