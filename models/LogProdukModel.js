// models/LogProdukModel.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const logProdukSchema = new Schema(
  {
    produk: {
      type: Schema.Types.ObjectId,
      ref: "Produk",
      required: true,
    },
    // createdBy: {
    //   type: Schema.Types.ObjectId,
    //   ref: "User",
    //   required: true,
    // },
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
    kegiatan: {
      type: Schema.Types.ObjectId,
      ref: "Kegiatan",
      required: function () {
        return !this.isProdukMasuk;
      },
    },
  },
  { timestamps: true }
);

// Hapus index yang tidak diperlukan jika sudah terlanjur dibuat
// logProdukSchema.index({ nama_kegiatan: 1 }, { unique: false });

const LogProduk = mongoose.model("LogProduk", logProdukSchema);

export default LogProduk;
