import exp from 'express';
import { config } from 'dotenv';
import { UserModel } from '../Models/UserModel.js';
import { CourseModel } from '../Models/CourseModel.js';
import { hash, compare } from "bcryptjs";
import { verifyToken } from "../Middlewares/verifyToken.js";
import jwt from 'jsonwebtoken';

// dotenv config() is called once in server.js — no need to repeat it here.

export const commonApp = exp.Router();

const { sign } = jwt;

function sanitizeUser(userDocument) {
    const userObj = userDocument.toObject();
    delete userObj.password;
    return userObj;
}

function createAuthToken(user) {
    return sign({
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        headline: user.headline,
        bio: user.bio,
        location: user.location,
        phone: user.phone,
    }, process.env.SECRET_KEY, { expiresIn: "6h" });
}

// Route for register
commonApp.post("/register", async (req, res, next) => {
    try {
        let allowedRoles = ["STUDENT", "INSTRUCTOR"];
        const newUser = req.body;

        if (!allowedRoles.includes(newUser.role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        if (!newUser.password || newUser.password.trim().length === 0) {
            return res.status(400).json({ message: "Password cannot be empty or spaces only" });
        }

        newUser.password = await hash(newUser.password, 12);
        const newUserDoc = new UserModel(newUser);
        await newUserDoc.save();
        res.status(201).json({ message: "User created" });
    } catch (err) {
        console.error("[Register Error]", err.message || JSON.stringify(err));
        console.error(err.stack);
        next(err);
    }
});

// Route for Login — sends token in response body (no cookies)
commonApp.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await UserModel.findOne({ email: email, isUserActive: true });

        if (!user) {
            return res.status(400).json({ message: "Invalid Email" });
        }

        const isMatched = await compare(password, user.password);

        if (!isMatched) {
            return res.status(400).json({ message: "Invalid Password" });
        }

        // Create JWT and send in response body — frontend stores it in localStorage
        const signedToken = createAuthToken(user);

        res.status(200).json({
            message: "Login Success",
            payload: sanitizeUser(user),
            token: signedToken,
        });
    } catch (err) {
        console.error("[Login Error]", err.message || JSON.stringify(err));
        console.error(err.stack);
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
});

// Route for Logout — frontend handles localStorage removal
commonApp.get("/logout", (req, res) => {
    res.status(200).json({ message: "Logout Success" });
});

// Page Refresh — verify Bearer token from Authorization header
commonApp.get("/check-auth", verifyToken("STUDENT", "INSTRUCTOR", "ADMIN"), async (req, res) => {
    res.status(200).json({
        message: "authenticated",
        payload: req.user,
    });
});

// Public route for homepage course previews
commonApp.get("/courses", async (req, res, next) => {
    try {
        const courseList = await CourseModel.find({ isCourseActive: true });
        res.status(200).json({ message: "All active courses", payload: courseList });
    } catch (err) {
        next(err);
    }
});

// Get logged-in user profile
commonApp.get("/profile", verifyToken("STUDENT", "INSTRUCTOR", "ADMIN"), async (req, res) => {
    try {
        const userDocument = await UserModel.findById(req.user?.id);
        if (!userDocument) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "Profile loaded", payload: sanitizeUser(userDocument) });
    } catch (err) {
        console.error("[Profile Load Error]", err.message || JSON.stringify(err));
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
});

// Update logged-in user profile
commonApp.put("/profile", verifyToken("STUDENT", "INSTRUCTOR", "ADMIN"), async (req, res) => {
    try {
        const allowedUpdates = ["firstName", "lastName", "email", "profileImageUrl", "headline", "bio", "location", "phone"];
        const updates = {};

        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = typeof req.body[key] === "string" ? req.body[key].trim() : req.body[key];
            }
        }

        if (!updates.firstName) {
            return res.status(400).json({ message: "First name is required" });
        }
        if (!updates.email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            req.user?.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Issue a fresh token with updated profile data
        const signedToken = createAuthToken(updatedUser);

        res.status(200).json({
            message: "Profile updated",
            payload: sanitizeUser(updatedUser),
            token: signedToken,
        });
    } catch (err) {
        console.error("[Profile Update Error]", err.message || JSON.stringify(err));
        if (err.code === 11000) {
            return res.status(409).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
});

// Change Password
commonApp.put("/password", verifyToken("STUDENT", "INSTRUCTOR", "ADMIN"), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "Current Password and New Password are same in your request" });
        }

        const userIdOfToken = req.user?.id;
        const userDocument = await UserModel.findById(userIdOfToken);

        if (!userDocument) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatched = await compare(currentPassword, userDocument.password);
        if (!isMatched) {
            return res.status(403).json({ message: "Your password is incorrect. Please Enter Again" });
        }

        if (!newPassword || newPassword.trim().length === 0) {
            return res.status(400).json({ message: "Password cannot be empty or spaces only" });
        }

        const hashedPassword = await hash(newPassword, 12);
        userDocument.password = hashedPassword;
        await userDocument.save();
        res.status(201).json({ message: "User Password is successfully changed" });
    } catch (err) {
        console.error("[Password Change Error]", err.message || JSON.stringify(err));
        console.error(err.stack);
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
});

// Forgot Password
// SECURITY WARNING: This endpoint resets any account with only an email address — no OTP or
// verification token is required. It is intentionally disabled in production via the
// ENABLE_FORGOT_PASSWORD environment variable. Set ENABLE_FORGOT_PASSWORD=true only in
// development / demo environments, or after you have added a proper OTP/email-verification step.
commonApp.put("/forgot-password", async (req, res) => {
    if (process.env.ENABLE_FORGOT_PASSWORD !== "true") {
        return res.status(403).json({ message: "Password reset is not available. Please contact support." });
    }
    try {
        const { email, newPassword } = req.body;

        if (!email || email.trim().length === 0) {
            return res.status(400).json({ message: "Email is required" });
        }
        if (!newPassword || newPassword.trim().length === 0) {
            return res.status(400).json({ message: "Password cannot be empty or spaces only" });
        }

        const userDocument = await UserModel.findOne({ email: email.trim() });
        if (!userDocument) {
            return res.status(404).json({ message: "No account found with this email" });
        }

        userDocument.password = await hash(newPassword, 12);
        await userDocument.save();
        res.status(200).json({ message: "Password reset successfully. Please login with your new password" });
    } catch (err) {
        console.error("[Forgot Password Error]", err.message || JSON.stringify(err));
        console.error(err.stack);
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
});
