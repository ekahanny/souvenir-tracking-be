import Produk from "../models/ProdukModel.js";
import LogProduk from "../models/LogProdukModel.js";
import { insertProduk } from "./Produk.js";

export const insertLog = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ msg: "Request body tidak boleh kosong" });
    }

    const createdBy = req.userId;

    if (!createdBy) {
      return res.status(401).json({ msg: "User tidak terautentikasi" });
    }

    const { nama_produk, stok, isProdukMasuk, tanggal, nama_kegiatan, pic } =
      req.body;

    if (!nama_produk || stok === undefined) {
      return res.status(400).json({ msg: "Nama produk dan stok harus diisi" });
    }

    // Validasi untuk produk keluar
    if (!isProdukMasuk && (!nama_kegiatan || !pic)) {
      return res.status(400).json({
        msg: "Nama kegiatan dan PIC harus diisi untuk produk keluar",
      });
    }

    let produkExists = await Produk.findOne({ nama_produk });

    if (!produkExists) {
      return res.status(404).json({
        msg: "Produk tidak ditemukan, buat produk terlebih dahulu",
      });
    }

    // Cari tanggal berapa suatu barang masuk pertama kali
    const firstInProdLog = await LogProduk.findOne({
      produk: produkExists._id,
      isProdukMasuk: true,
    }).sort({ tanggal: 1 });

    // Jika ini adalah log keluar dan ada log masuk sebelumnya
    if (!isProdukMasuk && firstInProdLog) {
      const inputDate = new Date(tanggal);
      const firstInDate = new Date(firstInProdLog.tanggal);

      if (inputDate < firstInDate) {
        return res.status(400).json({
          msg: `Tanggal keluar tidak boleh lebih awal dari tanggal masuk pertama (${firstInDate.toLocaleDateString()})`,
        });
      }
    }

    if (!isProdukMasuk && stok > produkExists.stok) {
      return res.status(400).json({ msg: "Stok tidak cukup" });
    }

    const newStok = isProdukMasuk
      ? produkExists.stok + stok
      : produkExists.stok - stok;

    const updatedProduk = await Produk.findOneAndUpdate(
      { nama_produk },
      { stok: newStok },
      { new: true }
    );

    const logData = {
      produk: updatedProduk._id,
      stok,
      isProdukMasuk,
      tanggal,
      createdBy,
    };

    // Tambahkan field khusus untuk produk keluar
    if (!isProdukMasuk) {
      logData.nama_kegiatan = nama_kegiatan;
      logData.pic = pic;
    }

    const newLog = new LogProduk(logData);
    await newLog.save();
    return res.status(201).json({ LogProduk: newLog });
  } catch (error) {
    console.error("Error di insertLog:", error);
    return res.status(500).json({ msg: error.message || "Server error" });
  }
};

export const createLog = async (req, res) => {
  try {
    await insertLog(req, res);
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getAllLogs = async (req, res) => {
  try {
    const logs = await LogProduk.find()
      .populate({
        path: "produk",
        model: "Produk",
        select: "nama_produk kategori stok jenis_satuan",
      })
      .sort({ tanggal: -1, createdAt: -1 })
      .lean()
      .exec();
    res.json({ LogProduk: logs });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getLogById = async (req, res) => {
  try {
    const log = await LogProduk.findById(req.params.id)
      .populate({
        path: "produk",
        model: "Produk",
        select: "nama_produk kategori stok jenis_satuan",
      })
      .populate({
        path: "createdBy",
        model: "Users",
        select: "name email",
      });

    if (!log) {
      return res.status(404).json({ msg: "Log tidak ditemukan" });
    }
    res.json(log);
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateLog = async (req, res) => {
  try {
    const log = await LogProduk.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ msg: "Log tidak ditemukan" });
    }

    const produk = await Produk.findOne({ nama_produk: req.body.nama_produk });
    if (!produk) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }

    const updatedLog = await LogProduk.findById(req.params.id);

    // Hitung selisih stok untuk update
    if (updatedLog.stok !== req.body.stok) {
      const selisih = updatedLog.stok - req.body.stok;
      if (updatedLog.isProdukMasuk) {
        produk.stok -= selisih;
      } else {
        produk.stok += selisih;
      }
      await produk.save();
    }

    // Update log
    updatedLog.stok = req.body.stok;
    updatedLog.tanggal = req.body.tanggal;

    // Jika produk keluar, update juga nama kegiatan dan PIC
    if (!updatedLog.isProdukMasuk) {
      updatedLog.nama_kegiatan = req.body.nama_kegiatan;
      updatedLog.pic = req.body.pic;
    }

    await updatedLog.save();

    res.json({
      msg: "Log dan Produk berhasil diperbarui",
      updatedLog,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const deleteLog = async (req, res) => {
  try {
    const deletedLog = await LogProduk.findByIdAndDelete(req.params.id);

    if (!deletedLog) {
      return res.status(404).json({ msg: "Log tidak ditemukan" });
    }

    const produk = await Produk.findById(deletedLog.produk);
    if (!produk) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }

    // Kembalikan stok jika log dihapus
    if (deletedLog.isProdukMasuk) {
      produk.stok -= deletedLog.stok;
    } else {
      produk.stok += deletedLog.stok;
    }
    await produk.save();

    res.json({ msg: "Log berhasil dihapus", LogProduk: deletedLog });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};
