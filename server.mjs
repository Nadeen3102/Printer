import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// Initialize Stripe - don't validate on startup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check - MUST respond quickly
app.get("/", (req, res) => {
  console.log("Health check hit");
  res.status(200).send("✅ Stripe Terminal Server is running!");
});

// Simple health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Endpoint to create a connection token for the terminal SDK
app.post("/connection_token", async (req, res) => {
  try {
    console.log("Creating connection token...");
    const token = await stripe.terminal.connectionTokens.create({
      location: process.env.STRIPE_TERMINAL_LOCATION_ID,
    });
    console.log("Connection token created successfully");
    res.json({ secret: token.secret });
  } catch (err) {
    console.error("Connection token error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Optional: create payment intent
app.post("/create_payment_intent", async (req, res) => {
  const { amount, currency } = req.body;
  try {
    console.log(`Creating payment intent: ${amount} ${currency}`);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ["card_present"],
      capture_method: "manual",
    });
    console.log("Payment intent created:", paymentIntent.id);
    res.json(paymentIntent);
  } catch (err) {
    console.error("Payment intent error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;

// Start server - MUST bind to 0.0.0.0
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is listening on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Stripe key configured: ${process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No'}`);
  console.log(`Location ID configured: ${process.env.STRIPE_TERMINAL_LOCATION_ID ? 'Yes' : 'No'}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});