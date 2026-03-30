require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const User = require('./models/User');

const seedDB = async () => {
  try {
    const uri = 'mongodb+srv://courselelo_admin:Admin%40123@courselelo.e8mjeyj.mongodb.net/courselelo?appName=Courselelo';
    await mongoose.connect(uri);
    console.log('MongoDB Connected successfully for seeding!');

    // First, let's create a dummy instructor
    let instructor = await User.findOne({ email: 'instructor@courselelo.com' });
    if (!instructor) {
      instructor = new User({
        name: 'Alex Developer',
        email: 'instructor@courselelo.com',
        passwordHash: 'dummyhash',
        role: 'instructor'
      });
      await instructor.save();
    }

    // Clear previous courses
    await Course.deleteMany({});

    // Create 20 mock courses
    const topics = ['React', 'Node.js', 'Python', 'Machine Learning', 'Data Science', 'AWS', 'Docker', 'Kubernetes', 'Cybersecurity', 'Web Design', 'UI/UX', 'Figma', 'TypeScript', 'Next.js', 'GraphQL', 'MongoDB', 'System Design', 'C++', 'Java', 'Angular'];
    
    const courses = topics.map((topic, index) => ({
      title: `Complete ${topic} Masterclass 2026`,
      description: `Learn everything you need to know about ${topic} from zero to hero in this comprehensive guide.`,
      price: (index + 1) * 100 + 499,
      instructorId: instructor._id,
      imageUrl: `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop`
    }));

    await Course.insertMany(courses);
    console.log('Successfully created 20 courses!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedDB();
