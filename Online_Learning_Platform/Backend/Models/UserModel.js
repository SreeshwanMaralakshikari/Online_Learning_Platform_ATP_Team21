import {Schema,model,Types} from 'mongoose';

const userSchema=new Schema({
    firstName:{
        type: String,
        required: [true,"First Name is Required"]
    },
    lastName:{
        type: String,
    },
    email:{
        type: String,
        required: [true,"Email is Required"],
        unique: [true,"Email already Exists"]
    },
    password:{
        type: String,
        required:[true,"Password is Required"]
        //Apply Regular Expressions
    },
    role:{
        type: String,
        enum:["STUDENT","INSTRUCTOR","ADMIN"],
        required: [true,"{Value} is an Invalid Role"]
    },
    profileImageUrl:{
        type: String
    },
    headline:{
        type: String
    },
    bio:{
        type: String
    },
    location:{
        type: String
    },
    phone:{
        type: String
    },
    isUserActive:{
        type: Boolean,
        default: true
    },
},
{
   timestamps: true,
   versionKey: false,
   strict: "throw" //By Default Strict is True
});

export const UserModel=model("user",userSchema);
