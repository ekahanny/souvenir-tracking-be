import { mongoose } from "mongoose";

const uri = "mongodb://127.0.0.1:27017/souvenir_db";
export default mongoose.connect(uri);
