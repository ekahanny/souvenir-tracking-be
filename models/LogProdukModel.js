import mongoose from "mongoose";
const { Schema } = mongoose;

const logProdukSchema = new Schema(
  {
    produk: {
      type: Schema.Types.ObjectId,
      ref: "Produk",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    tanggal: {
      type: Date,
      required: true,
    },
    stok: {
      type: Number,
      required: true,
      min: 0,
    },
    isProdukMasuk: {
      type: Boolean,
      required: true,
    },
    // Hanya ada untuk produk keluar
    nama_kegiatan: {
      type: String,
      required: function () {
        return !this.isProdukMasuk;
      },
    },
    pic: {
      type: String,
      required: function () {
        return !this.isProdukMasuk;
      },
    },
  },
  { timestamps: true }
);

const LogProduk = mongoose.model("LogProduk", logProdukSchema);

export default LogProduk;
