import LogProduk from "../models/LogProdukModel.js";

export const dashboard = async (req, res) => {
  try {

    // get all log and its produk
    const allLogs = await LogProduk.find().populate("Produk");

    // menyesuaikan format data yang diinginkan
    const data = allLogs.map((log) => {
      return {
        kode_produk: log.Produk.kode_produk,
        nama_produk: log.Produk.nama_produk,
        stok: log.stok,
        isProdukMasuk: log.isProdukMasuk,
        harga: log.harga,
        tanggal: log.tanggal,
      };
    });
    return res.status(200).json({ Produk: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Server error" });
  }
}
