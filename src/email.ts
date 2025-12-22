import nodemailer from 'nodemailer';
import { config } from './config.js';
import { IncomingEvent } from './types.js';

function mapsLinks(lat: number, lng: number) {
    return {
        apple: `https://maps.apple.com/?ll=${lat},${lng}`,
        google: `https://www.google.com/maps?q=${lat},${lng}`,
    };
}

function batteryString(b?: number) {
    if (b == null) return 'N/A';
    return b <= 1 ? `${Math.round(b * 100)}%` : `${Math.round(b)}%`;
}

/* ---------------- NORMAL ---------------- */

function normalSubject(e: IncomingEvent) {
    return `Location Update – ${e.deviceTs ?? 'Now'} IST`;
}

function normalBody(e: IncomingEvent) {
    const { apple, google } = mapsLinks(e.lat, e.lng);

    return `
Event Type: ${e.eventType}
Time (IST): ${e.deviceTs ?? 'Not provided'}

Latitude: ${e.lat}
Longitude: ${e.lng}

Apple Maps:
${apple}

Google Maps:
${google}

Battery: ${batteryString(e.battery)}
Notes: ${e.notes ?? '-'}

—
Sent via Geo Alert
`.trim();
}

/* ---------------- EMERGENCY ---------------- */

function emergencySubject(e: IncomingEvent) {
    return `🚨 EMERGENCY – LOCATION SHARED – ${e.deviceTs ?? 'NOW'}`;
}

function emergencyBody(e: IncomingEvent) {
    const { apple, google } = mapsLinks(e.lat, e.lng);

    return `
🚨🚨🚨 EMERGENCY ALERT 🚨🚨🚨

I NEED HELP.

My current location is below.

Time (IST): ${e.deviceTs ?? 'Not provided'}

Latitude: ${e.lat}
Longitude: ${e.lng}

OPEN LOCATION:
Apple Maps:
${apple}

Google Maps:
${google}

Battery: ${batteryString(e.battery)}
Notes: ${e.notes ?? 'No additional notes'}

PLEASE CHECK ON ME IMMEDIATELY.

—
Sent via Geo Alert
`.trim();
}

/* ---------------- SEND ---------------- */

export async function sendEmail(e: IncomingEvent) {
    const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
        },
    });

    const isEmergency = e.eventType === 'emergency';

    const to =
        isEmergency && config.recipients.emergencyTo.length
            ? config.recipients.emergencyTo
            : [
                config.recipients.primaryTo,
                ...config.recipients.extraTo,
            ].filter(Boolean);

    await transporter.sendMail({
        from: config.smtp.from,
        to,
        cc: isEmergency ? undefined : config.recipients.cc,
        bcc: isEmergency ? undefined : config.recipients.bcc,
        subject: isEmergency
            ? emergencySubject(e)
            : normalSubject(e),
        text: isEmergency
            ? emergencyBody(e)
            : normalBody(e),
        headers: isEmergency
            ? {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                Importance: 'High',
            }
            : undefined,
    });
}
