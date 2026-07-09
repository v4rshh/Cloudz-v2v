import express from "express";
const router = express.Router();
import * as sosController from "../controllers/sos.controller";

// POST /api/sos/trigger - trigger an SOS event (button/voice/anomaly/shake)
router.post("/trigger", sosController.triggerSOS);

// POST /api/sos/:id/resolve - mark an SOS event resolved / false alarm
router.post("/:id/resolve", sosController.resolveSOS);

// POST /api/sos/follow-me/start - start a live "Follow Me" tracking session
router.post("/follow-me/start", sosController.startFollowMe);

export default router;
