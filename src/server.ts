import Fastify from "fastify";
import { config } from "./config.js";
import { z } from 'zod';

const app = Fastify({ logger: true });

// Schema
const EventSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    deviceTs: z.string().optional(),
    tz: z.string().optional(),
    eventType: z.enum([
        'manual',
        'auto',
        'night',
        'stopped_confirmed',
        'emergency',
    ]),
    battery: z.number().optional(),
    notes: z.string().max(500).optional(),
});

// Routes
app.get('/health', async () => ({ ok: true }));

app.post('/v1/events', async (req, reply) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== config.apiKey) {
        return reply.code(401).send({
            ok: false,
            error: 'Unauthorized'
        });
    }

    // validation
    const parsed = EventSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.code(400).send({
            ok: false,
            error: parsed.error.flatten(),
        });
    }

    const event = parsed.data;

    // For new just log
    req.log.info({ event }, 'Incoming Location Event');

    return reply.send({
        ok: true,
        accepted: true,
    });
});

// START
app.listen({ port: config.port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
});
