import Produk from "../models/ProdukModel.js";
import mongoose from "mongoose";

export const insertProduk = async (body) => {
  const produkExist = await Produk.findOne({
    kode_produk: body.kode_produk,
  });

  if (produkExist) {
    throw new Error("Kode produk sudah ada");
  }

  if (body.stok < 0) {
    throw new Error("Stok tidak boleh minus");
  }

  if (body.harga <= 0) {
    throw new Error("Harga tidak boleh minus atau nol");
  }

  const newProduk = new Produk(body);
  await newProduk.save();
  return newProduk;
};

export const createProduk = async (req, res) => {
  try {
    const newProduk = await insertProduk(req.body);

    res.status(201).json({ Produk: newProduk });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Server error" });
  }
};

export const getAllProduk = async (req, res) => {
  try {
    const produkList = await Produk.aggregate([
      {
        $lookup: {
          from: "stoks",
          localField: "_id",
          foreignField: "produk",
          as: "stok_entries",
        },
      },
      {
        $addFields: {
          stok: { $sum: "$stok_entries.stok" },
        },
      },
      {
        $project: {
          stok_entries: 0,
        },
      },
    ]);
    res.json({ Produk: produkList });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getProdukByKode = async (req, res) => {
  try {
    const produk = await Produk.findOne({ kode_produk: req.params.kode });
    if (!produk) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }
    res.json({ ...produk._doc });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getProdukById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: "Invalid Product ID format" });
    }

    const produkArray = await Produk.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id),
        },
      },
      {
        $lookup: {
          from: "stoks",
          localField: "_id",
          foreignField: "produk",
          as: "stok_entries",
        },
      },
      {
        $addFields: {
          stok: { $sum: "$stok_entries.stok" },
        },
      },
      {
        $project: {
          stok_entries: 0,
        },
      },
    ]);

    if (produkArray.length === 0) {
      return res.status(404).json({ msg: "Produk not found" });
    }

    const produk = produkArray[0];

    res.json({ Produk: produk });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateProduk = async (req, res) => {
  try {
    const updatedProduk = await Produk.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedProduk) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }

    res.json({ Produk: updatedProduk });
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ msg: "Product not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
};

export const deleteProduk = async (req, res) => {
  try {
    const deletedProduk = await Produk.findByIdAndDelete(req.params.id);

    if (!deletedProduk) {
      return res.status(404).json({ msg: "Product not found" });
    }

    res.json({ msg: "Product deleted successfully", Produk: deletedProduk });
  } catch (error) {
    console.log(error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ msg: "Product not found" });
    }
    res.status(500).json({ msg: "Server error" });
  }
};
