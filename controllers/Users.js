import Users from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export const getUser = async (req, res) => {
  try {
    const user = await Users.findOne(
      { _id: req.userId },
      { refreshToken: 0, password: 0 }
    );
    res.json({ user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Tambahkan di controller User
export const getUserById = async (req, res) => {
  try {
    const user = await Users.findById(req.params.id).select(
      "-password -refreshToken"
    ); // Exclude sensitive data

    if (!user) {
      return res.status(404).json({ msg: "User tidak ditemukan" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const register = async (req, res) => {
  const { username, nama, email, password, confPassword } = req.body;

  // if password and confirm is not same
  if (password !== confPassword) {
    return res
      .status(400)
      .json({ msg: "Password dan confirm password tidak cocok!" });
  }
  const hashPassword = bcrypt.hashSync(password, 10);
  try {
    await Users.create({
      nama: nama,
      username: username,
      email,
      password: hashPassword,
    });
    res.json({ msg: "Register Berhasil!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const user = await Users.findOne({ username: req.body.username });
    if (!user) {
      return res.status(404).json({ msg: "Username tidak ditemukan" });
    }

    const match = bcrypt.compareSync(req.body.password, user.password);

    if (!match) {
      return res.status(400).json({ msg: "Password salah" });
    }

    const userId = user._id.toString();
    const name = user.name;
    const username = user.username;
    const email = user.email;
    const password = user.password;

    const accessToken = jwt.sign(
      { userId, name, username, email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({ accessToken, username, email });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server error" });
  }
};

export const updateUsername = async (req, res) => {
  try {
    const { newUsername } = req.body;
    const userId = req.userId; // Diambil dari middleware JWT

    // Cek apakah username baru sudah dipakai oleh user lain
    const existingUser = await Users.findOne({ username: newUsername });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({ msg: "Username sudah digunakan" });
    }

    // Update username
    await Users.findByIdAndUpdate(userId, { username: newUsername });

    // Generate token baru dengan username yang diperbarui
    const user = await Users.findById(userId);
    const accessToken = jwt.sign(
      {
        userId: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      msg: "Username berhasil diubah",
      accessToken,
      username: newUsername,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Fungsi untuk update password terbaru
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validasi password baru
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ msg: "Password baru tidak cocok" });
    }

    // Dapatkan user dari token akses biasa (bukan reset token)
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await Users.findById(decoded.userId);
    if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });

    // Verifikasi password saat ini
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Password saat ini salah" });
    }

    // Update password
    const hashPassword = await bcrypt.hash(newPassword, 10);
    await Users.findByIdAndUpdate(decoded.userId, { password: hashPassword });

    res.json({ msg: "Password berhasil diubah" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      msg: "Server error",
      error: error.message,
    });
  }
};
