import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})


connectDB() 
.then(()=>{
    app.listen(process.env.PORT, ()=>{
        console.log(`listening on port number: ${process.env.PORT}`)
    })
    
    
})
.catch((err)=>{
    console.log('Mongo connection failed:', err)
})















/*
import express from "express";

const app = express()
//always use ; before writing IIFE
;(async()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       app.on('error',()=>{
        console.log("Not able to connect to database", error);
        throw error
       })
       //if able to listen
       app.listen(process.env.PORT,()=>{
        console.log(`App is listening on ${process.env.PORT}`)
       })
    } catch (error) {
        console.log("Error", error)
        throw error
    }
})()

*/