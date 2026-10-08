/**
 * Real-Time Telemetry SSE Hub
 * Broadcasts sub-5ms security events and threat alerts to connected dashboards.
 */
class SSEHub {
  constructor() {
    this.clients = new Set();
    this.recentEventsBuffer = [];
    this.MAX_BUFFER = 25;

    // Keep-alive heartbeat ping every 15 seconds
    setInterval(() => {
      this.heartbeat();
    }, 15000);
  }

  /**
   * Registers a new SSE client connection
   * @param {import('express').Response} res 
   */
  register(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no'
    });

    res.write('event: connected\ndata: {"status":"connected","timestamp":' + Date.now() + '}\n\n');

    this.clients.add(res);

    // Send recent buffered events so UI is immediately populated
    if (this.recentEventsBuffer.length > 0) {
      for (const item of this.recentEventsBuffer) {
        res.write(`event: telemetry\ndata: ${JSON.stringify(item)}\n\n`);
      }
    }

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Broadcasts a telemetry event to all connected dashboard clients
   * @param {string} eventName 
   * @param {object} payload 
   */
  broadcast(eventName, payload) {
    const formatted = {
      ...payload,
      _broadcast_at: new Date().toISOString()
    };

    // Buffer latest events
    this.recentEventsBuffer.push(formatted);
    if (this.recentEventsBuffer.length > this.MAX_BUFFER) {
      this.recentEventsBuffer.shift();
    }

    const dataString = `event: ${eventName}\ndata: ${JSON.stringify(formatted)}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(dataString);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  heartbeat() {
    for (const client of this.clients) {
      try {
        client.write(': ping\n\n');
      } catch {
        this.clients.delete(client);
      }
    }
  }

  getActiveClientCount() {
    return this.clients.size;
  }
}

export const sseHub = new SSEHub();
