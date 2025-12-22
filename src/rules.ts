import { IncomingEvent } from './types.js';
import { getLastEvent, countToday } from './storage.js';

const COOLDOWN_MIN = 10;
const DAILY_CAP = 50;

export function normalizeBattery(b?: number): number | null {
    if (b == null) return null;
    if (b <= 1) return Math.max(0, Math.min(1, b));
    if (b <= 100) return Math.max(0, Math.min(1, b / 100));
    return null;
}

export function shouldSendEmail(
    e: IncomingEvent,
    isoNow: string
): { ok: boolean; reason?: string } {
    if (e.eventType === 'emergency') {
        return { ok: true };
    }

    const daily = countToday(isoNow);
    if (daily >= DAILY_CAP) {
        return { ok: false, reason: 'Daily cap reached' };
    }

    const last = getLastEvent();
    if (last) {
        const diffMin =
            (Date.parse(isoNow) - Date.parse(last.createdAtIso)) / 60000;

        if (diffMin < COOLDOWN_MIN) {
            return {
                ok: false,
                reason: `Cooldown (${diffMin.toFixed(1)} min since last alert)`,
            };
        }
    }

    return { ok: true };
}
