import exp from 'express'
import {CourseModel} from '../Models/CourseModel.js'
import {UserModel} from '../Models/UserModel.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Middleware to verify JWT token and check role
export const verifyToken = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({ message: "No token provided" });
            }
            
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            
            // If roles are specified, check if user's role is allowed
            if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ message: "Insufficient permissions" });
            }
            
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ message: "Invalid token", error: err.message });
        }
    };
};

export const instructorApp=exp.Router()

//Create Course 
instructorApp.post("/course",verifyToken("INSTRUCTOR"),async(req,res)=>{
    //get courseobj from client
    const courseObj=req.body

    //get user from token
    let user=req.user

    //check if instructor exists
    let instructor=await UserModel.findById(courseObj.instructor)

    //if instrutor not found
    if(!instructor)
    {
        return res.status(404).json({message:"Invalid Instructor! Instructor does not exist"})
    }
    
    //if logged in instructor and instructor from course obj do no match
    if(instructor.email!==user.email){
        return res.status(403).json({message:"You are not the Authorized Instructor"})
    }

    //create course document
    const newCourseDoc=new CourseModel(courseObj)

    //save document into database
    await newCourseDoc.save()
    
    //res
    res.status(201).json({message:"Course Created Successfully"})
})

//Read All Own Courses
instructorApp.get("/courses",verifyToken("INSTRUCTOR"),async(req,res)=>{
  //get instructor id from Token
  const instructorIdOfToken=req.user?.id;
  //get courses by Instructor Id
  const courseList=await CourseModel.find({instructor:instructorIdOfToken})
  res.status(200).json({message:"All Courses created by You",payload:courseList})
})

//Update a Course
instructorApp.put("/course",verifyToken("INSTRUCTOR"),async(req,res)=>{
    //get instructor id from decoded token
    const instructorIdofToken=req.user?.id;

    //get modified course from client
    const {courseId,title,category,content}=req.body;

    //find course by if and update
    const modifiedCourse=await CourseModel.findOneAndUpdate(
        {_id:courseId,instructor:instructorIdofToken},
        {$set: {title,category,content}},
        {new:true});

    //if modified course does not exist
    if(!modifiedCourse)
    {
        //send res that not authorized to edit
        return res.status(403).json({message:"You are not Authorized to edit the Course"})    
    }

    //send res
    res.status(200).json({message:"Course is updated",payload:modifiedCourse})
})

//Protected Instructor Route Delete/Deactivate his Course(Soft Delete)
instructorApp.patch("/courses/activate",verifyToken("INSTRUCTOR"),async(req,res)=>{
    //get instructor id from Token
    const instructorId=req.user?.id;

    //get course id from the body
    const {courseId,isCourseActive}=req.body;

    //get course by id
    const courseOfDb=await CourseModel.findOne({_id: courseId,instructor:instructorId});

    //check if course found
    if(!courseOfDb)
    {
        //Return course not found
        return res.status(403).json({message:"Course not Found||Not Authorized Instructor"})
    }

    //check status
    if(isCourseActive===courseOfDb.isCourseActive){
        return res.status(200).json({message:"Course already in the same state"})
    }
    //Update isCourseActive property to true
    courseOfDb.isCourseActive=isCourseActive;

    //Save the changes to DB
    await courseOfDb.save();

    //send res
    res.status(200).json({message:"Course is Deactivated",payload:courseOfDb})
})


//Protected Instructor Route Activate his Course
instructorApp.patch("/courses/deactivate",verifyToken("INSTRUCTOR"),async(req,res)=>{
    //get instructor id from Token
    const instructorId=req.user?.id;

    //get course id from the body
    const {courseId,isCourseActive}=req.body;

    //get course by id
    const courseOfDb=await CourseModel.findOne({_id: courseId,instructor:instructorId});

    //check if course found
    if(!courseOfDb)
    {
        //Return course not found
        return res.status(403).json({message:"Course not Found||Not Authorized Instructor"})
    }

    //check status
    if(isCourseActive===courseOfDb.isCourseActive){
        return res.status(200).json({message:"Course already in the same state"})
    }
    //Update isCourseActive property to true
    courseOfDb.isCourseActive=isCourseActive;

    //Save the changes to DB
    await courseOfDb.save();

    //send res
    res.status(200).json({message:"Course is Activated",payload:courseOfDb})
})