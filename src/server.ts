import Fastify from "fastify";
import { z } from "zod";
import { config } from "./config.js";
import { sendEmail } from "./email.js";
import { randomUUID } from "node:crypto";
import { insertEvent } from "./storage.js";
import { normalizeBattery, shouldSendEmail } from "./rules.js";

const app = Fastify({ logger: true });

/* -------------------- SCHEMA -------------------- */
const EventSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    deviceTs: z.string().optional(),
    tz: z.string().optional(),
    eventType: z.enum([
        "manual",
        "auto",
        "night",
        "stopped_confirmed",
        "emergency",
    ]),
    battery: z.number().optional(),
    notes: z.string().max(500).optional(),
});

/* -------------------- ROUTES -------------------- */

// Health check
app.get("/health", async () => ({
    ok: true,
}));

// Main ingest endpoint
app.post("/v1/events", async (req, reply) => {
    /* ---------- AUTH ---------- */
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== config.apiKey) {
        return reply.code(401).send({
            ok: false,
            error: "Unauthorized",
        });
    }

    /* ---------- VALIDATION ---------- */
    req.log.info({ body: req.body, bodyType: typeof req.body }, 'raw body received');

    const parsed = EventSchema.safeParse(req.body);
    if (!parsed.success) {
        req.log.warn(
            { issues: parsed.error.issues, flattened: parsed.error.flatten(), body: req.body },
            'validation failed'
        );

        return reply.code(400).send({
            ok: false,
            error: parsed.error.flatten(),
        });
    }

    const event = parsed.data;
    const isoNow = new Date().toISOString();

    const decision = shouldSendEmail(event, isoNow);

    insertEvent({
        id: randomUUID(),
        createdAtIso: isoNow,
        lat: event.lat,
        lng: event.lng,
        eventType: event.eventType,
        battery: normalizeBattery(event.battery),
        notes: event.notes ?? null
    });

    if (!decision.ok) {
        req.log.info(
            { reason: decision.reason },
            'Event logged but email skipped'
        );

        return reply.send({
            ok: true,
            emailed: false,
            reason: decision.reason,
        });
    }

    await sendEmail(event);

    return reply.send({
        ok: true,
        emailed: true
    });

    /* ---------- LOG ---------- */
    req.log.info({ event }, "Incoming location event");

    /* ---------- EMAIL ---------- */
    try {
        await sendEmail(event);
    } catch (err) {
        req.log.error(err, "Failed to send email");
        return reply.code(500).send({
            ok: false,
            error: "Email delivery failed",
        });
    }

    /* ---------- RESPONSE ---------- */
    return reply.send({
        ok: true,
        emailed: true,
    });
});

app
    .listen({ port: config.port, host: "0.0.0.0" })
    .catch((err) => {
        app.log.error(err);
        process.exit(1);
    });
