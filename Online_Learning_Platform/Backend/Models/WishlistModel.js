import { Schema, model, Types } from 'mongoose';

const wishlistSchema = new Schema({
    student: {
        type: Types.ObjectId,
        ref: "user",
        required: [true, "User ID is Required"]
    },
    course: {
        type: Types.ObjectId,
        ref: "course",
        required: [true, "Course ID is Required"]
    },
    savedAt: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
});

wishlistSchema.index({ student: 1, course: 1 }, { unique: true });

export const WishlistModel = model("wishlist", wishlistSchema);
