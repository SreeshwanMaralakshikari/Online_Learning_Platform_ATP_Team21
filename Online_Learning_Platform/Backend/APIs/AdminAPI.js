import exp from 'express';
import { verifyToken } from '../Middlewares/verifyToken.js';
import { UserModel } from '../Models/UserModel.js';
import { CourseModel } from '../Models/CourseModel.js';
import { EnrollmentModel } from '../Models/EnrollmentModel.js';

export const adminApp=exp.Router();

//Protected Admin Route to get All Users
adminApp.get("/users",verifyToken("ADMIN"),async(req,res)=>{
    //read all users
    const userList=await UserModel.find({isUserActive: true});
    //send res
    res.status(200).json({message: "All Users",payload: userList})
})

adminApp.patch("/users/deactivate",verifyToken("ADMIN"),async(req,res)=>{
    //get user id from the body
    const {userId,isUserActive}=req.body;

    //get user by id
    const userOfDb=await UserModel.findOne({_id: userId});

    //check if user found
    if(!userOfDb)
    {
        //Return user not found
        return res.status(403).json({message:"User not Found"})
    }

    //check status
    if(isUserActive===userOfDb.isUserActive){
        return res.status(200).json({message:"User already in the same state"})
    }
    //Update isUserActive property to false
    userOfDb.isUserActive=isUserActive;
    await userOfDb.save();

    //send res
    res.status(200).json({message:"User is Deactivated",payload:userOfDb})
})


adminApp.patch("/users/activate",verifyToken("ADMIN"),async(req,res)=>{
    //get user id from the body
    const {userId,isUserActive}=req.body;

    //get user by id
    const userOfDb=await UserModel.findOne({_id: userId});

    //check if user found
    if(!userOfDb)
    {
        //Return user not found
        return res.status(403).json({message:"User not Found"})
    }

    //check status
    if(isUserActive===userOfDb.isUserActive){
        return res.status(200).json({message:"User already in the same state"})
    }

    //Update isUserActive property to true
    userOfDb.isUserActive=isUserActive;
    await userOfDb.save();

    //send res
    res.status(200).json({message:"User is Activated",payload:userOfDb})
})

//Protected Admin Route to Soft Delete a User
adminApp.delete("/users/:userId", verifyToken("ADMIN"), async (req, res) => {
    const { userId } = req.params;

    const userOfDb = await UserModel.findByIdAndUpdate(userId, { isUserActive: false }, { new: true });

    if (!userOfDb) {
        return res.status(404).json({ message: "User not Found" });
    }

    res.status(200).json({ message: "User account has been soft-deleted", payload: userOfDb });
});

//Protected Admin Route to get All Courses
adminApp.get("/courses",verifyToken("ADMIN"),async(req,res)=>{
    //read all courses
    const courseList=await CourseModel.find({isCourseActive: true});
    //send res
    res.status(200).json({message: "All Courses",payload: courseList})
})

//Protected Admin Route to get enrollment analytics
adminApp.get("/analytics",verifyToken("ADMIN"),async(req,res)=>{
    try {
        const [courses,enrollments]=await Promise.all([
            CourseModel.find({}).select("title category isCourseActive").lean(),
            EnrollmentModel.find({status: {$ne:"Dropped"}})
                .populate("student","firstName lastName email")
                .populate("course","title category isCourseActive")
                .lean()
        ]);

        const courseStatsMap=new Map();
        for(const course of courses) {
            courseStatsMap.set(String(course._id), {
                courseId: String(course._id),
                title: course.title,
                category: course.category,
                isCourseActive: course.isCourseActive,
                enrollmentCount: 0,
                completedCount: 0,
                inProgressCount: 0
            });
        }

        const studentStatsMap=new Map();

        for(const enrollment of enrollments) {
            const courseId=String(enrollment.course?._id || enrollment.course);
            const studentId=String(enrollment.student?._id || enrollment.student);

            if(courseStatsMap.has(courseId)) {
                const courseStats=courseStatsMap.get(courseId);
                courseStats.enrollmentCount += 1;
                if(enrollment.status==="Completed") courseStats.completedCount += 1;
                if(enrollment.status==="In Progress") courseStats.inProgressCount += 1;
            }

            if(enrollment.student) {
                const existingStudentStats=studentStatsMap.get(studentId) || {
                    studentId,
                    name: [enrollment.student.firstName,enrollment.student.lastName].filter(Boolean).join(" ") || "Student",
                    email: enrollment.student.email,
                    completedCourses: 0,
                    totalEnrollments: 0
                };

                existingStudentStats.totalEnrollments += 1;
                if(enrollment.status==="Completed") existingStudentStats.completedCourses += 1;
                studentStatsMap.set(studentId, existingStudentStats);
            }
        }

        const courseEnrollmentCounts=Array.from(courseStatsMap.values())
            .sort((a,b)=>b.enrollmentCount-a.enrollmentCount || a.title.localeCompare(b.title));

        const leaderboard=Array.from(studentStatsMap.values())
            .filter((student)=>student.completedCourses>0)
            .sort((a,b)=>b.completedCourses-a.completedCourses || b.totalEnrollments-a.totalEnrollments || a.name.localeCompare(b.name))
            .slice(0,10);

        res.status(200).json({
            message:"Admin analytics",
            payload:{
                courseEnrollmentCounts,
                leaderboard,
                totalEnrollments: enrollments.length,
                completedEnrollments: enrollments.filter((enrollment)=>enrollment.status==="Completed").length
            }
        });
    } catch (err) {
        console.error("[Admin Analytics Error]", err.message || JSON.stringify(err));
        console.error(err.stack);
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
})

adminApp.patch("/courses/deactivate",verifyToken("ADMIN"),async(req,res)=>{
    //get course id from the body
    const {courseId,isCourseActive}=req.body;

    //get course by id
    const courseOfDb=await CourseModel.findOne({_id: courseId});

    //check if course found
    if(!courseOfDb)
    {
        //Return course not found
        return res.status(403).json({message:"Course not Found"})
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


adminApp.patch("/courses/activate",verifyToken("ADMIN"),async(req,res)=>{
    //get course id from the body
    const {courseId,isCourseActive}=req.body;

    //get course by id
    const courseOfDb=await CourseModel.findOne({_id: courseId});

    //check if course found
    if(!courseOfDb)
    {
        //Return course not found
        return res.status(403).json({message:"Course not Found"})
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


export default adminApp;
