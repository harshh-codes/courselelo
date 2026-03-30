const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['learner', 'instructor', 'admin'], default: 'learner' },

    // Instructor payout fields
    bankDetails: {
        accountHolderName: { type: String },
        accountNumber:     { type: String },
        ifscCode:          { type: String },
        bankName:          { type: String },
    },
    // Razorpay Route: Linked Account ID for auto-transfers
    razorpayLinkedAccountId: { type: String, default: null },
    payoutSetupComplete:     { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

