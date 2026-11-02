/**
 * Simple Pub/Sub Event Bus
 */

class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(eventName, listener) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(listener);
    return () => this.off(eventName, listener);
  }

  off(eventName, listener) {
    if (this.events.has(eventName)) {
      this.events.get(eventName).delete(listener);
    }
  }

  emit(eventName, data) {
    if (this.events.has(eventName)) {
      for (const listener of this.events.get(eventName)) {
        try {
          listener(data);
        } catch (err) {
          console.error(`Error in event listener for ${eventName}:`, err);
        }
      }
    }
  }
}

export const eventBus = new EventEmitter();

