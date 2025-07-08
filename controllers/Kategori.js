import KategoriProduk from "../models/CategoryModel.js";
import Produk from "../models/ProdukModel.js";

async function insertKategori(body) {
  const kategoriExist = await KategoriProduk.findOne({
    nama: body.nama,
  });

  if (kategoriExist) {
    throw new Error("Kategori sudah ada");
  }

  const newKategori = new KategoriProduk(body);
  await newKategori.save();
  return newKategori;
}


export const createKategori = async (req, res) => {
  try {
    const newKategori = await insertKategori(req.body);
    res.status(201).json({ KategoriProduk: newKategori });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Server error" });
  }
};

export const getAllKategori = async (req, res) => {
  try {
    const kategoriList = await KategoriProduk.find();
    res.json({ KategoriProduk: kategoriList });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getKategoriById = async (req, res) => {
  try {
    const kategori = await KategoriProduk.findById(req.params.id);
    if (!kategori) {
      return res.status(404).json({ msg: "Kategori tidak ditemukan" });
    }
    res.json({ ...kategori._doc });
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ msg: "Kategori tidak ditemukan" });
    }
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateKategori = async (req, res) => {
  try {
    const updatedKategori = await KategoriProduk.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    if (!updatedKategori) {
      return res.status(404).json({ msg: "Kategori tidak ditemukan" });
    }

    res.json({ KategoriProduk: updatedKategori });
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ msg: "Kategori tidak ditemukan" });
    }
    res.status(500).json({ msg: "Server error" });
  }
};

export const deleteKategori = async (req, res) => {
  try {
    const referencingProducts = await Produk.countDocuments({ kategori: req.params.id });

    if (referencingProducts > 0) {
      return res.status(400).json({
        msg: "Tidak dapat menghapus kategori karena masih digunakan oleh produk"
      });
    }

    const deletedKategori = await KategoriProduk.findByIdAndDelete(req.params.id);

    if (!deletedKategori) {
      return res.status(404).json({ msg: "Kategori tidak ditemukan" });
    }

    res.json({ msg: "Kategori berhasil dihapus", KategoriProduk: deletedKategori });
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ msg: "Kategori tidak ditemukan" });
    }
    res.status(500).json({ msg: "Server error" });
  }
};
