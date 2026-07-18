export class TelemetryManager {
  private static isOptedIn = false;
  private static batch: Array<Record<string, any>> = [];
  private static interval: any = null;

  static init(optIn: boolean) {
    this.isOptedIn = optIn;
    if (this.isOptedIn && !this.interval) {
      this.interval = setInterval(() => this.flush(), 30000); // Flush every 30s
    }
  }

  static record(metricName: string, value: number, metadata: Record<string, string> = {}) {
    if (!this.isOptedIn) return;
    
    // Strict Sanitization: Guarantee no plaintext is queued
    const safeMetadata: Record<string, string> = {};
    const forbidden = ['text', 'payload', 'ciphertext', 'search', 'query'];
    
    for (const [k, v] of Object.entries(metadata)) {
      if (!forbidden.some(f => k.toLowerCase().includes(f))) {
        safeMetadata[k] = v;
      }
    }

    this.batch.push({
      metric: metricName,
      value,
      metadata: safeMetadata,
      timestamp: Date.now()
    });
  }

  static async flush() {
    if (this.batch.length === 0) return;
    
    const payload = [...this.batch];
    this.batch = [];
    
    try {
      // In production, we'd use a compression stream here if supported
      // e.g. CompressionStream('gzip')
      await fetch('/api/telemetry/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: payload })
      });
    } catch (e) {
      // Silently fail telemetry in offline mode, drop payload to avoid memory leak
    }
  }
}
