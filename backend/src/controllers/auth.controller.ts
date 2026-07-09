import { Request, Response } from "express";
import jwt from "jsonwebtoken";

// NOTE: This is a placeholder implementation. Replace with real DB writes
// and an OTP provider (e.g., Twilio Verify, Firebase Auth) in production.

export const register = async (req: Request, res: Response) => {
  const { phone, email, language_pref } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "phone is required" });
  }

  // TODO: insert into users table, trigger OTP send
  return res.status(201).json({
    message: "User registered (stub). OTP sent to phone.",
    user: { phone, email, language_pref: language_pref || "en" },
  });
};

export const login = async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "phone is required" });
  }

  // TODO: trigger real OTP send via Twilio Verify
  return res.json({ message: `OTP sent to ${phone} (stub)` });
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: "phone and otp are required" });
  }

  // TODO: verify OTP against provider; here we accept any 6-digit code as a stub
  if (!/^\d{6}$/.test(otp)) {
    return res.status(401).json({ error: "Invalid OTP" });
  }

  const token = jwt.sign({ phone }, process.env.JWT_SECRET || "saferoute_ai_premium_secret_key_12345", {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });

  return res.json({ token });
};
