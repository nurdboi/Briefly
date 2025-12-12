import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

export async function transcribeAudio(filePath) {
  const stream = fs.createReadStream(filePath);
  const transcription = await openai.audio.transcriptions.create({
    file: stream,
    model: "whisper-1",
  });
  return transcription.text;
}

export async function summarizeWithPrompt(transcript, mode="concise") {
  const system = "You are Briefly, an elite summarizer. Output structured useful study material.";
  const userPrompt = `
Mode: ${mode}
Transcript:
${transcript}

Return JSON with keys:
- "summary" : short paragraph overview
- "key_points" : array of 6 concise bullet points
- "timeline" : array of {time: "mm:ss or approx", note: "what happened"}
- "study_questions" : array of 5 likely test-style questions
- "flashcards" : array of {q:"", a:""}
Return only valid JSON.
`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 900,
  });
  const text = resp.choices?.[0]?.message?.content ?? "";
  try { return JSON.parse(text); } 
  catch { return { summary:text, key_points:[], timeline:[], study_questions:[], flashcards:[] }; }
}
