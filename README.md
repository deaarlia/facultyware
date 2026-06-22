# Facultyware — Central Panel (UKT Refund System)

Central Panel is a modern, responsive web application built with **Node.js, Express, and EJS** to manage UKT (Uang Kuliah Tunggal) refund applications for students and academic staff. The project features a premium, clean **"shadcn/ui"** aesthetic styled with **Tailwind CSS (via Basecoat)** and dynamic client-side transitions powered by **HTMX**.

---

## 🚀 Key Features

* **Student Application Portal:** Online submission form for UKT refund requests with PDF attachment uploads (Surat Permohonan, Bukti Bayar UKT, SK Rektor).
* **Admin Verification Panel:** Manage refund request workflows, verify submissions, configure refund periods (start/end dates), and clean up expired drafts.
* **Wakil Dekan II Approval Dashboard:** Review verified applications and execute final approvals or rejections.
* **Export Utilities:** Export refund reports into PDF or Excel formats.
* **Role-Based Access Control (RBAC):** Custom ACL middleware protecting routes based on roles (`admin`, `mahasiswa`, `wd2`, etc.) and specific permissions.
* **Vercel Serverless Optimization:** Tailored single-connection database manager with automatic `ping()` recovery to keep connections light and prevent connection pooling overflow in serverless environments.

---

## 🛠️ Tech Stack

* **Backend Framework:** Express.js (Node.js)
* **Template Engine:** EJS
* **Styling & UI:** Tailwind CSS (via Basecoat library) & Vanilla CSS
* **Interactivity:** HTMX (for fast, partial HTML updates and boost navigation)
* **Database Driver:** `mysql2` with promise wrappers
* **Authentication & Sessions:** `express-session` with `express-mysql-session` store (optimized to `connectionLimit: 1`)

---

## 📁 Project Structure

```bash
├── bin/
│   └── www               # Application entry point (local dev server)
├── controllers/          # Business logic handlers
│   ├── admin/            # Admin-specific controllers (dashboard, export, periods)
│   ├── api/              # API endpoints for verification and integrations
│   ├── indexController.js# Authentication & general dashboard routing
│   └── mahasiswaCtrl.js  # Student request handlers
├── lib/
│   └── db.js             # Vercel-optimized single database connection & reconnect wrapper
├── middlewares/          # Custom middlewares
│   ├── acl.js            # Role-Based Access Control (RBAC) permission checker
│   ├── auth.js           # Authentication check middleware
│   └── error.js          # Global error handling
├── public/
│   ├── assets/           # Primary Tailwind CSS stylesheets & JS modules
│   └── uploads/          # Destination directory for uploaded PDF documents
├── routes/               # Express routing tables
├── scripts/
│   └── init_db.js        # Native Node script to seed/re-create the admin user
├── views/                # EJS template views
├── vercel.json           # Vercel serverless function routing configuration
├── package.json          # Dependency manifest
└── README.md             # Project documentation
```

---

## ⚙️ Getting Started

### Prerequisites
* **Node.js** (v16.x or higher)
* **MySQL** database server instance

### 1. Environment Configuration
Create a `.env` file in the root directory and configure the environment variables:
```env
PORT=3000
SESSION_SECRET=your_super_secret_session_key

# Database Configurations
DB_HOST=your_database_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=facultyware
```

### 2. Database Schema Setup
Ensure your database has the tables necessary for ACL (Role-Based Access Control):
* `roles` (id, name)
* `permissions` (id, name)
* `role_has_permissions` (role_id, permission_id)
* `user_has_roles` (user_id, role_id)
* `students`, `student_requests`, `student_request_refund`, and `student_request_refund_approvals`

Seed a default administrator using the built-in seeding script:
```bash
node scripts/init_db.js
```

### 3. Installation & Local Development
Install dependencies and launch the hot-reload nodemon server:
```bash
npm install
npm run dev
```
The server will start running at `http://localhost:3000`.

---

## ⚡ Deployment to Vercel

This project is fully ready for deployment on **Vercel** as a serverless application:
1. Ensure your remote database credentials are configured in your Vercel Project Environment Variables.
2. The database connection manager (`lib/db.js`) is configured to spin up single connections and ping them upon request instead of spawning large pools. This keeps the database load very light during serverless spikes.
3. Simply deploy using the Vercel CLI or link your GitHub repository:
```bash
vercel --prod
```

---

## 📝 Available Commands

| Command | Description |
|---|---|
| `npm start` | Runs the production-ready server using `bin/www` |
| `npm run dev` | Runs the development environment with automatic restart (`nodemon`) |
| `node scripts/init_db.js` | Clears/re-creates the administrative account `admin@unand.ac.id` |
