 import { Schema, model, Types } from 'mongoose';

const doubtSchema = new Schema({
    student: {
        type: Types.ObjectId,
        ref: "user",
        required: [true, "Student ID is Required"]
    },
    course: {
        type: Types.ObjectId,
        ref: "course"
    },
    topic: {
        type: String,
        required: [true, "Topic is Required"],
        trim: true
    },
    description: {
        type: String,
        required: [true, "Doubt description is Required"],
        trim: true
    },
    audience: {
        type: String,
        enum: ["class", "instructor"],
        default: "class"
    },
    chapterTitle: {
        type: String,
        trim: true
    },
    unitTitle: {
        type: String,
        trim: true
    },
    matchedDoubt: {
        type: Types.ObjectId,
        ref: "doubt"
    },
    matchedStudent: {
        type: Types.ObjectId,
        ref: "user"
    },
    instructorReply: {
        type: String,
        trim: true
    },
    repliedBy: {
        type: Types.ObjectId,
        ref: "user"
    },
    repliedAt: {
        type: Date
    },
    answers: [{
        student: {
            type: Types.ObjectId,
            ref: "user",
            required: [true, "Answer student ID is Required"]
        },
        solution: {
            type: String,
            required: [true, "Solution is Required"],
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ["Open", "Matched", "Answered"],
        default: "Open"
    }
}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
});

export const DoubtModel = model("doubt", doubtSchema);
