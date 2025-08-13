import mongoose from "mongoose";
import Kegiatan from "../models/KegiatanModel.js";

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
