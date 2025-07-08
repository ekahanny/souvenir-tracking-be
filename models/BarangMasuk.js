import mongoose from "mongoose";
const { Schema } = mongoose;

const barangMasukSchema = new Schema({
  barang: {
    type: Schema.Types.ObjectId,
    ref: "Barang",
    required: true,
  },
  tanggal_masuk: {
    type: Date,
    default: Date.now,
  },
  harga_masuk: {
    type: Number,
    unsigned: true,
  },
  stok_masuk: {
    type: Number,
    required: true,
  },
});

const BarangMasuk = mongoose.Schema("BarangMasuk", barangMasukSchema);

export default BarangMasuk;
