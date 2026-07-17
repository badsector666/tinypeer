type EventHandler = (...args: any[]) => void
type EventMap = Map<string, Set<EventHandler>>

export function createEmitter() {
  const events: EventMap = new Map()

  return {
    on(event: string, handler: EventHandler): void {
      if (!events.has(event)) {
        events.set(event, new Set())
      }
      events.get(event)!.add(handler)
    },

    off(event: string, handler: EventHandler): void {
      const handlers = events.get(event)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          events.delete(event)
        }
      }
    },

    emit(event: string, ...args: any[]): void {
      const handlers = events.get(event)
      if (handlers) {
        handlers.forEach(handler => {
          handler(...args)
        })
      }
    },

    clearAll(): void {
      events.clear()
    },
  }
}

