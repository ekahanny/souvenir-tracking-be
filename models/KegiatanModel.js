import mongoose from "mongoose";
const { Schema } = mongoose;

const kegiatanSchema = new Schema(
  {
    nama_kegiatan: {
      type: String,
      required: true,
    },
    pic: {
      type: String,
      required: true,
    },
    produk: [
      {
        type: Schema.Types.ObjectId,
        ref: "Produk",
      },
    ],
    logs: [
      {
        type: Schema.Types.ObjectId,
        ref: "LogProduk",
      },
    ],
  },
  { timestamps: true }
);

const Kegiatan = mongoose.model("Kegiatan", kegiatanSchema);
export default Kegiatan;
