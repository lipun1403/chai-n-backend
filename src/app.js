import express from "express"
// cors for cross origin resource sharing i.e. letting backend talk with frontend or permitting different ports to talk with each other
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))


// to accept json files
app.use(express.json({
    limit: "16kb"
}))

// to accept request from urls
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

// 
app.use(express.static("public"))

// access and set cookies of user
app.use(cookieParser())


// Routes
import userRouter from "./routes/user.routes.js"
app.use("/api/v1/users", userRouter)    // activating the router

export { app }