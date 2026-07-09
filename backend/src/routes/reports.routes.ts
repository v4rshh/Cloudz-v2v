import express from "express";
const router = express.Router();
import * as reportsController from "../controllers/reports.controller";

// POST /api/reports - submit a new incident report (text or transcribed voice)
router.post("/", reportsController.submitReport);

// GET /api/reports - list/search reports (supports semantic query param)
router.get("/", reportsController.listReports);

// POST /api/reports/:id/verify - community upvote/downvote credibility
router.post("/:id/verify", reportsController.verifyReport);

export default router;
