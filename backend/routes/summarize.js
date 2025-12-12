import express from "express";
import { authenticate } from "../utils/auth.js";
import { downloadYoutubeAudio } from "../utils/youtube.js";
import { transcribeAudio, summarizeWithPrompt } from "../utils/openai.js";
import { upsertUser } from "../utils/storage.js";
import fs from "fs";

const router = express.Router();

router.post("/summarize", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const FREE_LIMIT = 2;
    const used = (user.summaries || []).length;
    const hasFree = !user.subscriptionActive && used < FREE_LIMIT;
    const hasCredits = (user.credits || 0) > 0;

    if (!user.subscriptionActive && !hasFree && !hasCredits) 
      return res.status(403).json({ error: "Limit reached. Buy credits or subscribe." });

    let filePath;
    if (req.body.youtubeLink) filePath = await downloadYoutubeAudio(req.body.youtubeLink);
    else if (req.file) filePath = req.file.path;
    else return res.status(400).json({ error: "No input provided" });

    let transcript;
    try { transcript = await transcribeAudio(filePath); } 
    catch { transcript = ""; }

    const summaryJson = await summarizeWithPrompt(transcript || "Transcript unavailable", req.body.mode || "concise");

    if (!user.subscriptionActive) {
      if (!hasFree && hasCredits) user.credits = Math.max(0, user.credits - 1);
    }

    user.summaries = user.summaries || [];
    user.summaries.unshift({ createdAt: Date.now(), data: summaryJson });
    upsertUser(user);

    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ summary: summaryJson });
  } catch (err) { res.status(500).json({ error: "Failed to summarize", details: err.message }); }
});

export default router;
