import exp from 'express'
import {config} from 'dotenv'
import {connect} from 'mongoose'
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import {studentApp} from "./APIs/StudentAPI.js";
import {instructorApp} from "./APIs/InstructorAPI.js";
import {adminApp} from "./APIs/AdminAPI.js";
import {commonApp} from "./APIs/CommonAPI.js";

config();

const app=exp();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//CORS middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

//body parser middleware
app.use(exp.json());
//add cookie parser middleware
app.use(cookieParser());
app.use("/uploads", exp.static(path.join(__dirname, "uploads")));

//health check route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "ATP Pro API is running",
    routes: ["/auth", "/student-api", "/instructor-api", "/admin-api"],
  });
});

//path level middleware
    //user
    app.use("/student-api",studentApp);
    //author
    app.use("/instructor-api",instructorApp);
    //admin
    app.use("/admin-api",adminApp);
    //for common operations
    app.use("/auth",commonApp)

//connect to db
const connectDB=async()=>{
    try
    {
        await connect(process.env.DB_URL);
        console.log("DB Server connected");
        //asssign port
        const port=process.env.PORT || 1935
        app.listen(port,()=>console.log(`server listening on ${port}...`));
    }
    catch(err)
    {
        console.log("err in db connect",err.message);
    }
};

connectDB();

//to handle invalid path
app.use((req,res,next)=>{
    console.log(req.url)
    res.status(404).json({message:`Path ${req.url} is Invalid `});
})

//Error handling middleware
app.use((err, req, res, next) => {
  console.log("Error name:", err.name);
  console.log("Error code:", err.code);
  console.log("Error cause:", err.cause);
  console.log("Full error:", JSON.stringify(err, null, 2));
  //ValidationError
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "error occurred", error: err.message });
  }
  //CastError
  if (err.name === "CastError") {
    return res.status(400).json({ message: "error occurred", error: err.message });
  }
  const errCode = err.code ?? err.cause?.code ?? err.errorResponse?.code;
  const keyValue = err.keyValue ?? err.cause?.keyValue ?? err.errorResponse?.keyValue;

  if (errCode === 11000) {
    const field = Object.keys(keyValue)[0];
    const value = keyValue[field];
    return res.status(409).json({
      message: "error occurred",
      error: `${field} "${value}" already exists`,
    });
  }

  //send server side error
  res.status(500).json({ message: "error occurred", error: "Server side error" });
});
