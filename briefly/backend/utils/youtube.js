import ytdlp from "yt-dlp-exec";
import fs from "fs";
import path from "path";

export async function downloadYoutubeAudio(url) {
  const out = path.join("uploads", `youtube_${Date.now()}.%(ext)s`);
  await ytdlp(url, { extractAudio: true, audioFormat: "mp3", output: out, noCheckCertificate: true, quiet: true });
  
  const files = fs.readdirSync("uploads").filter(f => f.startsWith("youtube_"));
  if (!files.length) throw new Error("No downloaded file found");
  const newest = files.map(f => ({ f, m: fs.statSync(path.join("uploads", f)).mtimeMs }))
                      .sort((a, b) => b.m - a.m)[0].f;
  return path.join("uploads", newest);
}
