export type UiModal = "cv" | "about";

export type UiOpenEvent = {
  modal: UiModal;
};

export type CombatNameInputOpenEvent = {
  value: string;
  maxLength: number;
};

export type CombatNameInputChangeEvent = {
  value: string;
};

type EventsMap = {
  "ui:open": UiOpenEvent;
  "ui:close": undefined;
  "combat:name-input:open": CombatNameInputOpenEvent;
  "combat:name-input:change": CombatNameInputChangeEvent;
  "combat:name-input:submit": undefined;
  "combat:name-input:close": undefined;
};

type Handler<T> = (payload: T) => void;
type EventPayload = EventsMap[keyof EventsMap];

class EventBus {
  private listeners = new Map<keyof EventsMap, Set<Handler<EventPayload>>>();

  on<K extends keyof EventsMap>(event: K, handler: Handler<EventsMap[K]>) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as Handler<EventPayload>);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventsMap>(event: K, handler: Handler<EventsMap[K]>) {
    this.listeners.get(event)?.delete(handler as Handler<EventPayload>);
  }

  emit<K extends keyof EventsMap>(event: K, payload: EventsMap[K]) {
    this.listeners
      .get(event)
      ?.forEach((handler) => handler(payload as EventPayload));
  }
}

export const eventBus = new EventBus();
