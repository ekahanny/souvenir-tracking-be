import mongoose from "mongoose";
const { Schema } = mongoose;

const produkSchema = new Schema({
  kode_produk: {
    type: String,
    required: true,
    unique: true,
  },
  kategori: {
    type: Schema.Types.ObjectId,
    ref: "KategoriProduk",
  },
  nama_produk: {
    type: String,
    required: true,
  },
  harga: {
    type: Number,
    unsigned: true,
  },
  stok: {
    type: Number,
    default: 0,
  },
  jenis_satuan: {
    type: String,
    enum: ["pcs", "kg", "gr", "ml", "lt"],
    default: "pcs",
  },
});

const Produk = mongoose.model("Produk", produkSchema);
export default Produk;
