import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as notificationService from "../services/notification.service";

export const triggerSOS = async (req: Request, res: Response) => {
  const { userId, triggerType, location, emergencyContacts } = req.body;

  if (!userId || !triggerType || !location) {
    return res.status(400).json({ error: "userId, triggerType, and location are required" });
  }

  const sosEventId = uuidv4();

  try {
    // TODO: insert SOS event row, start media recording upload flow
    await notificationService.notifyEmergencyContacts({
      contacts: emergencyContacts || [],
      location,
      sosEventId,
    });

    return res.status(201).json({
      message: "SOS triggered and contacts notified (stub)",
      sosEventId,
      triggerType,
    });
  } catch (err: any) {
    console.error(err.message);
    return res.status(500).json({ error: "Failed to process SOS trigger" });
  }
};

export const resolveSOS = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // "resolved" | "false_alarm"

  if (!["resolved", "false_alarm"].includes(status)) {
    return res.status(400).json({ error: "status must be 'resolved' or 'false_alarm'" });
  }

  // TODO: update sos_events table
  return res.json({ message: `SOS event ${id} marked as ${status} (stub)` });
};

export const startFollowMe = async (req: Request, res: Response) => {
  const { userId, route } = req.body;

  if (!userId || !route) {
    return res.status(400).json({ error: "userId and route are required" });
  }

  const sessionId = uuidv4();

  // TODO: persist session, set up deviation/anomaly monitoring via ai-services
  return res.status(201).json({
    message: "Follow Me session started (stub)",
    sessionId,
  });
};
