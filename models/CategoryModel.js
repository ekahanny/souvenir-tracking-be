import mongoose from "mongoose";
const { Schema } = mongoose;

const kategoriProdukSchema = new Schema({
  nama: {
    type: String,
    required: true,
  },
  deskripsi: {
    type: String,
    required: false,
  }
});

const KategoriProduk = mongoose.model("KategoriProduk", kategoriProdukSchema);

export default KategoriProduk;
