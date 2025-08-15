import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import connectToMongoDB from "./config/Database.js";

dotenv.config();
const app = express();
const corsConfig = {
  origin: "http://localhost:3000",
  credential: true,
};

// Middleware
app.use(cors(corsConfig));
app.use(cookieParser());
app.use(express.json());
app.use(router);

// Handle koneksi MongoDB (gunakan IIFE atau async block)
async () => {
  try {
    await connectToMongoDB;
    console.log("Database connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};
