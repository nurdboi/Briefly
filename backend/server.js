import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";

import authRoutes from "./routes/auth.js";
import summarizeRoutes from "./routes/summarize.js";
import stripeRoutes from "./routes/stripe.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/webhook", bodyParser.raw({ type: "application/json" }));

const upload = multer({ dest: "uploads/" });
app.use(upload.any()); // makes upload available to routes if needed

// routes
app.use(authRoutes);
app.use(summarizeRoutes);
app.use(stripeRoutes);

// success page
app.get("/success.html", (req, res) => {
  res.send(`<html><body><h1>Payment success</h1><p>You can close this window and return to Briefly.</p></body></html>`);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
