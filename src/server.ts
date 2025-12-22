import Fastify from "fastify";
import { z } from "zod";
import { config } from "./config.js";
import { sendEmail } from "./email.js";

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
    const parsed = EventSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.code(400).send({
            ok: false,
            error: parsed.error.flatten(),
        });
    }

    const event = parsed.data;

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
