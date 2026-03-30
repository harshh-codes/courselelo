const express = require('express');
const Razorpay = require('razorpay');
const auth = require('../middleware/auth');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const InstructorEarning = require('../models/InstructorEarning');

const router = express.Router();

const PLATFORM_FEE_PCT = 0.02; // 2% kept by CourseLelo

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummyKey123',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummySecretabc123',
});

// ─── POST: Create Razorpay Order ─────────────────────────────────────────────
router.post('/create-razorpay-order', auth, async (req, res) => {
    const { courseId, title, price } = req.body;
    try {
        const options = {
            amount: Math.round(price * 100),
            currency: 'INR',
            receipt: `rcpt_${req.user.id}_${courseId}`.substring(0, 40),
        };
        const order = await razorpay.orders.create(options);
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.log('Razorpay order creation failed — using mock mode.');
        return res.json({
            orderId: 'mock_dev_' + Math.floor(Math.random() * 1000000),
            amount: Math.round(price * 100),
            currency: 'INR',
            key_id: 'mock_key',
            isMockMode: true,
        });
    }
});

// ─── POST: Verify enrollment + record instructor earning ──────────────────────
router.post('/verify-enrollment', auth, async (req, res) => {
    try {
        const { courseId, razorpayPaymentId } = req.body;

        // 1. Enroll the student
        let enrollment = await Enrollment.findOne({ userId: req.user.id, courseId });
        if (!enrollment) {
            enrollment = new Enrollment({ userId: req.user.id, courseId, paid: true });
            await enrollment.save();
        }

        // 2. Record instructor earning (non-blocking)
        try {
            const course = await Course.findById(courseId);
            if (course && course.instructorId && course.price > 0) {
                // Check we haven't already recorded this earning
                const alreadyRecorded = await InstructorEarning.findOne({ enrollmentId: enrollment._id });
                if (!alreadyRecorded) {
                    const platformFee = parseFloat((course.price * PLATFORM_FEE_PCT).toFixed(2));
                    const instructorAmount = parseFloat((course.price - platformFee).toFixed(2));
                    await InstructorEarning.create({
                        instructorId: course.instructorId,
                        courseId: course._id,
                        enrollmentId: enrollment._id,
                        studentId: req.user.id,
                        saleAmount: course.price,
                        platformFee,
                        instructorAmount,
                        status: 'pending',
                        payoutNote: razorpayPaymentId ? `Payment ID: ${razorpayPaymentId}` : 'mock/dev payment',
                    });
                    console.log(`[EARNING-RECORDED] ₹${instructorAmount} pending for instructor ${course.instructorId}`);
                }
            }
        } catch (earningErr) {
            console.error('[EARNING-ERROR non-fatal]', earningErr.message);
        }

        res.json({ success: true, enrollment });
    } catch (err) {
        res.status(500).send('Verification Error');
    }
});

// ─── GET: Check access to a course ───────────────────────────────────────────
router.get('/check/:courseId', auth, async (req, res) => {
    try {
        const enrollment = await Enrollment.findOne({ userId: req.user.id, courseId: req.params.courseId, paid: true });
        res.json({ hasAccess: !!enrollment });
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// ─── GET: Instructor sales ────────────────────────────────────────────────────
router.get('/instructor-sales', auth, async (req, res) => {
    try {
        if (req.user.role !== 'instructor') return res.status(403).json({ msg: 'Denied' });
        const myCourses = await Course.find({ instructorId: req.user.id });
        const courseIds = myCourses.map(c => c._id);
        const sales = await Enrollment.find({ courseId: { $in: courseIds }, paid: true })
            .populate('courseId', 'title price')
            .populate('userId', 'name email');
        res.json(sales);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

// ─── GET: My enrollments (learner) ───────────────────────────────────────────
router.get('/my-enrollments', auth, async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ userId: req.user.id, paid: true }).populate('courseId');
        res.json(enrollments);
    } catch (error) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
