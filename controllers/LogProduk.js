import Produk from "../models/ProdukModel.js";
import LogProduk from "../models/LogProdukModel.js";
import Kegiatan from "../models/KegiatanModel.js";
import mongoose from "mongoose";

export const insertLog = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validasi input
    if (!req.body || Object.keys(req.body).length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Request body tidak boleh kosong",
      });
    }

    const { nama_produk, stok, isProdukMasuk, tanggal, nama_kegiatan, pic } =
      req.body;

    // Validasi field wajib
    if (!nama_produk || stok === undefined || stok <= 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Nama produk dan stok (positif) harus diisi",
      });
    }

    // Cari atau buat produk baru jika tidak ada
    let produk = await Produk.findOne({ nama_produk }).session(session);
    if (!produk) {
      // Buat produk baru jika tidak ditemukan
      produk = new Produk({
        nama_produk,
        kategori: req.body.kategori || null,
        stok: 0,
        jenis_satuan: "pcs",
      });
      await produk.save({ session });
    }

    // Validasi khusus produk keluar
    if (!isProdukMasuk) {
      if (!nama_kegiatan || !pic) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Nama kegiatan dan PIC harus diisi untuk produk keluar",
        });
      }

      if (stok > produk.stok) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Stok tidak cukup",
        });
      }

      const firstInLog = await LogProduk.findOne({
        produk: produk._id,
        isProdukMasuk: true,
      })
        .sort({ tanggal: 1 })
        .session(session);

      if (firstInLog && new Date(tanggal) < new Date(firstInLog.tanggal)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Tanggal keluar tidak boleh lebih awal dari tanggal masuk pertama (${firstInLog.tanggal.toLocaleDateString()})`,
        });
      }
    }

    // Update stok produk
    const newStok = isProdukMasuk ? produk.stok + stok : produk.stok - stok;

    await Produk.findByIdAndUpdate(
      produk._id,
      { stok: newStok },
      { new: true, session }
    );

    // Kelola kegiatan (hanya untuk produk keluar)
    let kegiatanId = null;
    if (!isProdukMasuk) {
      let kegiatan = await Kegiatan.findOne({
        nama_kegiatan,
        pic,
      }).session(session);

      if (!kegiatan) {
        kegiatan = new Kegiatan({
          nama_kegiatan,
          pic,
          produk: [produk._id],
          logs: [],
        });
        await kegiatan.save({ session });
      } else if (!kegiatan.produk.includes(produk._id)) {
        kegiatan.produk.push(produk._id);
        await kegiatan.save({ session });
      }
      kegiatanId = kegiatan._id;
    }

    // Buat log produk
    const logData = {
      produk: produk._id,
      stok,
      isProdukMasuk,
      tanggal: new Date(tanggal),
      ...(!isProdukMasuk && { kegiatan: kegiatanId }),
    };

    const newLog = new LogProduk(logData);
    await newLog.save({ session });

    // Update referensi log di kegiatan
    if (!isProdukMasuk) {
      await Kegiatan.findByIdAndUpdate(
        kegiatanId,
        { $push: { logs: newLog._id } },
        { session }
      );
    }

    await session.commitTransaction();

    const populatedLog = await LogProduk.findById(newLog._id)
      .populate("produk", "nama_produk kategori")
      .populate("kegiatan", "nama_kegiatan pic");

    res.status(201).json({
      success: true,
      data: populatedLog,
      message: "Log produk berhasil dibuat",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in insertLog:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Data duplikat ditemukan",
        error: error.keyValue,
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Terjadi kesalahan server",
    });
  } finally {
    session.endSession();
  }
};

export const getAllLogs = async (req, res) => {
  try {
    const logs = await LogProduk.find()
      .populate({
        path: "produk",
        select: "nama_produk kategori stok jenis_satuan",
      })
      .populate({
        path: "kegiatan",
        select: "nama_kegiatan pic",
      })
      // .populate({
      //   path: "createdBy",
      //   select: "name email",
      // })
      .sort({ tanggal: -1, createdAt: -1 })
      .lean();

    res.json({ LogProduk: logs });
  } catch (error) {
    console.error(error);
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

    // Handle kegiatan update untuk produk keluar
    let kegiatanId = log.kegiatan;
    if (!log.isProdukMasuk && (req.body.nama_kegiatan || req.body.pic)) {
      const kegiatanData = {
        nama_kegiatan: req.body.nama_kegiatan || log.kegiatan?.nama_kegiatan,
        pic: req.body.pic || log.kegiatan?.pic,
      };

      let kegiatan = await Kegiatan.findOne(kegiatanData);
      if (!kegiatan) {
        kegiatan = new Kegiatan(kegiatanData);
        await kegiatan.save();
      }
      kegiatanId = kegiatan._id;
    }

    // Hitung selisih stok untuk update
    if (log.stok !== req.body.stok) {
      const selisih = log.stok - req.body.stok;
      if (log.isProdukMasuk) {
        produk.stok -= selisih;
      } else {
        produk.stok += selisih;
      }
      await produk.save();
    }

    // Update log
    const updatedLog = await LogProduk.findByIdAndUpdate(
      req.params.id,
      {
        stok: req.body.stok,
        tanggal: req.body.tanggal,
        ...(!log.isProdukMasuk && { kegiatan: kegiatanId }),
      },
      { new: true }
    ).populate("produk kegiatan");

    res.json({
      msg: "Log dan Produk berhasil diperbarui",
      updatedLog,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const deleteLog = async (req, res) => {
  try {
    const log = await LogProduk.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ msg: "Log tidak ditemukan" });
    }

    const produk = await Produk.findById(log.produk);
    if (!produk) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }

    // Kembalikan stok
    if (log.isProdukMasuk) {
      produk.stok -= log.stok;
    } else {
      produk.stok += log.stok;
    }
    await produk.save();

    // Hapus log
    await LogProduk.findByIdAndDelete(req.params.id);

    res.json({ msg: "Log berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
};
