import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import connectToMongoDB from "./config/Database.js";

// import morgan from "morgan";
dotenv.config();
const app = express();

try {
  await connectToMongoDB;
  console.log("Database connected");
} catch (error) {
  console.log(error);
}

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(cookieParser());
// app.use(morgan("dev"));
app.use(express.json());
app.use(router);

app.listen(5000, () => console.log("Server running in http://localhost:5000"));
