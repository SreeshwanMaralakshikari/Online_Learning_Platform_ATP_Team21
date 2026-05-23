import exp from 'express';
import {config} from 'dotenv';
import { UserModel } from '../Models/UserModel.js';
import { CourseModel } from '../Models/CourseModel.js';
import { hash, compare } from "bcryptjs";
import { verifyToken } from "../Middlewares/verifyToken.js";
import jwt from 'jsonwebtoken';

config();

export const commonApp=exp.Router();

const {sign}=jwt;

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

//Route for register
commonApp.post("/register", async(req,res,next) => {
  try {
    let allowedRoles = ["STUDENT","INSTRUCTOR"];
    //get user from req
    const newUser = req.body;
    console.log(newUser);
    console.log(req.file);

    //check role
    if (!allowedRoles.includes(newUser.role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    //run validators manually
    if(!newUser.password || newUser.password.trim().length===0) 
    {
        return res.status(400).json({message:"Password cannot be empty or spaces only"});
    }

    //hash password and replace plain with hashed one
    newUser.password = await hash(newUser.password, 12);

    //create New user document
    const newUserDoc = new UserModel(newUser);

    //save document
    await newUserDoc.save();
    //send res
    res.status(201).json({ message: "User created" });
  } catch (err) {
    console.error("[Register Error]", err.message || JSON.stringify(err));
    console.error(err.stack);
    res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
  }
});


// Route for Login
commonApp.post("/login",async(req,res)=>{
    try {
        //no need to check for roles accepted to login because if correct role entered then only login
        //const allowedRolesToLogin=["STUDENT","INSTRUCTOR","ADMIN"];
        //get user cred obj from req
        const {email,password}=req.body;

        //find user by email
        const user=await UserModel.findOne({email:email, isUserActive: true});

        //if user not found
        if(!user){
            return res.status(400).json({message:"Invalid Email"});
        }

        //compare password
        const isMatched=await compare(password,user.password);

        //if passwords not matched
        if(!isMatched)
        {
            return res.status(400).json({message: "Invalid Password"});
        }

        //create jwt(jsonwebtoken)
        const signedToken=createAuthToken(user);

        res.cookie("token",signedToken,{
            httpOnly:true,
            secure:false,
            sameSite:"lax"
        })

        //send res to user
        res.status(200).json({message:"Login Success",payload:sanitizeUser(user)})
    } catch (err) {
        console.error("[Login Error]", err.message || JSON.stringify(err));
        console.error(err.stack);
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
})

//Forgot Password
commonApp.put("/forgot-password", async(req,res)=>{
    try {
        const {email,newPassword}=req.body;

        if(!email || email.trim().length===0) {
            return res.status(400).json({message:"Email is required"});
        }

        if(!newPassword || newPassword.trim().length===0) {
            return res.status(400).json({message:"Password cannot be empty or spaces only"});
        }

        const userDocument=await UserModel.findOne({email:email.trim()});

        if(!userDocument) {
            return res.status(404).json({message:"No account found with this email"});
        }

        userDocument.password=await hash(newPassword,12);
        await userDocument.save();

        res.status(200).json({message:"Password reset successfully. Please login with your new password"});
    } catch (err) {
        console.error("[Forgot Password Error]", err.message || JSON.stringify(err));
        console.error(err.stack);
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
})

//Route for Logout
commonApp.get("/logout",(req,res)=>{
    //delete token from cookie storage
    res.clearCookie("token",{
        httpOnly:true,
        secure:false,
        sameSite:"lax"
    })
    //send res
    res.status(200).json({message:"Logout Success"});
})

//Public route for homepage course previews
commonApp.get("/courses", async(req,res,next)=>{
    try {
        const courseList = await CourseModel.find({isCourseActive:true});
        res.status(200).json({message:"All active courses",payload:courseList});
    } catch (err) {
        next(err);
    }
})

//Page Refresh - Check if user is already authenticated
commonApp.get("/check-auth", async(req,res)=>{
    try {
        const token = req.cookies.token;
        
        if (!token) {
            return res.status(200).json({
                authenticated:false,
                message:"No user logged in",
                payload:null
            });
        }
        
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        res.status(200).json({
            authenticated:true,
            message:"authenticated",
            payload:decoded
        })
    } catch (err) {
        return res.status(200).json({
            authenticated:false,
            message:"Invalid or expired token",
            payload:null
        });
    }
})

//Get logged-in user profile
commonApp.get("/profile", verifyToken("STUDENT","INSTRUCTOR","ADMIN"), async(req,res)=>{
    try {
        const userDocument = await UserModel.findById(req.user?.id);

        if (!userDocument) {
            return res.status(404).json({message:"User not found"});
        }

        res.status(200).json({message:"Profile loaded", payload:sanitizeUser(userDocument)});
    } catch (err) {
        console.error("[Profile Load Error]", err.message || JSON.stringify(err));
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
})

//Update logged-in user profile
commonApp.put("/profile", verifyToken("STUDENT","INSTRUCTOR","ADMIN"), async(req,res)=>{
    try {
        const allowedUpdates = ["firstName", "lastName", "email", "profileImageUrl", "headline", "bio", "location", "phone"];
        const updates = {};

        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = typeof req.body[key] === "string" ? req.body[key].trim() : req.body[key];
            }
        }

        if (!updates.firstName) {
            return res.status(400).json({message:"First name is required"});
        }

        if (!updates.email) {
            return res.status(400).json({message:"Email is required"});
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            req.user?.id,
            {$set: updates},
            {new:true, runValidators:true}
        );

        if (!updatedUser) {
            return res.status(404).json({message:"User not found"});
        }

        const signedToken = createAuthToken(updatedUser);
        res.cookie("token", signedToken, {
            httpOnly:true,
            secure:false,
            sameSite:"lax"
        });

        res.status(200).json({message:"Profile updated", payload:sanitizeUser(updatedUser)});
    } catch (err) {
        console.error("[Profile Update Error]", err.message || JSON.stringify(err));
        if (err.code === 11000) {
            return res.status(409).json({message:"Email already exists"});
        }
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
})

//Change Password
commonApp.put("/password",verifyToken("STUDENT","INSTRUCTOR","ADMIN"),async(req,res)=>{
    try {
        //get current password and new password
        const {currentPassword,newPassword}=req.body;

        //check current password and new password are same
        if(currentPassword===newPassword)
        {
            return res.status(400).json({message:"Current Password and New Password are same in your request"})
        }
        //get current password of student/instructor/admin
        const userIdOfToken=req.user?.id;
        const userDocument=await UserModel.findById(userIdOfToken)

        //check if user exists
        if(!userDocument)
        {
            return res.status(404).json({message:"User not found"})
        }

        //check the current password of req and user are not same
        const isMatched=await compare(currentPassword,userDocument.password)
        if(!isMatched)
        {
            return res.status(403).json({message:"Your password is incorrect. Please Enter Again"})
        } 
        //run validators manually
        if(!newPassword || newPassword.trim().length===0) 
        {
            return res.status(400).json({message:"Password cannot be empty or spaces only"});
        }

        //hash the new password
        const hashedPassword=await hash(newPassword,12)

        //replace it woth original password
        userDocument.password=hashedPassword;
        //save
        await userDocument.save();
        //send res
        res.status(201).json({message:"User Password is successfully changed"})
    } catch (err) {
        console.error("[Password Change Error]", err.message || JSON.stringify(err));
        console.error(err.stack);
        res.status(500).json({ message: "error occurred", error: err.message || "Unknown error" });
    }
})
