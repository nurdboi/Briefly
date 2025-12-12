import express from "express";
import bcrypt from "bcrypt";
import { findUserByEmail, upsertUser } from "../utils/storage.js";
import { generateToken, authenticate } from "../utils/auth.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });
  if (findUserByEmail(email)) return res.status(400).json({ error: "User exists" });
  const hash = await bcrypt.hash(password, 10);
  const user = { email, passwordHash: hash, summaries: [], credits: 0, subscriptionActive: false, createdAt: Date.now() };
  upsertUser(user);
  res.json({ token: generateToken(email) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: "Invalid credentials" });
  res.json({ token: generateToken(email) });
});

router.get("/me", authenticate, (req, res) => {
  const u = req.user;
  res.json({
    email: u.email,
    summaries: u.summaries || [],
    credits: u.credits || 0,
    subscriptionActive: !!u.subscriptionActive,
  });
});

export default router;
