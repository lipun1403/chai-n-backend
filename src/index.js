// use only for method 1
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";

import connectDB from "./db/index.js";
import dotenv from "dotenv"
// when use import for dotenv, use -r dotenv/config --experimental-json-modules in scripts/dev in package.json
dotenv.config({
    path: './env'
})
// method 2
connectDB();





/* method 1
// connecting database via IIFI
// ; for cleaning only
import express from "express";
const app = express();

;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        app.on("error", (error)=>{
            console.log("ERROR: ", error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ",error);
        throw error;
    }
})()

*/