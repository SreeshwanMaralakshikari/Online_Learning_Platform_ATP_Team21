import exp from 'express';
import { CourseModel } from '../Models/CourseModel.js';
import { UserModel } from '../Models/UserModel.js';
import { DoubtModel } from '../Models/DoubtModel.js';
import { EnrollmentModel } from '../Models/EnrollmentModel.js';
import { verifyToken } from '../Middlewares/verifyToken.js';
import { upload } from '../config/multer.js';
import { uploadToCloudinary } from '../config/cloudinaryUpload.js';

// FIX: Removed unused imports of bcrypt and jwt.

export const instructorApp = exp.Router();

// Upload course images or videos to Cloudinary and return a public URL.
instructorApp.post("/media", verifyToken("INSTRUCTOR"), upload.single("file"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded. Send a 'file' field via multipart/form-data." });
        }

        const result = await uploadToCloudinary(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );

        res.status(201).json({
            message: "Media uploaded",
            payload: {
                url: result.secure_url,
                name: req.file.originalname,
                type: req.file.mimetype,
            }
        });
    } catch (err) {
        next(err);
    }
});

// Create Course
instructorApp.post("/course", verifyToken("INSTRUCTOR"), async (req, res, next) => {
    try {
        const courseObj = req.body;
        const user = req.user;

        const instructor = await UserModel.findById(user?.id);
        if (!instructor) {
            return res.status(404).json({ message: "Logged-in instructor does not exist" });
        }

        const newCourseDoc = new CourseModel({
            ...courseObj,
            instructor: instructor._id
        });

        await newCourseDoc.save();

        res.status(201).json({ message: "Course Created Successfully" });
    } catch (err) {
        next(err);
    }
});

// Read All Own Courses
instructorApp.get("/courses", verifyToken("INSTRUCTOR"), async (req, res, next) => {
    try {
        const instructorIdOfToken = req.user?.id;
        const courseList = await CourseModel.find({ instructor: instructorIdOfToken });
        res.status(200).json({ message: "All Courses created by You", payload: courseList });
    } catch (err) {
        next(err);
    }
});

// Read doubts from students enrolled in this instructor's courses
instructorApp.get("/doubts", verifyToken("INSTRUCTOR"), async (req, res, next) => {
    try {
        const instructorId = req.user?.id;
        const courses = await CourseModel.find({ instructor: instructorId }).select("_id");
        const courseIds = courses.map((course) => course._id);

        const enrollments = await EnrollmentModel.find({
            course: { $in: courseIds },
            status: { $ne: "Dropped" }
        }).select("student course");

        const enrolledStudentIds = new Set(enrollments.map((enrollment) => String(enrollment.student)));

        const doubts = await DoubtModel.find({
            course: { $in: courseIds },
            student: { $in: Array.from(enrolledStudentIds) }
        })
            .sort({ createdAt: -1 })
            .populate("student", "firstName lastName email")
            .populate("course", "title category")
            .populate("matchedStudent", "firstName lastName email")
            .populate("repliedBy", "firstName lastName email")
            .populate("answers.student", "firstName lastName");

        res.status(200).json({ message: "Student doubts", payload: doubts });
    } catch (err) {
        next(err);
    }
});

// Reply to a doubt for one of this instructor's courses
instructorApp.patch("/doubts/:doubtId/reply", verifyToken("INSTRUCTOR"), async (req, res, next) => {
    try {
        const instructorId = req.user?.id;
        const { doubtId } = req.params;
        const { reply } = req.body;

        if (!reply || reply.trim() === "") {
            return res.status(400).json({ message: "Reply cannot be empty" });
        }

        const doubt = await DoubtModel.findById(doubtId).populate("course");
        if (!doubt || !doubt.course) {
            return res.status(404).json({ message: "Doubt not found" });
        }

        const course = await CourseModel.findOne({ _id: doubt.course._id, instructor: instructorId });
        if (!course) {
            return res.status(403).json({ message: "You can reply only to doubts from your own courses" });
        }

        const enrollment = await EnrollmentModel.findOne({
            student: doubt.student,
            course: course._id,
            status: { $ne: "Dropped" }
        });
        if (!enrollment) {
            return res.status(403).json({ message: "Student is not enrolled in this course" });
        }

        doubt.instructorReply = reply.trim();
        doubt.repliedBy = instructorId;
        doubt.repliedAt = new Date();
        doubt.status = "Answered";
        await doubt.save();

        const updatedDoubt = await DoubtModel.findById(doubt._id)
            .populate("student", "firstName lastName email")
            .populate("course", "title category")
            .populate("matchedStudent", "firstName lastName email")
            .populate("repliedBy", "firstName lastName email")
            .populate("answers.student", "firstName lastName");

        res.status(200).json({ message: "Reply sent", payload: updatedDoubt });
    } catch (err) {
        next(err);
    }
});

// Update a Course
instructorApp.put("/course", verifyToken("INSTRUCTOR"), async (req, res, next) => {
    try {
        const instructorIdofToken = req.user?.id;
        const { courseId, title, category, content, thumbnail, demoVideo, price } = req.body;

        const updates = { title, category, content };
        if (thumbnail !== undefined) updates.thumbnail = thumbnail;
        if (demoVideo !== undefined) updates.demoVideo = demoVideo;
        if (price !== undefined) updates.price = Number(price);

        const modifiedCourse = await CourseModel.findOneAndUpdate(
            { _id: courseId, instructor: instructorIdofToken },
            { $set: updates },
            { new: true }
        );

        if (!modifiedCourse) {
            return res.status(403).json({ message: "You are not Authorized to edit the Course" });
        }

        res.status(200).json({ message: "Course is updated", payload: modifiedCourse });
    } catch (err) {
        next(err);
    }
});

// Update chapters for a course (replaces all chapters)
instructorApp.patch("/course/chapters", verifyToken("INSTRUCTOR"), async (req, res, next) => {
    try {
        const instructorId = req.user?.id;
        const { courseId, chapters } = req.body;

        if (!courseId) {
            return res.status(400).json({ message: "courseId is required" });
        }

        if (!Array.isArray(chapters)) {
            return res.status(400).json({ message: "chapters must be an array" });
        }

        const course = await CourseModel.findOne({ _id: courseId, instructor: instructorId });
        if (!course) {
            return res.status(403).json({ message: "Course not found or you are not the instructor" });
        }

        // Sanitize chapters: strip internal Mongoose fields that would cause strict schema errors
        const sanitizedChapters = chapters.map((ch) => ({
            title: ch.title || "Untitled Chapter",
            unitCount: Array.isArray(ch.units) ? ch.units.length : 0,
            units: (ch.units || []).map((u) => ({
                title: u.title || "Untitled Unit",
                textContent: u.textContent || "",
                videoContent: u.videoContent || "",
                documentContent: u.documentContent || "",
            })),
            quiz: (ch.quiz || []).map((q) => ({
                question: q.question || "",
                options: Array.isArray(q.options) ? q.options : ["", "", "", ""],
                answerIndex: Number(q.answerIndex) || 0,
            })),
        }));

        course.chapters = sanitizedChapters;
        await course.save();

        res.status(200).json({ message: "Chapters updated", payload: course });
    } catch (err) {
        next(err);
    }
});

// FIX: Merged the duplicate activate/deactivate routes into a single toggle route.
// The old code had two separate routes (/courses/activate and /courses/deactivate) with
// identical logic — both just set isCourseActive to whatever was passed in the body,
// with no enforcement of which value each should accept. Combined into one clean route.
instructorApp.patch("/courses/toggle-status", verifyToken("INSTRUCTOR"), async (req, res, next) => {
    try {
        const instructorId = req.user?.id;
        const { courseId, isCourseActive } = req.body;

        if (typeof isCourseActive !== "boolean") {
            return res.status(400).json({ message: "isCourseActive must be a boolean value" });
        }

        const courseOfDb = await CourseModel.findOne({ _id: courseId, instructor: instructorId });

        if (!courseOfDb) {
            return res.status(403).json({ message: "Course not Found or Not Authorized Instructor" });
        }

        if (isCourseActive === courseOfDb.isCourseActive) {
            return res.status(200).json({ message: "Course already in the same state" });
        }

        courseOfDb.isCourseActive = isCourseActive;
        await courseOfDb.save();

        res.status(200).json({
            message: isCourseActive ? "Course is Activated" : "Course is Deactivated",
            payload: courseOfDb
        });
    } catch (err) {
        next(err);
    }
});
