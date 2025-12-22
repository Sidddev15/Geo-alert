import 'dotenv/config';

function must(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

export const config = {
    port: Number(process.env.PORT ?? 8000),
    apiKey: must('API_KEY'),
};
