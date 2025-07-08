import mongoose from "mongoose";
const { Schema } = mongoose;

const barangKeluarSchema = new Schema({
	barang: {
		type: Schema.Types.ObjectId,
		ref: "Barang",
		required: true,
	},
	tanggal_keluar: {
		type: Date,
		default: Date.now,
	},
	harga_keluar: {
		type: Number,
		unsigned: true,
	},
	stok_keluar: {
		type: Number,
		required: true,
	},
});

const BarangKeluar = mongoose.model("BarangKeluar", barangKeluarSchema);
export default BarangKeluar;
