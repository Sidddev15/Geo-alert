import Fastify from "fastify";
import { z } from "zod";
import { config } from "./config.js";
import { sendEmail } from "./email.js";
import { randomUUID } from "node:crypto";
import { insertEvent, listEvents } from "./storage.js";
import { normalizeBattery, shouldSendEmail } from "./rules.js";
import { issueEventToken, verifyEventToken } from "./auth.js";

const app = Fastify({ logger: true });

const HistoryQuerySchema = z.object({
    limit: z.string().optional(),
    before: z.string().optional(),
});

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
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return reply.code(401).send({ ok: false, error: "Missing token" });
    }

    const token = auth.slice("Bearer ".length);
    const origin = req.headers.origin;
    if (!origin) {
        return reply.code(403).send({ ok: false, error: "Missing Origin" });
    }

    try {
        verifyEventToken(token, origin);
    } catch {
        return reply.code(401).send({ ok: false, error: "Invalid token" });
    }

    /* ---------- VALIDATION ---------- */
    req.log.info({ body: req.body, bodyType: typeof req.body }, "raw body received");

    const parsed = EventSchema.safeParse(req.body);
    if (!parsed.success) {
        req.log.warn(
            { issues: parsed.error.issues, flattened: parsed.error.flatten(), body: req.body },
            "validation failed"
        );

        return reply.code(400).send({
            ok: false,
            error: parsed.error.flatten(),
        });
    }

    const event = parsed.data;
    const isoNow = new Date().toISOString();

    const decision = await shouldSendEmail(event, isoNow);

    insertEvent({
        id: randomUUID(),
        createdAtIso: isoNow,
        lat: event.lat,
        lng: event.lng,
        eventType: event.eventType,
        battery: normalizeBattery(event.battery),
        notes: event.notes ?? null,
    });

    if (!decision.ok) {
        req.log.info({ reason: decision.reason }, "Event logged but email skipped");

        return reply.send({
            ok: true,
            emailed: false,
            reason: decision.reason,
        });
    }

    await sendEmail(event);

    return reply.send({
        ok: true,
        emailed: true,
    });
});

app.get("/auth/issue-token", async (req, reply) => {
    const origin = req.headers.origin;

    // Optional origin restriction (recommended)
    const allowedOrigins = ["https://geo-alert-web.vercel.app"];

    if (!origin) {
        return reply.code(403).send({ ok: false, error: "Missing Origin" });
    }

    if (!allowedOrigins.includes(origin)) {
        return reply.code(403).send({ ok: false });
    }

    const token = issueEventToken(origin);

    return reply.send({
        ok: true,
        token,
        expiresInSec: Number(process.env.TOKEN_TTL_SECONDS ?? 300),
    });
});

app.get("/v1/history", async (req, reply) => {
    // --- Auth (same as /v1/events) ---
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return reply.code(401).send({ ok: false, error: "Missing token" });
    }

    const token = auth.slice("Bearer ".length);
    const origin = req.headers.origin;
    if (!origin) {
        return reply.code(403).send({ ok: false, error: "Missing Origin" });
    }

    try {
        verifyEventToken(token, origin);
    } catch {
        return reply.code(401).send({ ok: false, error: "Invalid token" });
    }

    const parsed = HistoryQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
        return reply.code(400).send({ ok: false, error: parsed.error.flatten() });
    }

    const limitRaw = parsed.data.limit ?? "50";
    const limitNum = Number(limitRaw);
    const limit = Number.isFinite(limitNum) ? limitNum : 50;

    const before = parsed.data.before;

    const events = await listEvents({ limit, beforeIso: before });

    // Provide next cursor
    const nextBefore = events.length ? events[events.length - 1].createdAtIso : null;

    return reply.send({
        ok: true,
        events,
        nextBefore,
    });
});

app
    .listen({ port: config.port, host: "0.0.0.0" })
    .catch((err) => {
        app.log.error(err);
        process.exit(1);
    });
