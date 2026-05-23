import exp from 'express';
import { UserModel } from '../Models/UserModel.js';
import { verifyToken } from '../Middlewares/verifyToken.js';
import { EnrollmentModel } from '../Models/EnrollmentModel.js';
import { CourseModel } from '../Models/CourseModel.js';
import { PaymentModel } from '../Models/PaymentModel.js';
import { WishlistModel } from '../Models/WishlistModel.js';
import { DoubtModel } from '../Models/DoubtModel.js';


export const studentApp=exp.Router();

const getKeywords=(text="")=>(
    text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g," ")
        .split(/\s+/)
        .filter((word)=>word.length>3)
);

const getSimilarity=(firstText,secondText)=>{
    const firstKeywords=new Set(getKeywords(firstText));
    const secondKeywords=new Set(getKeywords(secondText));
    if(firstKeywords.size===0 || secondKeywords.size===0) return 0;

    let matches=0;
    for(const keyword of firstKeywords) {
        if(secondKeywords.has(keyword)) matches += 1;
    }

    return matches / Math.max(firstKeywords.size,secondKeywords.size);
};

//Protected Student Route to get All Courses
studentApp.get("/courses",verifyToken("STUDENT"),async(req,res)=>{
    //read all courses
    const courseList=await CourseModel.find({isCourseActive: true});
    //send res
    res.status(200).json({message: "All Courses",payload: courseList})
})

//Protected Student Route to pay for Course to Pay
studentApp.post("/pay",verifyToken("STUDENT"),async(req,res)=>{
    try {
        const { course: courseId, method, transactionId, status = "SUCCESS", amount } = req.body;
        const user=req.user;

        const student=await UserModel.findOne({email: user.email});
        if(!student){
            return res.status(404).json({message:"Invalid student. Please sign in again."})
        }

        if(student.role!="STUDENT"){
            return res.status(403).json({message:"Only students can make payments"})
        }

        if(!courseId || !method || !transactionId)
        {
            return res.status(400).json({message:"Course, payment method, and transaction ID are required"})
        }

        if(status !== "SUCCESS")
        {
            return res.status(400).json({message:"Payment is not complete"})
        }

        const course=await CourseModel.findOne({_id:courseId,isCourseActive:true});
        if(!course){
            return res.status(404).json({message:"Course not found"})
        }

        const existingEnrollment=await EnrollmentModel.findOne({
            student: student._id,
            course: course._id,
            status: {$ne:"Dropped"}
        });
        if(existingEnrollment && Number(course.price || 0) > 0){
            return res.status(400).json({message:"You are already enrolled in this course"})
        }

        const paymentAmount = Number(course.price || 0) > 0 ? Number(course.price || 0) : Number(amount || 0);
        if(Number(course.price || 0) === 0 && paymentAmount < 0)
        {
            return res.status(400).json({message:"Payment amount cannot be negative"})
        }

        const paymentObj={
            student: student._id,
            course: course._id,
            amount: paymentAmount,
            method,
            transactionId,
            status
        };

        const newPaymentDoc=new PaymentModel(paymentObj)
        await newPaymentDoc.save()

        if(existingEnrollment && paymentAmount > 0){
            existingEnrollment.payment = newPaymentDoc._id;
            await existingEnrollment.save();
        }

        res.status(201).json({message:"Payment completed successfully",payload:newPaymentDoc})
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({message:"Duplicate transaction. Please try again."})
        }
        return res.status(400).json({message:err.message || "Payment failed"})
    }
})

//Protected Student Route to view saved courses
studentApp.get("/wishlist",verifyToken("STUDENT"),async(req,res)=>{
    const studentId=req.user?.id;

    const wishlist=await WishlistModel.find({student:studentId})
        .sort({createdAt:-1})
        .populate({
            path:"course",
            match:{isCourseActive:true}
        });

    const activeWishlist=wishlist.filter((item)=>item.course);

    res.status(200).json({message:"Saved courses",payload:activeWishlist})
})

//Protected Student Route to save a course for later
studentApp.post("/wishlist",verifyToken("STUDENT"),async(req,res)=>{
    try {
        const {courseId}=req.body;
        const studentId=req.user?.id;

        if(!courseId)
        {
            return res.status(400).json({message:"Course ID is required"})
        }

        const course=await CourseModel.findOne({_id:courseId,isCourseActive:true});
        if(!course)
        {
            return res.status(404).json({message:"Course not found"})
        }

        const enrollment=await EnrollmentModel.findOne({
            student:studentId,
            course:course._id,
            status:{$ne:"Dropped"}
        });
        if(enrollment)
        {
            return res.status(400).json({message:"You are already enrolled in this course"})
        }

        const wishlistDoc=await WishlistModel.findOneAndUpdate(
            {student:studentId,course:course._id},
            {$setOnInsert:{student:studentId,course:course._id}},
            {new:true,upsert:true,setDefaultsOnInsert:true}
        ).populate("course");

        res.status(201).json({message:"Course saved for later",payload:wishlistDoc})
    } catch (err) {
        if (err.code === 11000) {
            return res.status(200).json({message:"Course already saved"})
        }
        return res.status(400).json({message:err.message || "Unable to save course"})
    }
})

//Protected Student Route to remove a saved course
studentApp.delete("/wishlist/:courseId",verifyToken("STUDENT"),async(req,res)=>{
    const studentId=req.user?.id;
    const {courseId}=req.params;

    await WishlistModel.findOneAndDelete({student:studentId,course:courseId});

    res.status(200).json({message:"Course removed from wishlist"})
})

//Protected Student Route to view posted doubts and matched peers
studentApp.get("/doubts",verifyToken("STUDENT"),async(req,res)=>{
    const studentId=req.user?.id;

    const doubts=await DoubtModel.find({student:studentId})
        .sort({createdAt:-1})
        .populate("course","title category")
        .populate("matchedStudent","firstName lastName email")
        .populate("repliedBy","firstName lastName email")
        .populate("answers.student","firstName lastName")
        .populate({
            path:"matchedDoubt",
            populate:{path:"student",select:"firstName lastName email"}
        });

    res.status(200).json({message:"Student doubts",payload:doubts})
})

//Protected Student Route to view course doubts from classmates in enrolled courses
studentApp.get("/doubts/feed",verifyToken("STUDENT"),async(req,res)=>{
    const studentId=req.user?.id;
    const {courseId}=req.query;

    const enrollmentQuery={
        student:studentId,
        status:{$ne:"Dropped"}
    };
    if(courseId) enrollmentQuery.course=courseId;

    const enrollments=await EnrollmentModel.find(enrollmentQuery).select("course");
    const courseIds=enrollments.map((enrollment)=>enrollment.course);

    if(courseId && courseIds.length===0)
    {
        return res.status(403).json({message:"You can view doubts only for enrolled courses"})
    }

    const doubts=await DoubtModel.find({
        course:{$in:courseIds},
        audience:{$ne:"instructor"}
    })
        .sort({createdAt:-1})
        .limit(30)
        .populate("student","firstName lastName")
        .populate("course","title category")
        .populate("repliedBy","firstName lastName")
        .populate("answers.student","firstName lastName");

    res.status(200).json({message:"Course doubt feed",payload:doubts})
})

//Protected Student Route to post a doubt and find a similar solved/recent peer doubt
studentApp.post("/doubts",verifyToken("STUDENT"),async(req,res)=>{
    try {
        const {courseId,topic,description,audience="class",chapterTitle,unitTitle}=req.body;
        const studentId=req.user?.id;

        if(!topic || topic.trim()==="" || !description || description.trim()==="")
        {
            return res.status(400).json({message:"Topic and doubt description are required"})
        }

        let course=null;
        if(courseId)
        {
            course=await CourseModel.findOne({_id:courseId,isCourseActive:true});
            if(!course)
            {
                return res.status(404).json({message:"Course not found"})
            }

            const enrollment=await EnrollmentModel.findOne({
                student:studentId,
                course:course._id,
                status:{$ne:"Dropped"}
            });
            if(!enrollment)
            {
                return res.status(403).json({message:"You can post doubts only for enrolled courses"})
            }
        }

        const normalizedAudience=audience==="instructor" ? "instructor" : "class";

        const recentCutoff=new Date(Date.now() - 1000 * 60 * 60 * 24 * 21);
        const recentDoubts=await DoubtModel.find({
            student:{$ne:studentId},
            audience:{$ne:"instructor"},
            createdAt:{$gte:recentCutoff},
            ...(course ? {course:course._id} : {})
        }).populate("student","firstName lastName email");

        const combinedText=`${topic} ${description}`;
        const bestMatch=normalizedAudience==="class" ? recentDoubts
            .map((doubt)=>({
                doubt,
                score:getSimilarity(combinedText,`${doubt.topic} ${doubt.description}`)
            }))
            .filter((item)=>item.score>=0.25)
            .sort((a,b)=>b.score-a.score)[0] : null;

        const newDoubt=new DoubtModel({
            student:studentId,
            course:course?._id,
            topic:topic.trim(),
            description:description.trim(),
            audience:normalizedAudience,
            chapterTitle:chapterTitle?.trim(),
            unitTitle:unitTitle?.trim(),
            matchedDoubt:bestMatch?.doubt?._id,
            matchedStudent:bestMatch?.doubt?.student?._id,
            status:bestMatch ? "Matched" : "Open"
        });

        await newDoubt.save();

        const doubtWithMatch=await DoubtModel.findById(newDoubt._id)
            .populate("course","title category")
            .populate("matchedStudent","firstName lastName email")
            .populate("repliedBy","firstName lastName email")
            .populate("answers.student","firstName lastName")
            .populate({
                path:"matchedDoubt",
                populate:{path:"student",select:"firstName lastName email"}
            });

        res.status(201).json({message:normalizedAudience==="instructor" ? "Doubt sent to instructor" : bestMatch ? "Similar learner found" : "Doubt posted",payload:doubtWithMatch})
    } catch (err) {
        return res.status(400).json({message:err.message || "Unable to post doubt"})
    }
})

//Protected Student Route to answer a classmate's doubt in an enrolled course
studentApp.post("/doubts/:doubtId/answers",verifyToken("STUDENT"),async(req,res)=>{
    try {
        const studentId=req.user?.id;
        const {doubtId}=req.params;
        const {solution}=req.body;

        if(!solution || solution.trim()==="")
        {
            return res.status(400).json({message:"Solution cannot be empty"})
        }

        const doubt=await DoubtModel.findById(doubtId);
        if(!doubt || !doubt.course)
        {
            return res.status(404).json({message:"Doubt not found"})
        }

        const enrollment=await EnrollmentModel.findOne({
            student:studentId,
            course:doubt.course,
            status:{$ne:"Dropped"}
        });
        if(!enrollment)
        {
            return res.status(403).json({message:"You can answer doubts only for enrolled courses"})
        }

        doubt.answers.push({
            student:studentId,
            solution:solution.trim()
        });
        doubt.status="Answered";
        await doubt.save();

        const updatedDoubt=await DoubtModel.findById(doubt._id)
            .populate("student","firstName lastName")
            .populate("course","title category")
            .populate("repliedBy","firstName lastName")
            .populate("answers.student","firstName lastName");

        res.status(201).json({message:"Solution posted",payload:updatedDoubt})
    } catch (err) {
        return res.status(400).json({message:err.message || "Unable to post solution"})
    }
})

//Protected Student Route to Enroll in a Course
studentApp.post("/enroll",verifyToken("STUDENT"),async(req,res)=>{
    //get courseId from body
    const enrollObj=req.body;

    //req user
    const user=req.user;

    //check user
    let student=await UserModel.findById(enrollObj.student);

    //check if the student exist
    if(!student)
    {
        return res.status(404).json({message:"Invalid Student"})
    }

    //check if it is the same student who has logged in and trying to enroll in course
    if(student.email!=user.email)
    {
        return res.status(404).json({message:"You are not the authorized author"})
    }

    const course=await CourseModel.findOne({_id:enrollObj.course,isCourseActive:true});
    if(!course)
    {
        return res.status(404).json({message:"Course not found"})
    }

    //create enrollment document
    const enrollmentDoc=new EnrollmentModel({
        ...enrollObj,
        course: course._id
    });

    //save the article document
    await enrollmentDoc.save();

    await WishlistModel.findOneAndDelete({student:student._id,course:course._id});

    //send res to author
    res.status(201).json({message:"Enrollment Successful"})
})

//Protected Student Route to View All Courses which he enrolled
studentApp.get("/course",verifyToken("STUDENT"),async(req,res)=>{
    //req user
    const studentId=req.user?.id;

    //read all active courses which the student enrolled in
    const studentCourseList=await EnrollmentModel.find({student:studentId})
        .populate({
            path: "course",
            match: { isCourseActive: true }
        })
        .populate("payment");

    const activeStudentCourseList=studentCourseList.filter((enrollment)=>enrollment.course);

    //send res
    res.status(200).json({message: "All Courses",payload: activeStudentCourseList})
})

//Protected Student Route to Drop a Course which he enrolled
studentApp.patch("/course",verifyToken("STUDENT"),async(req,res)=>{
    //req courseId and Status from req.body
    const {courseId,status,progress,timeSpentMinutes}=req.body;
    console.log(req.body);
    //get user id from token
    const studentId=req.user?.id;
    console.log(studentId);

    //get enrollment tuple from Enrollment DB
    const enrollmentOfDb=await EnrollmentModel.findOne({student:studentId,course:courseId})

    //check if enrollment data of student and course exist
    if(!enrollmentOfDb)
    {
        //Return user not found
        return res.status(403).json({message:"Enrollment details of Student with the Given Course not Found"})
    }

    const normalizedProgress = Number(progress);
    const hasProgressUpdate = Number.isFinite(normalizedProgress);
    const nextProgress = hasProgressUpdate ? Math.min(100, Math.max(0, Math.round(normalizedProgress))) : enrollmentOfDb.progress;
    const nextStatus = status || (nextProgress >= 100 ? "Completed" : nextProgress > 0 ? "In Progress" : enrollmentOfDb.status);
    const normalizedTimeSpent = Number(timeSpentMinutes);
    const hasTimeUpdate = Number.isFinite(normalizedTimeSpent) && normalizedTimeSpent > 0;

    if(!["Enrolled","In Progress","Completed","Dropped"].includes(nextStatus))
    {
        return res.status(400).json({message:"Invalid enrollment status"})
    }

    if(nextStatus===enrollmentOfDb.status && nextProgress===enrollmentOfDb.progress && !hasTimeUpdate)
    {
        return res.status(200).json({message:"Enrollment already in the same state"})
    }

    //Update status and progress properties
    enrollmentOfDb.status=nextStatus;
    enrollmentOfDb.progress=nextStatus==="Completed" ? 100 : nextProgress;
    if(hasTimeUpdate) {
        enrollmentOfDb.timeSpentMinutes = Number(enrollmentOfDb.timeSpentMinutes || 0) + Math.min(180, Math.max(1, Math.round(normalizedTimeSpent)));
        enrollmentOfDb.lastStudiedAt = new Date();
    }
    await enrollmentOfDb.save();
    //send res
    res.status(200).json({message: "Dropped Enrollment Details",payload: enrollmentOfDb})
})

//Protected Route to Add Review to Course
studentApp.put("/course",verifyToken("STUDENT"),async(req,res)=>{
    //get body from req
    const {courseId,rating,comment}=req.body;

    //check course
    const courseDocument=await CourseModel.findOne({_id:courseId,isCourseActive:true}).populate("reviews.student");

    //if course not Found
    if(!courseDocument)
    {
        return res.status(404).json({message:"Course not Found"});
    }

    //get student id from token
    const studentIdOfToken=req.user?.id;

    //comment validation
    if(!comment||comment.trim()==="")
    {
        return res.status(400).json({message:"Comment cannot be Empty"})
    }

    //add comment to comment arrays of course document
    courseDocument.reviews.push({student:studentIdOfToken,rating: rating,comment:comment})

    //save
    await courseDocument.save();

    //get updated course document
    const updatedCourse=await CourseModel.findById(courseId).populate("reviews.student");

    //send res
    res.status(200).json({message:"Comment Added Successfully",payload:updatedCourse})
})




export default studentApp;
