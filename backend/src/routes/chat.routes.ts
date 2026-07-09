import express from "express";
const router = express.Router();
import * as chatController from "../controllers/chat.controller";

// POST /api/chat/ask - ask the "Sahara" RAG safety assistant a question
router.post("/ask", chatController.askAssistant);

export default router;
