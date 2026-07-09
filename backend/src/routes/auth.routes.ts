import express from "express";
const router = express.Router();
import * as authController from "../controllers/auth.controller";

// POST /api/auth/register - register with phone/email
router.post("/register", authController.register);

// POST /api/auth/login - login via OTP verification
router.post("/login", authController.login);

// POST /api/auth/verify-otp
router.post("/verify-otp", authController.verifyOtp);

export default router;
