import mongoose from "mongoose";
import Kegiatan from "../models/KegiatanModel.js";
import LogProduk from "../models/LogProdukModel.js";

export const getAllKegiatanWithProducts = async (req, res) => {
  try {
    const kegiatanList = await Kegiatan.find()
      .populate({
        path: "produk",
        select: "nama_produk kategori stok jenis_satuan",
      })
      .populate({
        path: "logs",
        populate: [
          {
            path: "produk",
            select: "nama_produk kategori stok jenis_satuan",
          },
          // {
          //   path: "createdBy",
          //   select: "name email",
          // },
        ],
      })
      .sort({ createdAt: -1 });

    res.json({ kegiatan: kegiatanList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getKegiatanById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validasi ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID kegiatan tidak valid",
      });
    }

    const kegiatan = await Kegiatan.findById(id)
      .populate({
        path: "produk",
        select: "nama_produk kategori stok jenis_satuan",
      })
      .populate({
        path: "logs",
        populate: {
          path: "produk",
          select: "nama_produk kategori stok jenis_satuan",
        },
        options: { sort: { tanggal: -1 } }, // Urutkan logs berdasarkan tanggal terbaru
      })
      .lean();

    if (!kegiatan) {
      return res.status(404).json({
        success: false,
        message: "Kegiatan tidak ditemukan",
      });
    }

    // Format response
    const response = {
      _id: kegiatan._id,
      nama_kegiatan: kegiatan.nama_kegiatan,
      pic: kegiatan.pic,
      createdAt: kegiatan.createdAt,
      updatedAt: kegiatan.updatedAt,
      produk: kegiatan.produk.map((prod) => ({
        _id: prod._id,
        nama_produk: prod.nama_produk,
        kategori: prod.kategori,
        stok: prod.stok,
        jenis_satuan: prod.jenis_satuan,
        // Tambahkan jumlah stok yang dikeluarkan untuk kegiatan ini
        stok_keluar: kegiatan.logs
          .filter((log) => log.produk._id.toString() === prod._id.toString())
          .reduce((total, log) => total + log.stok, 0),
      })),
      logs: kegiatan.logs.map((log) => ({
        _id: log._id,
        produk: log.produk,
        tanggal: log.tanggal,
        stok: log.stok,
        isProdukMasuk: log.isProdukMasuk,
        createdAt: log.createdAt,
      })),
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateKegiatanFromLog = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params; // ID log produk keluar
    const { nama_kegiatan, pic, tanggal } = req.body;

    // Validasi ID log
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "ID log tidak valid",
      });
    }

    // Cari log produk
    const log = await LogProduk.findById(id)
      .populate("kegiatan")
      .session(session);

    if (!log) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Log produk tidak ditemukan",
      });
    }

    // Pastikan ini adalah log produk keluar
    if (log.isProdukMasuk) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Hanya log produk keluar yang bisa diupdate",
      });
    }

    let kegiatan;
    let kegiatanChanged = false;

    // Jika ada perubahan nama_kegiatan atau pic
    if (nama_kegiatan || pic) {
      const newNamaKegiatan = nama_kegiatan || log.kegiatan?.nama_kegiatan;
      const newPic = pic || log.kegiatan?.pic;

      // Cari kegiatan berdasarkan nama dan PIC baru
      kegiatan = await Kegiatan.findOne({
        nama_kegiatan: newNamaKegiatan,
        pic: newPic,
      }).session(session);

      // Jika kegiatan tidak ditemukan, buat baru
      if (!kegiatan) {
        kegiatan = new Kegiatan({
          nama_kegiatan: newNamaKegiatan,
          pic: newPic,
          produk: [log.produk],
          logs: [log._id],
        });
        await kegiatan.save({ session });
        kegiatanChanged = true;
      } else {
        // Jika kegiatan sudah ada, update referensi jika diperlukan
        if (!kegiatan.produk.includes(log.produk)) {
          kegiatan.produk.push(log.produk);
        }
        if (!kegiatan.logs.includes(log._id)) {
          kegiatan.logs.push(log._id);
        }
        await kegiatan.save({ session });
        kegiatanChanged = true;
      }

      // Hapus referensi dari kegiatan lama jika ada perubahan
      if (log.kegiatan && !log.kegiatan.equals(kegiatan._id)) {
        const oldKegiatan = await Kegiatan.findById(log.kegiatan).session(
          session
        );
        if (oldKegiatan) {
          oldKegiatan.logs = oldKegiatan.logs.filter(
            (logId) => logId.toString() !== log._id.toString()
          );
          oldKegiatan.produk = oldKegiatan.produk.filter(
            (prodId) => prodId.toString() !== log.produk.toString()
          );

          // Hapus kegiatan lama jika tidak ada referensi lagi
          if (
            oldKegiatan.logs.length === 0 &&
            oldKegiatan.produk.length === 0
          ) {
            await Kegiatan.findByIdAndDelete(oldKegiatan._id, { session });
          } else {
            await oldKegiatan.save({ session });
          }
        }
      }
    } else {
      // Jika tidak ada perubahan nama_kegiatan/pic, gunakan kegiatan yang ada
      kegiatan = log.kegiatan;
    }

    // Update log
    if (kegiatanChanged) {
      log.kegiatan = kegiatan._id;
    }
    if (tanggal) {
      log.tanggal = new Date(tanggal);
    }

    // Hanya simpan jika ada perubahan
    if (kegiatanChanged || tanggal) {
      await log.save({ session });
    }

    await session.commitTransaction();

    // Populate data untuk response
    const updatedLog = await LogProduk.findById(log._id)
      .populate("produk", "nama_produk kategori")
      .populate("kegiatan", "nama_kegiatan pic");

    res.json({
      success: true,
      data: updatedLog,
      message: "Data kegiatan berhasil diperbarui",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in updateKegiatanFromLog:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: Object.values(error.errors).map((val) => val.message),
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
