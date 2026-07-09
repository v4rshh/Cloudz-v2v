import { Request, Response } from "express";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export const submitReport = async (req: Request, res: Response) => {
  const { text, location, anonymous } = req.body;

  if (!text || !location) {
    return res.status(400).json({ error: "text and location are required" });
  }

  try {
    // Call the NLP classifier microservice to auto-tag category/severity
    const { data: classification } = await axios.post(`${AI_SERVICE_URL}/classify/incident`, {
      text,
    });

    // TODO: insert into incident_reports table using classification result
    return res.status(201).json({
      message: "Report submitted (stub)",
      classification,
      anonymous: !!anonymous,
      location,
    });
  } catch (err: any) {
    console.error(err.message);
    return res.status(502).json({ error: "Failed to classify report via AI service" });
  }
};

export const listReports = async (req: Request, res: Response) => {
  const { query, semantic } = req.query;

  if (semantic === "true" && query) {
    try {
      // Semantic search over reports via vector similarity
      const { data } = await axios.get(`${AI_SERVICE_URL}/search/reports`, {
        params: { q: query },
      });
      return res.json(data);
    } catch (err: any) {
      console.error(err.message);
      return res.status(502).json({ error: "Semantic search failed" });
    }
  }

  // TODO: fall back to normal DB query/filter
  return res.json({ reports: [], message: "Standard listing not yet implemented (stub)" });
};

export const verifyReport = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { vote } = req.body; // "up" | "down"

  if (!["up", "down"].includes(vote)) {
    return res.status(400).json({ error: "vote must be 'up' or 'down'" });
  }

  // TODO: update verification_count in DB
  return res.json({ message: `Report ${id} received a '${vote}' vote (stub)` });
};
