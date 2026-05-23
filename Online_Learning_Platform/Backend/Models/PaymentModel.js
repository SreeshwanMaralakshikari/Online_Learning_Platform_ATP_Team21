import {Schema,model,Types} from 'mongoose';

const paymentSchema = new Schema({
    student: {
        type: Types.ObjectId,
        ref: "user",
        required: [true, "User ID is required"]
    },

    course: {
        type: Types.ObjectId,
        ref: "course",
        required: [true, "Course ID is required"]
    },
    amount: {
        type: Number,
        required: [true, "Amount is required"],
        min: [0, "Amount cannot be negative"]
    },

    method: {
        type: String,
        enum: ["CARD", "UPI", "NET_BANKING", "WALLET"],
        required: [true, "Payment method is required"]
    },

    status: {
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED"],
        default: "PENDING"
    },

    transactionId: {
        type: String,
        required: true,
        unique: [true,"transactionId must be Unique"]
    },
    paidAt: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false,
    timestamps: true,
    strict: "throw"
});

export const PaymentModel=model("payment",paymentSchema);
