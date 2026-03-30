const express = require('express');
const Course = require('../models/Course');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/', async (req, res) => {
    try {
        const courses = await Course.find().populate('instructorId', 'name');
        res.json(courses);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('instructorId', 'name');
        if (!course) return res.status(404).json({ msg: 'Course not found' });
        res.json(course);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// We expect `coverImage` (1) and `moduleFiles` (multiple)
router.post('/', [auth, upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'moduleFiles', maxCount: 10 }])], async (req, res) => {
    try {
        if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const { title, description, price, moduleTitles } = req.body;
        
        // Parse moduleTitles if sent as stringified JSON array
        let parsedModuleTitles = [];
        if (moduleTitles) {
            try { parsedModuleTitles = JSON.parse(moduleTitles); } catch(e) { parsedModuleTitles = [moduleTitles]; }
        }

        let imageUrl = req.files['coverImage'] ? `http://localhost:5000/uploads/${req.files['coverImage'][0].filename}` : null;
        
        let lessons = [];
        if (req.files['moduleFiles']) {
            req.files['moduleFiles'].forEach((file, index) => {
                lessons.push({
                    title: parsedModuleTitles[index] || `Module ${index + 1}`,
                    content: 'Uploaded File Reference',
                    videoUrl: `http://localhost:5000/uploads/${file.filename}`
                });
            });
        }

        const newCourse = new Course({
            title,
            description,
            price,
            instructorId: req.user.id,
            imageUrl: imageUrl || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=800',
            lessons
        });

        const course = await newCourse.save();
        res.json(course);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// Update course (Price and append new modules)
router.put('/:id', [auth, upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'moduleFiles', maxCount: 10 }])], async (req, res) => {
    try {
        let course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ msg: 'Course not found' });
        
        if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const { title, description, price, moduleTitles } = req.body;
        
        if (title) course.title = title;
        if (description) course.description = description;
        if (price) course.price = price;

        let parsedModuleTitles = [];
        if (moduleTitles) {
            try { parsedModuleTitles = JSON.parse(moduleTitles); } catch(e) { parsedModuleTitles = [moduleTitles]; }
        }

        if (req.files && req.files['coverImage']) {
            course.imageUrl = `http://localhost:5000/uploads/${req.files['coverImage'][0].filename}`;
        }
        
        if (req.files && req.files['moduleFiles']) {
            req.files['moduleFiles'].forEach((file, index) => {
                course.lessons.push({
                    title: parsedModuleTitles[index] || `Module ${course.lessons.length + index + 1}`,
                    content: 'Uploaded File Reference',
                    videoUrl: `http://localhost:5000/uploads/${file.filename}`
                });
            });
        }

        await course.save();
        res.json(course);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Delete Course
router.delete('/:id', auth, async (req, res) => {
    try {
        let course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ msg: 'Course not found' });
        
        if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Course.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Course removed' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Delete a specific Module from a Course
router.delete('/:courseId/modules/:moduleId', auth, async (req, res) => {
    try {
        let course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ msg: 'Course not found' });
        
        if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        course.lessons = course.lessons.filter(lesson => lesson._id.toString() !== req.params.moduleId);
        
        await course.save();
        res.json(course);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
