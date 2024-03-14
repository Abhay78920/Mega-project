import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
//In this code snippet, app.use() is being used to integrate CORS (Cross-Origin Resource Sharing) middleware into an Express.js application. CORS is a security feature implemented by web browsers that restricts cross-origin HTTP requests initiated from scripts running on a web page. It allows servers to specify who can access its resources, thus preventing unauthorized access to sensitive data.
app.use(cors({
    Credential:true,
    origin: process.env.CORS_ORIGIN
}))
//When a client submits a form using the application/x-www-form-urlencoded content type, the data is sent in the body of the HTTP request in a URL-encoded format. This middleware parses that data and makes it available in the req.body object of the Express request object.
app.use(express.json({limit:"16kb"}))

app.use(express.urlencoded({limit:"16kb"}))
export {app}