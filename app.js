// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import router from "./routes/index.js";
// import connectToMongoDB from "./config/Database.js";

// dotenv.config();
// const app = express();

// // Konfigurasi CORS
// const corsConfig = {
//   credentials: true,
//   origin: ["http://localhost:3000", process.env.CLIENT_URL],
//   methods: ["GET", "POST", "PUT", "DELETE"],
// };

// // Koneksi DB
// (async () => {
//   try {
//     await connectToMongoDB();
//     console.log("Database connected");
//   } catch (error) {
//     console.error("Database connection failed:", error);
//   }
// })();

// // Middleware
// app.options("*", cors(corsConfig));
// app.use(cors(corsConfig));
// app.use(cookieParser());
// app.use(express.json());
// app.use(router);

// export default app;

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import connectToMongoDB from "./config/Database.js";

dotenv.config();
const app = express();

// Konfigurasi CORS
const corsConfig = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true, // biar cookies/token ikut
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsConfig));
app.options("*", cors(corsConfig)); // penting untuk preflight
app.use(cookieParser());
app.use(express.json());

// Routing
app.use(router);

connectToMongoDB()
  .then(() => console.log("Database connected"))
  .catch((error) => console.error("Database connection failed:", error));

// Export untuk digunakan oleh Vercel
export default app;
