import { Request, Response } from "express";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export const askAssistant = async (req: Request, res: Response) => {
  const { question, userId, language } = req.body;

  if (!question) {
    return res.status(400).json({ error: "question is required" });
  }

  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/rag/ask`, {
      question,
      language: language || "en",
    });

    // data is expected to include: { answer, sources: [...], is_crisis: bool }
    return res.json(data);
  } catch (err: any) {
    console.error(err.message);
    return res.status(502).json({ error: "Failed to reach Sahara assistant service" });
  }
};
