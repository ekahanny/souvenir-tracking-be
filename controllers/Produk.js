import Produk from "../models/ProdukModel.js";

export const insertProduk = async (body) => {
  // Validasi nama produk harus unik
  const produkExist = await Produk.findOne({ nama_produk: body.nama_produk });
  if (produkExist) {
    throw new Error("Produk dengan nama tersebut sudah ada");
  }

  // Validasi stok tidak boleh minus
  if (body.stok < 0) {
    throw new Error("Stok tidak boleh minus");
  }

  const newProduk = new Produk(body);
  await newProduk.save();
  return newProduk;
};

export const createProduk = async (req, res) => {
  try {
    const newProduk = await insertProduk({
      ...req.body,
      createdBy: req.userId, // Menyimpan ID user yang membuat
    });

    res.status(201).json({
      success: true,
      data: newProduk,
      message: "Produk berhasil dibuat",
    });
  } catch (error) {
    console.error("Error in createProduk:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Gagal membuat produk",
    });
  }
};

export const getAllProduk = async (req, res) => {
  try {
    // Menambahkan filter jika ada query params
    const filter = {};
    if (req.query.kategori) {
      filter.kategori = req.query.kategori;
    }
    if (req.query.search) {
      filter.nama_produk = { $regex: req.query.search, $options: "i" };
    }

    const produkList = await Produk.find(filter)
      .populate("kategori", "nama_kategori")
      .sort({ nama_produk: 1 });

    res.json({
      success: true,
      count: produkList.length,
      data: produkList,
    });
  } catch (error) {
    console.error("Error in getAllProduk:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getProdukByNama = async (req, res) => {
  try {
    const produk = await Produk.findOne({
      nama_produk: req.params.nama,
    }).populate("kategori", "nama_kategori");

    if (!produk) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: produk,
    });
  } catch (error) {
    console.error("Error in getProdukByNama:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getProdukById = async (req, res) => {
  try {
    const produk = await Produk.findById(req.params.id).populate(
      "kategori",
      "nama_kategori"
    );

    if (!produk) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: produk,
    });
  } catch (error) {
    console.error("Error in getProdukById:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "ID tidak valid",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateProduk = async (req, res) => {
  try {
    // Validasi nama produk unik jika nama diubah
    if (req.body.nama_produk) {
      const existingProduct = await Produk.findOne({
        nama_produk: req.body.nama_produk,
        _id: { $ne: req.params.id }, // Exclude current product
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Produk dengan nama tersebut sudah ada",
        });
      }
    }

    // Validasi stok tidak minus
    if (req.body.stok && req.body.stok < 0) {
      return res.status(400).json({
        success: false,
        message: "Stok tidak boleh minus",
      });
    }

    const updatedProduk = await Produk.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.userId, // Menyimpan ID user yang mengupdate
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProduk) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: updatedProduk,
      message: "Produk berhasil diperbarui",
    });
  } catch (error) {
    console.error("Error in updateProduk:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "ID produk tidak valid",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteProduk = async (req, res) => {
  try {
    // Cek apakah produk memiliki log terkait
    const logCount = await LogProduk.countDocuments({ produk: req.params.id });
    if (logCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus produk yang sudah memiliki riwayat log",
      });
    }

    const deletedProduk = await Produk.findByIdAndDelete(req.params.id);

    if (!deletedProduk) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: deletedProduk,
      message: "Produk berhasil dihapus",
    });
  } catch (error) {
    console.error("Error in deleteProduk:", error);
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "ID produk tidak valid",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
