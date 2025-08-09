import mongoose from "mongoose";
const { Schema } = mongoose;

const produkSchema = new Schema(
  {
    nama_produk: {
      type: String,
      required: true,
      unique: true,
    },
    kategori: {
      type: Schema.Types.ObjectId,
      ref: "KategoriProduk",
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
  },
  { timestamps: true }
);

const Produk = mongoose.model("Produk", produkSchema);
export default Produk;
