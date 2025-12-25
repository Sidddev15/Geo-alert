import jwt from 'jsonwebtoken';

const SECRET = process.env.TOKEN_SECRET!;
const TTL = Number(process.env.TOKEN_TTL_SECONDS ?? 300);

if (!SECRET) {
    throw new Error('Missing TOKEN_SECRET');
}

export type EventTokenPayload = {
    scope: 'event:send';
};

export function issueEventToken() {
    const payload: EventTokenPayload = { scope: 'event:send' };

    return jwt.sign(payload, SECRET, {
        expiresIn: TTL,
        issuer: 'geo-alert',
    });
}

export function verifyEventToken(token: string): EventTokenPayload {
    const decoded = jwt.verify(token, SECRET, {
        issuer: 'geo-alert',
    });

    if (
        typeof decoded !== 'object' ||
        (decoded as any).scope !== 'event:send'
    ) {
        throw new Error('Invalid token scope');
    }

    return decoded as EventTokenPayload;
}
