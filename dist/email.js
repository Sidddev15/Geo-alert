import nodemailer from 'nodemailer';
import { config } from './config.js';
function mapsLinks(lat, lng) {
    return {
        apple: `https://maps.apple.com/?ll=${lat},${lng}`,
        google: `https://www.google.com/maps?q=${lat},${lng}`,
    };
}
export function renderSubject(e) {
    const base = e.eventType === 'emergency'
        ? '🚨 EMERGENCY'
        : 'Location Update';
    const ts = e.deviceTs ?? 'Now';
    return `${base} – ${ts} IST`;
}
export function renderBody(e) {
    const { apple, google } = mapsLinks(e.lat, e.lng);
    const battery = e.battery == null
        ? 'N/A'
        : e.battery <= 1
            ? `${Math.round(e.battery * 100)}%`
            : `${Math.round(e.battery)}%`;
    return `
Event Type: ${e.eventType}
Time (IST): ${e.deviceTs ?? 'Not provided'}
Latitude: ${e.lat}
Longitude: ${e.lng}

Apple Maps:
${apple}

Google Maps:
${google}

Battery: ${battery}
Notes: ${e.notes ?? '-'}

—
Sent via Geo Alert
`.trim();
}
export async function sendEmail(e) {
    const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
        },
    });
    const to = [
        config.recipients.primaryTo,
        ...config.recipients.extraTo,
    ].filter(Boolean);
    await transporter.sendMail({
        from: config.smtp.from,
        to,
        cc: config.recipients.cc.length ? config.recipients.cc : undefined,
        bcc: config.recipients.bcc.length ? config.recipients.bcc : undefined,
        subject: renderSubject(e),
        text: renderBody(e),
    });
}
