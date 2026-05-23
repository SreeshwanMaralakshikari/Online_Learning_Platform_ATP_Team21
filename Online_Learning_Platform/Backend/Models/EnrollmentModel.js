import {Schema,model,Types} from 'mongoose';


const enrollmentSchema=new Schema({
    student:{
        type: Types.ObjectId,
        ref:"user",
        required:[true,"User ID is Required"]
    },
    course:{
        type: Types.ObjectId,
        ref:"course",
        required:[true,"Course ID is Required"]
    },

    payment:{
        type: Types.ObjectId,
        ref:"payment",
        required:[true,"Payment ID is Required"]
    },

    enrolledAt:{
        type: Date,
        default: Date.now
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100  
    },
    timeSpentMinutes: {
        type: Number,
        default: 0,
        min: 0
    },
    lastStudiedAt: {
        type: Date
    },
   completedChapter: [{
    chapterId: {
      type: Types.ObjectId,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
    }],
    status: {
        type: String,
        enum: ["Enrolled","In Progress","Completed","Dropped"],
        default: "Enrolled"
    },
},{
    versionKey: false,
    timestamps: true,
    strict: "throw"
});

//To ensure that it gives a Unique Index for Each Student who enrolls in each course
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export const EnrollmentModel=model("enrollment",enrollmentSchema);
