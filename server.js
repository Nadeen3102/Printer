import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Endpoint to create a connection token for the terminal SDK
app.post("/connection_token", async (req, res) => {
  try {
    const token = await stripe.terminal.connectionTokens.create({
      location: process.env.STRIPE_TERMINAL_LOCATION_ID,
    });
    res.json({ secret: token.secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Optional: create payment intent
app.post("/create_payment_intent", async (req, res) => {
  const { amount, currency } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ["card_present"],
      capture_method: "manual",
    });
    res.json(paymentIntent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ Stripe Terminal Server is running!");
});


const PORT = process.env.PORT || 4242;
// CRITICAL: Bind to 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is listening on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});