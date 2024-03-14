import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
//In this code snippet, app.use() is being used to integrate CORS (Cross-Origin Resource Sharing) middleware into an Express.js application. CORS is a security feature implemented by web browsers that restricts cross-origin HTTP requests initiated from scripts running on a web page. It allows servers to specify who can access its resources, thus preventing unauthorized access to sensitive data.
app.use(cors({
    credentials: true,
    origin: process.env.CORS_ORIGIN
}))
//When a client submits a form using the application/x-www-form-urlencoded content type, the data is sent in the body of the HTTP request in a URL-encoded format. This middleware parses that data and makes it available in the req.body object of the Express request object.
app.use(express.json({ limit: "16kb" }))

app.use(express.urlencoded({ limit: "16kb" }))

app.use(express.static("public"))
app.use(cookieParser())

//routes

import  userRouter  from './routes/user.routes.js'

//routes declaration 
//ab yaha pe hum aise nahi likhenge ki app.get('/user',(req,res)=>{}) kyunki jab hum ye likh rhe the tab hum routes declaration aur controller dono katthe hi likh rhe the but ab yaha aisa nahi hai humne routes alag file mai aur controller alag file mai likhe hai toh islie hume yehi niche used syntax hi use krna hai no other options(middleware ko beech mai lana hi pdega)

app.use("/api/v1/users", userRouter)

// http://localhost:8000/users/register
export { app }


