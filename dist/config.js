import dotenv from 'dotenv';
// Load .env.local first (dev), then fall back to default .env
dotenv.config({ path: '.env.local' });
dotenv.config();
function must(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing env ${name}`);
    return v;
}
export const config = {
    port: Number(process.env.PORT ?? 8000),
    apiKey: must('API_KEY'),
    smtp: {
        host: must('SMTP_HOST'),
        port: Number(must('SMTP_PORT')),
        secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
        user: must('SMTP_USER'),
        pass: must('SMTP_PASS'),
        from: must('EMAIL_FROM'),
    },
    recipients: {
        primaryTo: must('PRIMARY_TO'),
        extraTo: (process.env.EXTRA_TO ?? '').split(',').map(s => s.trim()).filter(Boolean),
        cc: (process.env.CC ?? '').split(',').map(s => s.trim()).filter(Boolean),
        bcc: (process.env.BCC ?? '').split(',').map(s => s.trim()).filter(Boolean)
    },
};
