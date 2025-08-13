import Produk from "../models/ProdukModel.js";
import LogProduk from "../models/LogProdukModel.js";
import Kegiatan from "../models/KegiatanModel.js";
import mongoose from "mongoose";

export const insertLog = async (req, res) => {
  try {
    // 1. Validasi Request Body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body tidak boleh kosong",
      });
    }

    // 2. Autentikasi User
    // const createdBy = req.userId;
    // if (!createdBy) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "User tidak terautentikasi",
    //   });
    // }

    // 3. Destructuring Request Body
    const { nama_produk, stok, isProdukMasuk, tanggal, nama_kegiatan, pic } =
      req.body;

    // 4. Validasi Field Wajib
    if (!nama_produk || stok === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nama produk dan stok harus diisi",
      });
    }

    // 5. Validasi Khusus Produk Keluar
    if (!isProdukMasuk) {
      if (!nama_kegiatan || !pic) {
        return res.status(400).json({
          success: false,
          message: "Nama kegiatan dan PIC harus diisi untuk produk keluar",
        });
      }
    }

    // 6. Cek Keberadaan Produk
    const produkExists = await Produk.findOne({ nama_produk });
    if (!produkExists) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan, buat produk terlebih dahulu",
      });
    }

    // 7. Validasi Tanggal untuk Produk Keluar
    if (!isProdukMasuk) {
      const firstInProdLog = await LogProduk.findOne({
        produk: produkExists._id,
        isProdukMasuk: true,
      }).sort({ tanggal: 1 });

      if (firstInProdLog) {
        const inputDate = new Date(tanggal);
        const firstInDate = new Date(firstInProdLog.tanggal);

        if (inputDate < firstInDate) {
          return res.status(400).json({
            success: false,
            message: `Tanggal keluar tidak boleh lebih awal dari tanggal masuk pertama (${firstInDate.toLocaleDateString()})`,
          });
        }
      }
    }

    // 8. Validasi Stok untuk Produk Keluar
    if (!isProdukMasuk && stok > produkExists.stok) {
      return res.status(400).json({
        success: false,
        message: "Stok tidak cukup",
      });
    }

    // 9. Update Stok Produk
    const newStok = isProdukMasuk
      ? produkExists.stok + stok
      : produkExists.stok - stok;

    const updatedProduk = await Produk.findOneAndUpdate(
      { nama_produk },
      { stok: newStok },
      { new: true }
    );

    // 10. Penanganan Kegiatan (Hanya untuk Produk Keluar)
    let kegiatanId = null;
    if (!isProdukMasuk) {
      // Cari kegiatan berdasarkan nama dan PIC
      let kegiatan = await Kegiatan.findOne({
        nama_kegiatan,
        pic,
      });

      // Jika kegiatan tidak ada, buat baru
      if (!kegiatan) {
        kegiatan = new Kegiatan({
          nama_kegiatan,
          pic,
          produk: [updatedProduk._id], // Masukkan produk ke array
          logs: [], // Inisialisasi array logs kosong
        });
      } else {
        // Jika kegiatan sudah ada, tambahkan produk jika belum ada
        if (!kegiatan.produk.includes(updatedProduk._id)) {
          kegiatan.produk.push(updatedProduk._id);
        }
      }
      console.log(kegiatan);
      await kegiatan.save();
      kegiatanId = kegiatan._id;
    }

    // 11. Pembuatan Log Produk
    const logData = {
      produk: updatedProduk._id,
      stok,
      isProdukMasuk,
      tanggal: new Date(tanggal),
      // createdBy,
      ...(!isProdukMasuk && { kegiatan: kegiatanId }), // Hanya tambahkan kegiatan untuk produk keluar
    };

    const newLog = new LogProduk(logData);
    await newLog.save();

    // 12. Update Referensi Log di Kegiatan (Hanya untuk Produk Keluar)
    if (!isProdukMasuk) {
      await Kegiatan.findByIdAndUpdate(kegiatanId, {
        $push: { logs: newLog._id },
      });
    }

    // 13. Populate Data untuk Response
    const populatedLog = await LogProduk.findById(newLog._id)
      .populate({
        path: "produk",
        select: "nama_produk kategori stok jenis_satuan",
      })
      .populate({
        path: "kegiatan",
        select: "nama_kegiatan pic",
      });
    // .populate({
    //   path: "createdBy",
    //   select: "name email",
    // });

    // 14. Response Sukses
    return res.status(201).json({
      success: true,
      data: {
        log: populatedLog,
        produk: {
          nama_produk: updatedProduk.nama_produk,
          stok: updatedProduk.stok,
        },
        ...(!isProdukMasuk && {
          kegiatan: {
            nama_kegiatan,
            pic,
          },
        }),
      },
      message: "Log produk berhasil dibuat",
    });
  } catch (error) {
    // 15. Error Handling
    console.error("Error in insertLog:", error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Data duplikat ditemukan",
        error: error.keyValue,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: messages,
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      message: error.message || "Terjadi kesalahan server",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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
