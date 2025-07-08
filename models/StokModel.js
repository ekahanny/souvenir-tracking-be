import mongoose, { Schema } from "mongoose";

const stokSchema = new Schema({
  produk: {
    type: Schema.Types.ObjectId,
    ref: "Produk",
    required: true,
  },
  stok: {
    type: Number,
    required: true,
    min: 0,
  },
  tanggalKadaluarsa: {
    type: Date,
    // required: true,
  },
});

const Stok = mongoose.model("Stok", stokSchema);
export default Stok;
