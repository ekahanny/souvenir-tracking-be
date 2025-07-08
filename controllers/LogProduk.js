import Produk from "../models/ProdukModel.js";
import LogProduk from "../models/LogProdukModel.js";
import { insertProduk } from "./Produk.js";
import Stok from "../models/StokModel.js";

export const insertLog = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        msg: "Request body tidak boleh kosong",
      });
    }

    const createdBy = req.userId;

    if (!createdBy) {
      return res.status(401).json({ msg: "User tidak terautentikasi" });
    }

    let {
      kode_produk,
      nama_produk,
      harga,
      stok,
      kategori,
      isProdukMasuk,
      tanggal,
      tanggalKadaluarsa,
    } = req.body;

    if (
      !kode_produk ||
      !nama_produk ||
      harga === undefined ||
      stok === undefined ||
      !tanggal ||
      (isProdukMasuk && !tanggalKadaluarsa) // Pastikan tanggalKadaluarsa tidak kosong untuk barang masuk, untuk barang keluar boleh kosong
    ) {
      return res.status(400).json({ msg: "Semua field harus diisi" });
    }

    let produkExists = await Produk.findOne({ kode_produk });

    if (!produkExists) {
      const newProduk = await insertProduk({
        kode_produk,
        nama_produk,
        harga,
        stok: 0,
        kategori,
        tanggal,
        createdBy,
      });
      produkExists = newProduk;
    }

    // Handle stok masuk/keluar
    let stokRecords = new Map();
    if (!isProdukMasuk) {
      // ambil semua stok tersedia beserta tanggal kadaluarsanya
      const stoks = await Stok.find({
        produk: produkExists._id,
        stok: { $gt: 0 },
        tanggalKadaluarsa: { $gte: new Date() },
      }).sort({ tanggalKadaluarsa: 1 });

      // Hitung total stok dan pastikan total stok mencukupi
      let totalStok = stoks.reduce((total, stok) => total + stok.stok, 0);
      if (totalStok < stok) {
        // jika stok keseluruhan tidak mencukupi
        return res.status(400).json({
          msg: "Stok tidak mencukupi",
        });
      }

      // const today = new Date();
      // const duaHarikedepan = new Date(today.getDate() + 2);

      // // console.log(dueDate);

      // if (tanggalKadaluarsa === duaHarikedepan) {
      // }

      if (stoks.length > 0) {
        let index = 0;
        let stokToRemove = stok;
        while (stokToRemove > 0) {
          if (stoks[index].stok >= stokToRemove) {
            stoks[index].stok -= stokToRemove;
            stokRecords.set(stoks[index].id, stokToRemove);
            stokToRemove = 0;
            await stoks[index].save();
            break;
          } else {
            stokToRemove -= stoks[index].stok;
            stokRecords.set(stoks[index].id, stoks[index].stok);
            stoks[index].stok = 0;
            await stoks[index].save();
            index++;
            if (index >= stoks.length) {
              return res.status(400).json({
                msg: "Stok tidak cukup untuk mengurangi",
              });
            }
          }
        }
      }
    } else {
      const existingStok = await Stok.findOne({
        produk: produkExists._id,
        tanggalKadaluarsa: tanggalKadaluarsa,
      });

      if (existingStok) {
        existingStok.stok += stok;
        stokRecords.set(existingStok.id, stok);
        await existingStok.save();
      } else {
        const newStokEntry = new Stok({
          produk: produkExists._id,
          stok: stok,
          tanggalKadaluarsa: tanggalKadaluarsa,
          createdBy,
        });
        stokRecords.set(newStokEntry.id, stok);
        await newStokEntry.save();
      }
    }

    // Buat log produk - TAMBAHKAN tanggalKadaluarsa di sini
    const newLog = new LogProduk({
      produk: produkExists._id,
      stok,
      isProdukMasuk,
      harga,
      tanggal,
      tanggalKadaluarsa,
      createdBy,
      stokRecord: stokRecords,
    });

    await newLog.save();
    return res.status(201).json({
      LogProduk: newLog,
      message: "Log produk berhasil disimpan",
    });
  } catch (error) {
    console.error("Error di insertLog:", error);
    return res.status(500).json({
      msg: "Server error",
      error: error.message,
    });
  }
};

export const createLog = async (req, res) => {
  try {
    await insertLog(req, res);
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getAllLogs = async (req, res) => {
  try {
    const logs = await LogProduk.find()
      .populate({
        path: "produk",
        model: "Produk",
      })
      .lean()
      .exec();
    res.json({ LogProduk: logs });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getLogById = async (req, res) => {
  try {
    const log = await LogProduk.findById(req.params.id).populate("produk");
    if (!log) {
      return res.status(404).json({ msg: "Log tidak ditemukan" });
    }
    res.json(log);
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateLog = async (req, res) => {
  try {
    // 1. Cari log berdasarkan ID yang diberikan di params
    const log = await LogProduk.findById(req.params.id);
    if (!log) {
      return res.status(404).json({ msg: "Log tidak ditemukan" });
    }

    // 2. Cari kode produk yang baru diperbaharui
    const produk = await Produk.findOne({
      kode_produk: req.body.kode_produk,
    });
    if (!produk) {
      return res.status(404).json({ msg: "Produk tidak ditemukan" });
    }

    // 3. Update log dengan data yang baru
    const updatedLog = await LogProduk.findById(req.params.id);
    let stokRecords = updatedLog.stokRecord;
    if (updatedLog.stok !== req.body.stok) {
      const selisih = updatedLog.stok - req.body.stok;
      if (updatedLog.isProdukMasuk) {
        for (const [recordId, stock] of updatedLog.stokRecord) {
          const stokData = await Stok.findById(recordId);
          stokData.stok -= selisih;
          await stokData.save();
        }
      } else {
        // ini kl selisih > 0, brrti stok yg tersisa akan ditambah
        if (selisih > 0) {
          let stokToAdd = selisih;
          let stokRecordReverse = [...updatedLog.stokRecord.entries()];
          stokRecordReverse.reverse();

          for (const [recordId, stock] of stokRecordReverse) {
            const stokData = await Stok.findById(recordId);
            if (stokToAdd >= stock) {
              stokData.stok += stock;
              stokToAdd -= stock;
              stokRecords.delete(recordId);
            } else {
              stokData.stok += stokToAdd;
              stokRecords.set(recordId, stock - stokToAdd);
              stokToAdd = 0;
            }
            await stokData.save();
            if (stokToAdd <= 0) {
              break;
            }
          }
          // ini kl selisih < 0, brrti stok yg tersisa akan dikurang
        } else {
          const stoks = await Stok.find({
            produk: produk._id,
            stok: { $gt: 0 },
            tanggalKadaluarsa: { $gte: new Date() },
          }).sort({ tanggalKadaluarsa: 1 });

          let totalStok = stoks.reduce((total, stok) => total + stok.stok, 0);
          if (totalStok < selisih) {
            return res.status(400).json({
              msg: "Stok tidak mencukupi",
            });
          }

          if (stoks.length > 0) {
            let index = 0;
            let stokToRemove = -selisih;
            while (stokToRemove > 0) {
              if (stoks[index].stok >= stokToRemove) {
                stoks[index].stok -= stokToRemove;
                stokRecords.set(stoks[index].id, stokToRemove);
                stokToRemove = 0;
                await stoks[index].save();
                break;
              } else {
                stokToRemove -= stoks[index].stok;
                stokRecords.set(stoks[index].id, stoks[index].stok);
                stoks[index].stok = 0;
                await stoks[index].save();
                index++;
                if (index >= stoks.length) {
                  return res.status(400).json({
                    msg: "Stok tidak cukup untuk mengurangi",
                  });
                }
              }
            }
          }
        }
      }
      produk.save();
    }

    updatedLog.harga = req.body.harga;
    updatedLog.kode_produk = req.body.kode_produk;
    updatedLog.tanggal = req.body.tanggal;
    updatedLog.stok = req.body.stok;
    updatedLog.stokRecord = stokRecords;
    updatedLog.save();

    console.log("updated log: ", updatedLog);
    res.json({
      msg: "Log dan Produk berhasil diperbarui",
      updatedLog,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const deleteLog = async (req, res) => {
  try {
    const deletedLog = await LogProduk.findByIdAndDelete(req.params.id);

    if (!deletedLog) {
      return res.status(404).json({ msg: "Log tidak ditemukan" });
    }

    // const produk = await Produk.findById(deletedLog.produk);
    // if (!produk) {
    //   return res.status(404).json({ msg: "Produk tidak ditemukan" });
    // }

    if (deletedLog.isProdukMasuk) {
      for (const [recordId, stock] of deletedLog.stokRecord) {
        const stokData = await Stok.findById(recordId);
        stokData.stok -= stock;
        await stokData.save();
      }
    } else {
      for (const [recordId, stock] of deletedLog.stokRecord) {
        const stokData = await Stok.findById(recordId);
        stokData.stok += stock; // kl barang keluar dihapus, berarti stoknya kembali
        await stokData.save();
      }
    }
    // produk.save();

    res.json({ msg: "Log berhasil dihapus", LogProduk: deletedLog });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};
