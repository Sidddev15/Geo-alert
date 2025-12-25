function parseAllowedOrigins(raw: string | undefined): string[] {
    return (raw ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

export const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

export function requireAllowedOrigin(origin: string | undefined) {
    // Browser fetch will send Origin. Curl typically won't.
    if (!origin) {
        throw new Error('Missing Origin');
    }
    if (!allowedOrigins.includes(origin)) {
        throw new Error('Origin not allowed');
    }
    return origin;
}
