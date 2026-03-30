# CourseLelo 🎓

> **India's modern EdTech platform** — built for instructors to publish courses and learners to enroll, learn, and grow.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-courselelo.netlify.app-blue?style=for-the-badge&logo=netlify)](https://courselelo.netlify.app/)
[![Backend](https://img.shields.io/badge/Backend-Render-purple?style=for-the-badge&logo=render)](https://courselelo.onrender.com)
[![License](https://img.shields.io/badge/License-ISC-green?style=for-the-badge)](LICENSE)

---

## 🔗 Live Demo

**[https://courselelo.netlify.app/](https://courselelo.netlify.app/)**

| Role | Email | Password |
|---|---|---|
| Instructor | Create your own account | Register with **Instructor** role |
| Learner | Create your own account | Register with **Learner** role |

---

## ✨ Features

### For Learners
- 🔍 **Explore** a catalog of courses with filters (price, category, enrollment status)
- 🛒 **Enroll** via Razorpay payment gateway (live payments supported)
- 📚 **My Learning** dashboard with progress tracking
- 🎓 Course completion tracking & certificate badges
- 🔒 Secure JWT-based authentication with password reset via email

### For Instructors
- 🚀 **Publish courses** with cover images and video modules
- 📊 **Analytics dashboard** — revenue, enrolled students, course performance
- 💰 **Payout system** — earn 98% of every sale (2% platform fee)
- 🏦 **Bank details setup** for automated Razorpay payouts
- ✏️ Edit pricing and add/remove modules on existing courses

### Platform
- 🌍 Full-stack MERN application (MongoDB, Express, React, Node.js)
- 💳 Razorpay payment integration (live-ready)
- 📧 Email notifications via Nodemailer (SMTP)
- 🎨 Premium dark-mode UI with glassmorphism design

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite, React Router v6, Axios |
| **Styling** | Vanilla CSS (custom design system, no Tailwind) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas + Mongoose |
| **Auth** | JWT (JSON Web Tokens) + bcrypt |
| **Payments** | Razorpay (live keys supported) |
| **File Uploads** | Multer |
| **Email** | Nodemailer (Gmail SMTP) |
| **Hosting** | Netlify (frontend) + Render (backend) |

---

## 📁 Project Structure

```
courselelo/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Landing page with course catalog
│   │   │   ├── Dashboard.jsx    # Instructor & Learner dashboards
│   │   │   ├── CourseDetail.jsx # Course page + Razorpay enrollment
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   └── Success.jsx      # Post-payment enrollment confirmation
│   │   ├── App.jsx              # Routing + Navbar
│   │   └── index.css            # Full design system
│   └── netlify.toml             # Netlify config + SPA redirects
│
└── server/                  # Express.js backend
    ├── models/
    │   ├── User.js              # Auth + bank details
    │   ├── Course.js            # Course + lessons
    │   ├── Enrollment.js        # Student enrollments
    │   └── InstructorEarning.js # Payout ledger
    ├── routes/
    │   ├── auth.js              # Register, Login, Reset Password
    │   ├── courses.js           # CRUD for courses + modules
    │   ├── payments.js          # Razorpay orders + enrollment verify
    │   └── payout.js            # Bank setup + instructor payout triggers
    ├── middleware/
    │   └── auth.js              # JWT verification middleware
    └── server.js                # Express app entry point
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Razorpay account (test keys work fine)

### 1. Clone the repository

```bash
git clone https://github.com/harshh-codes/courselelo.git
cd courselelo
```

### 2. Setup the Backend

```bash
cd server
npm install
```

Create a `.env` file in `/server`:

```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
PORT=5000
```

Start the server:

```bash
npm run dev
```

### 3. Setup the Frontend

```bash
cd ../client
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`  
Backend runs at `http://localhost:5000`

> **Note:** For local dev, swap the API URL in all pages back to `http://localhost:5000/api`.

---

## 🌐 Deployment

### Backend → Render

| Field | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |

Add all `.env` variables in Render's **Environment** tab.

### Frontend → Netlify

| Field | Value |
|---|---|
| Base Directory | `client` |
| Build Command | `npm run build` |
| Publish Directory | `client/dist` |

---

## 💳 Payment Flow

```
Student clicks "Enroll Now"
    ↓
Backend creates Razorpay Order
    ↓
Razorpay Checkout opens (test/live)
    ↓
Payment captured → /verify-enrollment called
    ↓
Student enrolled + InstructorEarning recorded (98% owed)
    ↓
Instructor requests payout → Razorpay Payouts API / manual settlement
```

**Platform fee: 2%** — Instructors receive **98%** of every sale.

---

## 📸 Screenshots

| Page | Description |
|---|---|
| 🏠 Home | Hero section + live course catalog with filters |
| 📊 Instructor Dashboard | Revenue analytics, student roster, course management |
| 🎓 Learner Dashboard | My courses, progress tracking, explore catalog |
| 📖 Course Detail | Full curriculum + Razorpay enrollment |
| 🏦 Payout Setup | Bank account form for instructor payouts |

---

## 🔐 Security

- All passwords hashed with **bcrypt** (salt rounds: 10)
- JWT tokens expire in **1 hour**
- Password reset tokens are **single-use** and expire in **15 minutes**
- `.env` files excluded from git via `.gitignore`
- CORS enabled for cross-origin frontend/backend communication

---

## 📄 License

ISC License — feel free to use and modify for personal or commercial projects.

---

## 👨‍💻 Author

Built by **Harsh** — [GitHub](https://github.com/harshh-codes)

---

⭐ If you found this useful, give it a star on GitHub!
