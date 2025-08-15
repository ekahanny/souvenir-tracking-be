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

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import connectToMongoDB from "./config/Database.js";

dotenv.config();
const app = express();

// Konfigurasi CORS
const corsConfig = {
  credentials: true,
  origin: [process.env.CLIENT_URL || "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
};

// Middleware
app.use(cors(corsConfig));
app.use(cookieParser());
app.use(express.json());

// Routing
app.use(router);

// Koneksi DB hanya sekali (hindari reconnect tiap request)
connectToMongoDB()
  .then(() => console.log("Database connected"))
  .catch((error) => console.error("Database connection failed:", error));

// Export untuk digunakan oleh Vercel
export default app;
