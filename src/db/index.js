import { mongoose } from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB= async ()=>{
    try {
      const connectionInstance =   await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
      console.log(`\n MongoDB connected ! DB host -> ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("Error:",error)
        //forcefully terminates any ongoing process 0->task successful any non zero-> task failed
        process.exit(1)
    }
}

export default connectDB