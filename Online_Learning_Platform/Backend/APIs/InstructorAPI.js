import exp from 'express'
import {CourseModel} from '../Models/CourseModel.js'
import {UserModel} from '../Models/UserModel.js'
import {DoubtModel} from '../Models/DoubtModel.js'
import {EnrollmentModel} from '../Models/EnrollmentModel.js'
import { verifyToken } from '../Middlewares/verifyToken.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { upload } from '../config/multer.js'
import { uploadToCloudinary } from '../config/cloudinaryUpload.js'

export const instructorApp=exp.Router()

// Upload course images or videos to Cloudinary and return a public URL.
// Replaces the old local-disk Busboy approach — Render's filesystem is ephemeral,
// so files saved locally are lost on every redeploy/restart.
instructorApp.post("/media", verifyToken("INSTRUCTOR"), upload.single("file"), async(req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded. Send a 'file' field via multipart/form-data." })
        }

        const result = await uploadToCloudinary(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        )

        res.status(201).json({
            message: "Media uploaded",
            payload: {
                url: result.secure_url,   // Full Cloudinary HTTPS URL — replaces /uploads/<filename>
                name: req.file.originalname,
                type: req.file.mimetype,
            }
        })
    } catch (err) {
        next(err)
    }
})

//Create Course 
instructorApp.post("/course",verifyToken("INSTRUCTOR"),async(req,res)=>{
    //get courseobj from client
    const courseObj=req.body

    //get user from token
    let user=req.user

    //check if instructor exists
    let instructor=await UserModel.findById(user?.id)

    //if instrutor not found
    if(!instructor)
    {
        return res.status(404).json({message:"Logged-in instructor does not exist"})
    }

    //create course document
    const newCourseDoc=new CourseModel({
        ...courseObj,
        instructor: instructor._id
    })

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

//Read doubts from students enrolled in this instructor's courses
instructorApp.get("/doubts",verifyToken("INSTRUCTOR"),async(req,res)=>{
    const instructorId=req.user?.id;
    const courses=await CourseModel.find({instructor:instructorId}).select("_id title category");
    const courseIds=courses.map((course)=>course._id);

    const enrollments=await EnrollmentModel.find({
        course:{$in:courseIds},
        status:{$ne:"Dropped"}
    }).select("student course");

    const enrolledStudentIds=new Set(enrollments.map((enrollment)=>String(enrollment.student)));

    const doubts=await DoubtModel.find({
        course:{$in:courseIds},
        student:{$in:Array.from(enrolledStudentIds)}
    })
        .sort({createdAt:-1})
        .populate("student","firstName lastName email")
        .populate("course","title category")
        .populate("matchedStudent","firstName lastName email")
        .populate("repliedBy","firstName lastName email")
        .populate("answers.student","firstName lastName");

    res.status(200).json({message:"Student doubts",payload:doubts})
})

//Reply to a doubt for one of this instructor's courses
instructorApp.patch("/doubts/:doubtId/reply",verifyToken("INSTRUCTOR"),async(req,res)=>{
    const instructorId=req.user?.id;
    const {doubtId}=req.params;
    const {reply}=req.body;

    if(!reply || reply.trim()==="")
    {
        return res.status(400).json({message:"Reply cannot be empty"})
    }

    const doubt=await DoubtModel.findById(doubtId).populate("course");
    if(!doubt || !doubt.course)
    {
        return res.status(404).json({message:"Doubt not found"})
    }

    const course=await CourseModel.findOne({_id:doubt.course._id,instructor:instructorId});
    if(!course)
    {
        return res.status(403).json({message:"You can reply only to doubts from your own courses"})
    }

    const enrollment=await EnrollmentModel.findOne({
        student:doubt.student,
        course:course._id,
        status:{$ne:"Dropped"}
    });
    if(!enrollment)
    {
        return res.status(403).json({message:"Student is not enrolled in this course"})
    }

    doubt.instructorReply=reply.trim();
    doubt.repliedBy=instructorId;
    doubt.repliedAt=new Date();
    doubt.status="Answered";
    await doubt.save();

    const updatedDoubt=await DoubtModel.findById(doubt._id)
        .populate("student","firstName lastName email")
        .populate("course","title category")
        .populate("matchedStudent","firstName lastName email")
        .populate("repliedBy","firstName lastName email")
        .populate("answers.student","firstName lastName");

    res.status(200).json({message:"Reply sent",payload:updatedDoubt})
})

//Update a Course
instructorApp.put("/course",verifyToken("INSTRUCTOR"),async(req,res)=>{
    //get instructor id from decoded token
    const instructorIdofToken=req.user?.id;

    //get modified course from client
    const {courseId,title,category,content,thumbnail,demoVideo}=req.body;

    const updates = {title, category, content}
    if (thumbnail !== undefined) updates.thumbnail = thumbnail
    if (demoVideo !== undefined) updates.demoVideo = demoVideo

    //find course by if and update
    const modifiedCourse=await CourseModel.findOneAndUpdate(
        {_id:courseId,instructor:instructorIdofToken},
        {$set: updates},
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
