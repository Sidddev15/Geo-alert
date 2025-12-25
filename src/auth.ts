import jwt from 'jsonwebtoken';

const SECRET = process.env.TOKEN_SECRET!;
const TTL = Number(process.env.TOKEN_TTL_SECONDS ?? 300);

if (!SECRET) {
    throw new Error('Missing TOKEN_SECRET');
}

export type EventTokenPayload = {
    scope: 'event:send';
    origin: string;
};

export function issueEventToken(origin: string) {
    const payload: EventTokenPayload = { scope: 'event:send', origin };

    return jwt.sign(payload, SECRET, {
        expiresIn: TTL,
        issuer: 'geo-alert',
    });
}

export function verifyEventToken(token: string, requestOrigin: string): EventTokenPayload {
    const decoded = jwt.verify(token, SECRET, { issuer: 'geo-alert' });

    if (typeof decoded !== 'object') throw new Error('Invalid token');

    const d = decoded as any;

    if (d.scope !== 'event:send') throw new Error('Invalid scope');
    if (typeof d.origin !== 'string') throw new Error('Missing origin claim');
    if (d.origin !== requestOrigin) throw new Error('Origin mismatch');

    return d as EventTokenPayload;
}
