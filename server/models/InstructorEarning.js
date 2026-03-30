const mongoose = require('mongoose');

const InstructorEarningSchema = new mongoose.Schema({
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
    studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    saleAmount:       { type: Number, required: true }, // Full course price paid by student
    platformFee:      { type: Number, required: true }, // 2% kept by CourseLelo
    instructorAmount: { type: Number, required: true }, // 98% owed to instructor

    status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
    },
    razorpayPayoutId:  { type: String, default: null },
    razorpayContactId: { type: String, default: null },
    payoutNote:        { type: String, default: null },
    paidAt:            { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('InstructorEarning', InstructorEarningSchema);
