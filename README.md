# Hostel Management System

A full-stack hostel management application with authentication and dashboard UI for students and wardens/admins.

## Technology Stack

### Frontend
<<<<<<< HEAD

=======
>>>>>>> origin/main
- React.js with Vite
- React Router for navigation
- Axios for API calls
- CSS (no frameworks)

### Backend
<<<<<<< HEAD

=======
>>>>>>> origin/main
- Node.js with Express.js
- JWT for authentication
- bcryptjs for password hashing
- express-validator for input validation

### Database
<<<<<<< HEAD

=======
>>>>>>> origin/main
- PostgreSQL
- Prisma ORM

## Ports Configuration

| Service | Port |
|---------|------|
| React Frontend | 5173 |
| Express Backend | 5000 |
| PostgreSQL | 5432 |

API Base URL: `http://localhost:5000/api`

## Project Structure

```
hostel_management/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   └── wardenController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   └── wardenRoutes.js
│   ├── services/
│   │   └── authService.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── password.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── DashboardCard.jsx
│       │   ├── Navbar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── Sidebar.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── pages/
│       │   ├── ChangePassword.jsx
│       │   ├── ForgotPassword.jsx
│       │   ├── Login.jsx
│       │   ├── ResetPassword.jsx
│       │   ├── StudentDashboard.jsx
│       │   ├── StudentRegister.jsx
│       │   └── WardenDashboard.jsx
│       ├── routes/
│       │   └── AppRoutes.jsx
│       ├── services/
│       │   └── api.js
│       ├── styles/
│       │   ├── auth.css
│       │   ├── dashboard.css
│       │   ├── index.css
│       │   ├── navbar.css
│       │   └── sidebar.css
│       ├── App.jsx
│       └── main.jsx
│
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE hostel_management;
```

2. Configure backend environment variables:

```bash
cd backend
cp .env.example .env
```

3. Update `.env` with your database credentials:

```env
PORT=5000
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/hostel_management"
JWT_SECRET="your_secure_jwt_secret_change_this_in_production"
JWT_EXPIRES_IN="1d"
ADMIN_EMAIL="admin@hostel.com"
ADMIN_PASSWORD="Admin@123"
```

4. Run Prisma migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

5. Seed the database (creates default warden account):

```bash
npm run prisma:seed
```

### 3. Configure Frontend

```bash
cd frontend
cp .env.example .env
```

The `.env` file should contain:

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Run the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- API Health Check: http://localhost:5000/api/health

## Default Credentials

### Warden/Admin Account

```
Email: admin@hostel.com
Password: Admin@123
```

(Configured via environment variables in `.env`)

### Student Account

Register a new student account through the registration page.

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Student registration |
| POST | /api/auth/login | User login |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/reset-password | Reset password with token |
| PUT | /api/auth/change-password | Change password (authenticated) |

### Student Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/student/dashboard | Get student dashboard data |

### Warden Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/warden/dashboard | Get warden dashboard data |

## Features Implemented

### Authentication
<<<<<<< HEAD

=======
>>>>>>> origin/main
- ✅ Student registration
- ✅ Student/Warden login
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Protected routes
- ✅ Role-based authorization
- ✅ Forgot password
- ✅ Reset password
- ✅ Change password

### Student Dashboard
<<<<<<< HEAD

=======
>>>>>>> origin/main
- ✅ Welcome message
- ✅ Profile information display
- ✅ Room allocation status
- ✅ Summary cards (Fees, Complaints, Outpass)

### Warden Dashboard
<<<<<<< HEAD

=======
>>>>>>> origin/main
- ✅ Overview statistics
- ✅ Total students count
- ✅ Room/Bed statistics
- ✅ Pending actions summary
- ✅ Occupancy rate

### UI/UX
<<<<<<< HEAD

=======
>>>>>>> origin/main
- ✅ Responsive design
- ✅ Professional sidebar navigation
- ✅ Dashboard cards
- ✅ Loading states
- ✅ Error handling
- ✅ Form validation

## Sidebar Navigation (Placeholders)

The following sidebar items are UI placeholders for future team implementation:

### Student Sidebar
<<<<<<< HEAD

=======
>>>>>>> origin/main
- My Profile
- My Room
- My Fees
- My Complaints
- My Outpass

### Warden Sidebar
<<<<<<< HEAD

=======
>>>>>>> origin/main
- Rooms
- Allocations
- Fees
- Complaints
- Outpass
- Students

Clicking these items keeps the user on the dashboard (no navigation occurs).

## Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token authentication
- Role-based access control
- Input validation
- SQL injection prevention (Prisma ORM)
- CORS configuration
- Environment variable protection

## Development Notes

### Password Reset (Development Mode)

In development mode, the forgot password endpoint returns a reset token directly in the response. In production, this should be sent via email.

### Environment Variables

Never commit `.env` files. Use `.env.example` as a template.

## Commands Reference

### Backend

```bash
npm start           # Start server
npm run dev         # Start with nodemon
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed database
npm run prisma:studio    # Open Prisma Studio
```

### Frontend

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
```

## Team Integration

This authentication module is designed to integrate with future modules:

- **Room Management** - To be connected to "Rooms" sidebar item
- **Bed Allocation** - To be connected to "Allocations" sidebar item
- **Fee Management** - To be connected to "Fees" sidebar item
- **Complaint System** - To be connected to "Complaints" sidebar item
- **Outpass System** - To be connected to "Outpass" sidebar item
- **Student Management** - To be connected to "Students" sidebar item

The Prisma schema includes all necessary models for these future implementations.
