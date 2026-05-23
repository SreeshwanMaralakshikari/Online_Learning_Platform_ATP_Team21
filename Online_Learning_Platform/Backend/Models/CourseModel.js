import {Schema,model,Types} from 'mongoose';

const reviewSchema=new Schema({
    student:{
        type: Types.ObjectId,
        ref:"user",
        required:[true,"User ID is Required"]
    },
    rating:{
        type: Number,
        min:[1,"Rating should be atleast 1"],
        max:[5,"Rating should be atmost 5"],
        required: [true,"Rating is Required"]
    },
    comment:{
        type:String,
        required:[true,"Enter Comment"]
    },
},
{
    versionKey:false,
    timestamps:true,
    strict:"throw"
});

const unitSchema=new Schema({
    title:{
        type: String,
        required: [true,"Unit Title is Required"],
        default: "Untitled Unit"
    },
    textContent:{
        type: String,
        required: [true,"Unit Content is Required"],
        minLength: [10,"Unit content should be at least 10 Characters"]
    },
    videoContent:{
        type: String
    },
    documentContent:{
        type: String
    }
},
{
    versionKey:false,
    timestamps:true,
    strict:"throw"
});

const quizQuestionSchema=new Schema({
    question:{
        type: String,
        required: [true,"Quiz question is required"]
    },
    options:{
        type: [String],
        validate: {
            validator: (options)=>Array.isArray(options) && options.filter((option)=>option && option.trim()).length >= 2,
            message: "Quiz question needs at least two options"
        },
        default: []
    },
    answerIndex:{
        type: Number,
        required: [true,"Correct answer is required"],
        min: [0,"Answer index cannot be negative"]
    }
},
{
    versionKey:false,
    timestamps:true,
    strict:"throw"
});

const chapterSchema=new Schema({
    title:{
        type: String,
        required: [true,"Chapter Title is Required"],
        default: "Untitled Chapter"
    },
    unitCount:{
        type: Number,
        default: 1,
        min: [0,"Unit count cannot be negative"]
    },
    units: [{type: unitSchema,default:[]}],
    quiz: [{type: quizQuestionSchema,default:[]}]
},
{
    versionKey:false,
    timestamps:true,
    strict:"throw"
})
;

const courseSchema=new Schema({
    instructor:
    {
        type: Types.ObjectId,
        ref: "user",
        required: [true,"Instructor ID is Required"]
    },
    title:{
        type: String,
        required: [true,"Title is Required"],
    },
    category:{
        type: String,
        required: [true,"Category is required"],
    },
    price:{
        type: Number,
        default:0
    },
    content:{
        type: String,
        required: [true,"Content is Required"]
    },
    thumbnail:{
        type: String
    },
    demoVideo:{
        type: String
    },
    chapters: [{type: chapterSchema,default:[]}],
    reviews: [{type: reviewSchema,default:[]}],

    isCourseActive:{
        type: Boolean,
        default: true
    }
},{
    versionKey: false,
    timestamps: true,
    strict: "throw"
})

//Create Course Model
export const CourseModel=model("course",courseSchema);
