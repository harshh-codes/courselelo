const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        user = new User({ name, email, passwordHash, role });
        await user.save();

        const payload = { id: user._id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ msg: 'Invalid Credentials' });

        const payload = { id: user._id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Forgot Password Flow
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ msg: 'User does not exist with that email' });

        // Create a unique secret that expires, binding to the current password (invalidates if changed)
        const secret = process.env.JWT_SECRET + user.passwordHash;
        const tempToken = jwt.sign({ email: user.email, id: user._id }, secret, { expiresIn: '15m' });
        const resetLink = `http://localhost:5173/reset-password/${user._id}/${tempToken}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Add a check so the server doesn't crash if they haven't put credentials in .env yet
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log('WARNING: Set SMTP_USER and SMTP_PASS in your .env file to send real emails.');
            return res.json({ 
                msg: 'Reset Link Generated (Check Console/Terminal since credentials are not set in .env yet!)', 
                testEmailUrl: resetLink 
            });
        }

        const mailOptions = {
            from: '"CourseLelo Admin" <' + process.env.SMTP_USER + '>',
            to: user.email,
            subject: 'CourseLelo Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Password Reset Request</h2>
                    <p>We received a request to reset your password for CourseLelo.</p>
                    <p>Click the button below to establish a new password:</p>
                    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">Reset Password</a>
                    <p>This secure link will expire in exactly 15 minutes.</p>
                    <p>If you did not request this reset, please ignore this email.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        console.log('Real Email sent beautifully to: ', user.email);
        res.json({ msg: 'A secure password reset link has been successfully sent to your real email inbox!' });

    } catch (err) {
        console.error('Server side error:', err.message);
        res.status(500).json({ msg: 'Error generating reset link internally' });
    }
});

// Reset Password Flow
router.post('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;

    try {
        const user = await User.findById(id);
        if (!user) return res.status(400).json({ msg: 'Invalid reset link' });

        const secret = process.env.JWT_SECRET + user.passwordHash;
        try {
            jwt.verify(token, secret);
            
            // Re-hash and update the new password!
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(password, salt);
            await user.save();
            
            res.json({ msg: 'Password reset successfully. You can now log in with the new password!' });
        } catch (error) {
            return res.status(400).json({ msg: 'Token is expired or invalid. Please request a new reset link.' });
        }

    } catch (err) {
        res.status(500).send('Server Error resetting password');
    }
});

module.exports = router;
