import Stok from "../models/StokModel.js";

export const getStokByProdukId = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Stok.find({
      produk: id,
    }).sort({ tanggalKadaluarsa: 1 });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
