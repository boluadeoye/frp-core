export class EntropyRouter {
  private static userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"
  ];

  /**
   * Generates randomized headers to bypass behavioral fingerprinting.
   */
  static getHeaders(apiKey: string) {
    const randomUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    
    return {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": randomUA,
      "X-FRP-Trace": crypto.randomUUID(),
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache"
    };
  }

  /**
   * Introduces a micro-randomized delay (jitter) to break request patterns.
   */
  static async jitter() {
    const ms = Math.floor(Math.random() * 200) + 50; // 50ms to 250ms
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
