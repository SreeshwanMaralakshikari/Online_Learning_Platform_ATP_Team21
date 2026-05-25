import exp from 'express';
import { verifyToken } from '../Middlewares/verifyToken.js';
import { UserModel } from '../Models/UserModel.js';
import { CourseModel } from '../Models/CourseModel.js';
import { EnrollmentModel } from '../Models/EnrollmentModel.js';

export const adminApp = exp.Router();

// Helper: strip hashed password before sending user objects to the client
function sanitizeUser(userDocument) {
    const obj = userDocument.toObject ? userDocument.toObject() : { ...userDocument };
    delete obj.password;
    return obj;
}

// Protected Admin Route to get All Users
adminApp.get("/users", verifyToken("ADMIN"), async (req, res, next) => {
    try {
        const userList = await UserModel.find({ isUserActive: true }).select("-password");
        res.status(200).json({ message: "All Users", payload: userList });
    } catch (err) {
        next(err);
    }
});

// FIX: Added try/catch to user deactivate route.
adminApp.patch("/users/deactivate", verifyToken("ADMIN"), async (req, res, next) => {
    try {
        const { userId, isUserActive } = req.body;

        const userOfDb = await UserModel.findOne({ _id: userId });

        if (!userOfDb) {
            return res.status(404).json({ message: "User not Found" });
        }

        if (isUserActive === userOfDb.isUserActive) {
            return res.status(200).json({ message: "User already in the same state" });
        }

        userOfDb.isUserActive = isUserActive;
        await userOfDb.save();

        res.status(200).json({ message: "User is Deactivated", payload: sanitizeUser(userOfDb) });
    } catch (err) {
        next(err);
    }
});

// FIX: Added try/catch to user activate route.
adminApp.patch("/users/activate", verifyToken("ADMIN"), async (req, res, next) => {
    try {
        const { userId, isUserActive } = req.body;

        const userOfDb = await UserModel.findOne({ _id: userId });

        if (!userOfDb) {
            return res.status(404).json({ message: "User not Found" });
        }

        if (isUserActive === userOfDb.isUserActive) {
            return res.status(200).json({ message: "User already in the same state" });
        }

        userOfDb.isUserActive = isUserActive;
        await userOfDb.save();

        res.status(200).json({ message: "User is Activated", payload: sanitizeUser(userOfDb) });
    } catch (err) {
        next(err);
    }
});

// Protected Admin Route to Soft Delete a User
adminApp.delete("/users/:userId", verifyToken("ADMIN"), async (req, res, next) => {
    try {
        const { userId } = req.params;

        const userOfDb = await UserModel.findByIdAndUpdate(userId, { isUserActive: false }, { new: true });

        if (!userOfDb) {
            return res.status(404).json({ message: "User not Found" });
        }

        res.status(200).json({ message: "User account has been soft-deleted", payload: sanitizeUser(userOfDb) });
    } catch (err) {
        next(err);
    }
});

// Protected Admin Route to get All Courses (active and inactive)
adminApp.get("/courses", verifyToken("ADMIN"), async (req, res, next) => {
    try {
        // FIX: Admin should see ALL courses, not just active ones
        const courseList = await CourseModel.find({});
        res.status(200).json({ message: "All Courses", payload: courseList });
    } catch (err) {
        next(err);
    }
});

// Protected Admin Route to get enrollment analytics
adminApp.get("/analytics", verifyToken("ADMIN"), async (req, res, next) => {
    try {
        const [courses, enrollments] = await Promise.all([
            CourseModel.find({}).select("title category isCourseActive").lean(),
            EnrollmentModel.find({ status: { $ne: "Dropped" } })
                .populate("student", "firstName lastName email")
                .populate("course", "title category isCourseActive")
                .lean()
        ]);

        const courseStatsMap = new Map();
        for (const course of courses) {
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

        const studentStatsMap = new Map();

        for (const enrollment of enrollments) {
            const courseId = String(enrollment.course?._id || enrollment.course);
            const studentId = String(enrollment.student?._id || enrollment.student);

            if (courseStatsMap.has(courseId)) {
                const courseStats = courseStatsMap.get(courseId);
                courseStats.enrollmentCount += 1;
                if (enrollment.status === "Completed") courseStats.completedCount += 1;
                if (enrollment.status === "In Progress") courseStats.inProgressCount += 1;
            }

            if (enrollment.student) {
                const existingStudentStats = studentStatsMap.get(studentId) || {
                    studentId,
                    name: [enrollment.student.firstName, enrollment.student.lastName].filter(Boolean).join(" ") || "Student",
                    email: enrollment.student.email,
                    completedCourses: 0,
                    totalEnrollments: 0
                };

                existingStudentStats.totalEnrollments += 1;
                if (enrollment.status === "Completed") existingStudentStats.completedCourses += 1;
                studentStatsMap.set(studentId, existingStudentStats);
            }
        }

        const courseEnrollmentCounts = Array.from(courseStatsMap.values())
            .sort((a, b) => b.enrollmentCount - a.enrollmentCount || a.title.localeCompare(b.title));

        const leaderboard = Array.from(studentStatsMap.values())
            .filter((student) => student.completedCourses > 0)
            .sort((a, b) => b.completedCourses - a.completedCourses || b.totalEnrollments - a.totalEnrollments || a.name.localeCompare(b.name))
            .slice(0, 10);

        res.status(200).json({
            message: "Admin analytics",
            payload: {
                courseEnrollmentCounts,
                leaderboard,
                totalEnrollments: enrollments.length,
                completedEnrollments: enrollments.filter((enrollment) => enrollment.status === "Completed").length
            }
        });
    } catch (err) {
        console.error("[Admin Analytics Error]", err.message || JSON.stringify(err));
        next(err);
    }
});

// FIX: Merged the duplicate /courses/deactivate and /courses/activate routes into one.
// The original activate route had the wrong success message ("Course is Deactivated").
adminApp.patch("/courses/deactivate", verifyToken("ADMIN"), async (req, res, next) => {
    try {
        const { courseId } = req.body;

        const courseOfDb = await CourseModel.findOne({ _id: courseId });

        if (!courseOfDb) {
            return res.status(404).json({ message: "Course not Found" });
        }

        if (!courseOfDb.isCourseActive) {
            return res.status(200).json({ message: "Course is already deactivated" });
        }

        courseOfDb.isCourseActive = false;
        await courseOfDb.save();

        res.status(200).json({ message: "Course is Deactivated", payload: courseOfDb });
    } catch (err) {
        next(err);
    }
});

// FIX: Activate route now correctly sets isCourseActive = true and returns the right message.
adminApp.patch("/courses/activate", verifyToken("ADMIN"), async (req, res, next) => {
    try {
        const { courseId } = req.body;

        const courseOfDb = await CourseModel.findOne({ _id: courseId });

        if (!courseOfDb) {
            return res.status(404).json({ message: "Course not Found" });
        }

        if (courseOfDb.isCourseActive) {
            return res.status(200).json({ message: "Course is already active" });
        }

        courseOfDb.isCourseActive = true;
        await courseOfDb.save();

        // FIX: Was incorrectly saying "Course is Deactivated" in the activate route
        res.status(200).json({ message: "Course is Activated", payload: courseOfDb });
    } catch (err) {
        next(err);
    }
});
