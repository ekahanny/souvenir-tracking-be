// import { mongoose } from "mongoose";

// const uri = "mongodb://127.0.0.1:27017/souvenir_db";
// export default mongoose.connect(uri);

import mongoose from "mongoose";

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

export default connectToMongoDB;

// test
