import { Request, Response } from "express";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export const getSafeRoutes = async (req: Request, res: Response) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination are required" });
  }

  try {
    // TODO: call Mapbox/Google Directions API to get candidate routes first,
    // then send each candidate's path to the AI risk-scoring service.
    const { data } = await axios.post(`${AI_SERVICE_URL}/risk/score-routes`, {
      origin,
      destination,
    });

    return res.json(data);
  } catch (err: any) {
    console.error(err.message);
    return res.status(502).json({ error: "Failed to score routes via AI service" });
  }
};

export const getHeatmap = async (req: Request, res: Response) => {
  const { minLat, minLng, maxLat, maxLng } = req.query;

  if (!minLat || !minLng || !maxLat || !maxLng) {
    return res.status(400).json({ error: "bounding box query params required" });
  }

  try {
    const { data } = await axios.get(`${AI_SERVICE_URL}/risk/heatmap`, {
      params: { minLat, minLng, maxLat, maxLng },
    });
    return res.json(data);
  } catch (err: any) {
    console.error(err.message);
    return res.status(502).json({ error: "Failed to fetch heatmap from AI service" });
  }
};
