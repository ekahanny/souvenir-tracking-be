import { mongoose } from "mongoose";

const uri = "mongodb://127.0.0.1:27017/ims_db";
export default mongoose.connect(uri);
