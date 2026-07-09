import express from "express";
const router = express.Router();
import * as navigationController from "../controllers/navigation.controller";

// POST /api/navigation/route - get safety-ranked routes between origin and destination
router.post("/route", navigationController.getSafeRoutes);

// GET /api/navigation/heatmap - get risk heatmap data for a bounding box
router.get("/heatmap", navigationController.getHeatmap);

export default router;
