import mongoose from "mongoose";
const { Schema } = mongoose;

const logProdukSchema = new Schema({
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
  },
  tanggalKadaluarsa: {
    type: Date,
  },
  harga: {
    type: Number,
    min: 0,
  },
  stok: {
    type: Number,
    required: true,
    min: 0,
  },
  stokRecord: {
    type: Map,
    of: Number,
  },
  isProdukMasuk: {
    type: Boolean,
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const LogProduk = mongoose.model("LogProduk", logProdukSchema);

export default LogProduk;
