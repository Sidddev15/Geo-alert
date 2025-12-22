export type EventType =
    | 'manual'
    | 'auto'
    | 'night'
    | 'stopped_confirmed'
    | 'emergency'

export type IncomingEvent = {
    lat: number;
    lng: number;
    deviceTs?: string;
    tz?: string;
    eventType: EventType;
    battery?: number;
    notes?: string;
}
