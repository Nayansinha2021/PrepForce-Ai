import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import interviewRoutes from "./routes/interview.routes";
import paymentRoutes from "./routes/payment.routes";
import reportRoutes from "./routes/report.routes";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import { generalLimiter } from "./middleware/rateLimiter";

const app = express();
app.set("trust proxy", 1); // Enable trusting trust proxy for secure rate-limiting behind reverse proxies
app.use(generalLimiter); // Apply general rate limit to all routes

const port = process.env.PORT || 8000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

// Standard Express JSON body parsing is fine for Razorpay webhook/verification
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/payment", paymentRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send({ status: "ok", service: "AI Mock Interview API" });
});

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
