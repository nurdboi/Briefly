import jwt from "jsonwebtoken";
import { findUserByEmail } from "./storage.js";

const JWT_SECRET = process.env.JWT_SECRET || "replace_with_strong_secret";

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserByEmail(payload.email);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function generateToken(email) {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: "30d" });
}
