const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');
const InstructorEarning = require('../models/InstructorEarning');

const router = express.Router();

// Razorpay Payouts API uses Basic Auth with key_id:key_secret
const rzpAuth = () => ({
    auth: {
        username: process.env.RAZORPAY_KEY_ID || '',
        password: process.env.RAZORPAY_KEY_SECRET || '',
    },
    headers: { 'Content-Type': 'application/json' },
});

// ─── GET: Payout setup status ─────────────────────────────────────────────────
router.get('/status', auth, async (req, res) => {
    try {
        if (req.user.role !== 'instructor') return res.status(403).json({ msg: 'Denied' });
        const user = await User.findById(req.user.id).select('payoutSetupComplete bankDetails');

        // Also pull earnings summary
        const [pending, paid] = await Promise.all([
            InstructorEarning.aggregate([
                { $match: { instructorId: user._id, status: 'pending' } },
                { $group: { _id: null, total: { $sum: '$instructorAmount' }, count: { $sum: 1 } } },
            ]),
            InstructorEarning.aggregate([
                { $match: { instructorId: user._id, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$instructorAmount' }, count: { $sum: 1 } } },
            ]),
        ]);

        res.json({
            payoutSetupComplete: user.payoutSetupComplete || false,
            bankDetails: user.bankDetails || null,
            pendingAmount: pending[0]?.total || 0,
            pendingCount: pending[0]?.count || 0,
            paidAmount: paid[0]?.total || 0,
            paidCount: paid[0]?.count || 0,
        });
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ─── POST: Save bank details ──────────────────────────────────────────────────
router.post('/setup', auth, async (req, res) => {
    try {
        if (req.user.role !== 'instructor') return res.status(403).json({ msg: 'Denied' });

        const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;
        if (!accountHolderName || !accountNumber || !ifscCode || !bankName) {
            return res.status(400).json({ msg: 'All bank fields are required' });
        }

        await User.findByIdAndUpdate(req.user.id, {
            bankDetails: { accountHolderName, accountNumber, ifscCode, bankName },
            payoutSetupComplete: true,
        });

        res.json({
            success: true,
            message: 'Bank details saved! Your earnings will be transferred within 3–5 business days after each sale. Platform retains 2% commission.',
        });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to save bank details', error: err.message });
    }
});

// ─── POST: Trigger payout for a specific instructor (admin or self) ───────────
// Uses Razorpay Payouts API: https://razorpay.com/docs/api/x/payouts/
router.post('/trigger', auth, async (req, res) => {
    try {
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Denied' });
        }

        const instructorId = req.user.role === 'admin' ? (req.body.instructorId || req.user.id) : req.user.id;
        const instructor = await User.findById(instructorId);

        if (!instructor.payoutSetupComplete || !instructor.bankDetails?.accountNumber) {
            return res.status(400).json({ msg: 'Instructor has not set up bank details yet.' });
        }

        // Collect all pending earnings
        const pendingEarnings = await InstructorEarning.find({ instructorId, status: 'pending' });
        if (pendingEarnings.length === 0) {
            return res.json({ success: true, message: 'No pending earnings to pay out.', amount: 0 });
        }

        const totalAmount = pendingEarnings.reduce((sum, e) => sum + e.instructorAmount, 0);
        const totalPaise = Math.round(totalAmount * 100);

        // Try Razorpay Payouts API
        let payoutId = null;
        let payoutError = null;
        try {
            // Step 1: Create a Contact
            const contactRes = await axios.post(
                'https://api.razorpay.com/v1/contacts',
                {
                    name: instructor.bankDetails.accountHolderName,
                    email: instructor.email,
                    type: 'vendor',
                    reference_id: `instructor_${instructorId}`,
                },
                rzpAuth()
            );
            const contactId = contactRes.data.id;

            // Step 2: Create a Fund Account (bank account)
            const fundRes = await axios.post(
                'https://api.razorpay.com/v1/fund_accounts',
                {
                    contact_id: contactId,
                    account_type: 'bank_account',
                    bank_account: {
                        name: instructor.bankDetails.accountHolderName,
                        ifsc: instructor.bankDetails.ifscCode,
                        account_number: instructor.bankDetails.accountNumber,
                    },
                },
                rzpAuth()
            );
            const fundAccountId = fundRes.data.id;

            // Step 3: Create the Payout
            const payoutRes = await axios.post(
                'https://api.razorpay.com/v1/payouts',
                {
                    account_number: process.env.RAZORPAY_ACCOUNT_NUMBER, // Your RazorpayX account number
                    fund_account_id: fundAccountId,
                    amount: totalPaise,
                    currency: 'INR',
                    mode: 'IMPS',
                    purpose: 'vendor_advance',
                    queue_if_low_balance: true,
                    narration: `CourseLelo instructor payout`,
                    notes: {
                        instructor_id: String(instructorId),
                        instructor_name: instructor.name,
                        earnings_count: pendingEarnings.length,
                    },
                },
                rzpAuth()
            );
            payoutId = payoutRes.data.id;

        } catch (rzpErr) {
            payoutError = rzpErr.response?.data?.error?.description || rzpErr.message;
            console.error('[PAYOUT-API-ERROR]', payoutError);
        }

        // Mark earnings based on result
        const earningIds = pendingEarnings.map(e => e._id);
        if (payoutId) {
            await InstructorEarning.updateMany(
                { _id: { $in: earningIds } },
                { status: 'paid', razorpayPayoutId: payoutId, paidAt: new Date() }
            );
            return res.json({
                success: true,
                message: `₹${totalAmount.toFixed(2)} successfully sent to ${instructor.bankDetails.bankName} ending ${instructor.bankDetails.accountNumber.slice(-4)}.`,
                payoutId,
                amount: totalAmount,
            });
        } else {
            // Payout API failed — mark as pending but log for manual processing
            console.log(`[MANUAL-PAYOUT-NEEDED] Instructor: ${instructor.name} | Amount: ₹${totalAmount} | Bank: ${instructor.bankDetails.accountNumber} | IFSC: ${instructor.bankDetails.ifscCode}`);
            return res.json({
                success: false,
                manual: true,
                message: `Automatic payout unavailable (${payoutError || 'RazorpayX not configured'}). A manual bank transfer of ₹${totalAmount.toFixed(2)} has been logged for processing.`,
                amount: totalAmount,
                bankDetails: instructor.bankDetails,
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Payout trigger failed', error: err.message });
    }
});

// ─── GET: Instructor's own earnings history ───────────────────────────────────
router.get('/earnings', auth, async (req, res) => {
    try {
        if (req.user.role !== 'instructor') return res.status(403).json({ msg: 'Denied' });
        const earnings = await InstructorEarning.find({ instructorId: req.user.id })
            .populate('courseId', 'title price')
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(earnings);
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
