import express from "express";
import {
  createProduk,
  deleteProduk,
  getAllProduk,
  getProdukById,
  // getProdukByKode,
  updateProduk,
} from "../controllers/Produk.js";
import {
  getUser,
  getUserById,
  login,
  register,
  updatePassword,
  updateUsername,
} from "../controllers/Users.js";
import {
  // createLog,
  deleteLog,
  getAllLogs,
  // getLogById,
  insertLog,
  updateLog,
} from "../controllers/LogProduk.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  createKategori,
  deleteKategori,
  getAllKategori,
  getKategoriById,
  updateKategori,
} from "../controllers/Kategori.js";
import {
  getAllKegiatanWithProducts,
  getKegiatanById,
  updateKegiatanFromLog,
} from "../controllers/Kegiatan.js";
// import { dashboard } from "../controllers/Dashboard.js";

const router = express.Router();

// log produk
router.post("/produk/log", authMiddleware, insertLog);
router.get("/produk/log", authMiddleware, getAllLogs);
// router.get("/produk/log/:id", authMiddleware, getLogById);
router.put("/produk/log/:id", authMiddleware, updateLog);
router.delete("/produk/log/:id", authMiddleware, deleteLog);

// produk
router.post("/produk", authMiddleware, createProduk);
router.get("/produk", authMiddleware, getAllProduk);
// router.get("/produk/:kode", getProdukByKode);
router.get("/produk/:id", authMiddleware, getProdukById);
router.put("/produk/:id", authMiddleware, updateProduk);
router.delete("/produk/:id", authMiddleware, deleteProduk);

// kegiatan
router.get("/riwayat-kegiatan", getAllKegiatanWithProducts);
router.put("/riwayat-kegiatan/:id", updateKegiatanFromLog);
router.get("/detail-kegiatan/:id", getKegiatanById);

// Kategori
router.post("/kategori", authMiddleware, createKategori);
router.get("/kategori", authMiddleware, getAllKategori);
router.get("/kategori/:id", authMiddleware, getKategoriById);
router.put("/kategori/:id", authMiddleware, updateKategori);
router.delete("/kategori/:id", authMiddleware, deleteKategori);

// Auth
router.get("/user", authMiddleware, getUser);
router.get("/users/:id", authMiddleware, getUserById);
router.post("/login", login);
router.post("/register", register);
router.put("/update-password", authMiddleware, updatePassword);
router.put("/update-username", authMiddleware, updateUsername);

router.use((req, res) => {
  res.status(404);
  res.send("<h1>404 Not Found!!</h1>");
});

export default router;
