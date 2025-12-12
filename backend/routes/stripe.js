import express from "express";
import Stripe from "stripe";
import { authenticate } from "../utils/auth.js";
import { loadUsers, upsertUser } from "../utils/storage.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });

const PRICE_BASIC_MONTHLY = process.env.PRICE_BASIC_MONTHLY;
const PRICE_PRO_MONTHLY = process.env.PRICE_PRO_MONTHLY;
const PRICE_CREDITS_5 = process.env.PRICE_CREDITS_5;
const PRICE_CREDITS_20 = process.env.PRICE_CREDITS_20;
const PRICE_CREDITS_50 = process.env.PRICE_CREDITS_50;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

router.post("/create-checkout-session-sub", authenticate, async (req, res) => {
  try {
    const which = req.body.price === "pro" ? PRICE_PRO_MONTHLY : PRICE_BASIC_MONTHLY;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: which, quantity: 1 }],
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      customer_email: req.user.email,
    });
    res.json({ url: session.url });
  } catch { res.status(500).json({ error: "Stripe failed to create session" }); }
});

router.post("/create-checkout-session-credits", authenticate, async (req, res) => {
  try {
    let price = PRICE_CREDITS_5;
    if (req.body.pack === "20") price = PRICE_CREDITS_20;
    else if (req.body.pack === "50") price = PRICE_CREDITS_50;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price, quantity: 1 }],
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      customer_email: req.user.email,
    });
    res.json({ url: session.url });
  } catch { res.status(500).json({ error: "Stripe failed to create session" }); }
});

router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET); } 
  catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }

  (async () => {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customer_email = session.customer_email;
      const users = loadUsers();
      const user = users.find(u => u.email === customer_email);
      if (!user) return;
      if (session.mode === "subscription") user.subscriptionActive = true;
      else if (session.mode === "payment") {
        const full = await stripe.checkout.sessions.retrieve(session.id, { expand: ["line_items"] });
        const li = full.line_items.data[0];
        let add = 0;
        if (li.price.id === PRICE_CREDITS_5) add = 5;
        else if (li.price.id === PRICE_CREDITS_20) add = 20;
        else if (li.price.id === PRICE_CREDITS_50) add = 50;
        user.credits = (user.credits || 0) + add;
      }
      upsertUser(user);
    }
  })();

  res.json({ received: true });
});

export default router;
