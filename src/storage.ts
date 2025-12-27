import { prisma } from './db.js';

export async function insertEvent(e: {
    id: string;
    createdAtIso: string;
    lat: number;
    lng: number;
    eventType: string;
    battery: number | null;
    notes: string | null;
}) {
    await prisma.event.create({
        data: {
            id: e.id,
            createdAtIso: new Date(e.createdAtIso),
            lat: e.lat,
            lng: e.lng,
            eventType: e.eventType,
            battery: e.battery,
            notes: e.notes,
        },
    });
}

export async function listEvents(opts: {
    limit: number;
    beforeIso?: string;
}) {
    const take = Math.max(1, Math.min(opts.limit, 200));

    return prisma.event.findMany({
        where: opts.beforeIso
            ? { createdAtIso: { lt: new Date(opts.beforeIso) } }
            : undefined,
        orderBy: { createdAtIso: 'desc' },
        take,
    });
}

export async function getLastEvent() {
    return prisma.event.findFirst({
        orderBy: { createdAtIso: 'desc' },
    });
}

export async function countToday(isoNow: string) {
    const start = new Date(isoNow.slice(0, 10));
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return prisma.event.count({
        where: {
            createdAtIso: {
                gte: start,
                lt: end,
            },
        },
    });
}
