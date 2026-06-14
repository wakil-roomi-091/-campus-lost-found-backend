<div align="center">

# 🎓 Campus Lost & Found

### A Complete Lost & Found Management System for Universities

![GitHub repo size](https://img.shields.io/github/repo-size/wakil-roomi-091/campus-lost-found-frontend)
![GitHub stars](https://img.shields.io/github/stars/wakil-roomi-091/campus-lost-found-frontend)
![GitHub license](https://img.shields.io/github/license/wakil-roomi-091/campus-lost-found-frontend)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=flat&logo=tailwindcss)
![Socket.io](https://img.shields.io/badge/Socket.io-4.0-010101?style=flat&logo=socket.io)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat&logo=vite)

</div>

---

## 📖 About The Project

**Campus Lost & Found** is a full-stack web application designed for university students to report and find lost items on campus. The platform enables real-time communication between finders and owners, making it easier to reunite lost items with their owners.

**Live Demo:** https://campus-lost-found-frontend-xeac.vercel.app

**Backend Repository:** https://github.com/wakil-roomi-091/campus-lost-found-backend

---

## ✨ Key Features

### 🔐 Authentication & Security
- User registration with OTP email verification
- JWT-based authentication with secure token storage
- Password reset functionality with email OTP
- Google OAuth 2.0 integration for one-click login
- Protected routes with role-based access (Admin/User)

### 📝 Item Management
- Report lost or found items with detailed descriptions
- Upload up to 5 images per item via Cloudinary
- Edit and delete your reported items
- Mark items as resolved when found/returned
- Search and filter items by category, location, date, and status

### 💬 Real-time Messaging
- WhatsApp-style chat interface between users
- Real-time message delivery using Socket.io
- Read receipts and unread message badges
- Delete messages and clear chat history

### 👤 User Profiles
- Customizable profile with profile picture and cover photo
- Add bio, location, phone number, and social media links
- View your reported items and received ratings

### ⭐ Rating & Review System
- Rate other users after successful item exchange (1-5 stars)
- Leave detailed feedback and comments
- Average rating displayed on user profiles

### 👑 Admin Panel
- Dashboard with real-time statistics
- User and item management with CRUD operations
- Dynamic category management
- Activity logs and system health monitoring
- Export data to CSV, Excel, or PDF

### 📱 Responsive Design
- Fully responsive across all devices (mobile, tablet, desktop)
- Dark theme for authenticated pages
- Light theme for public pages

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19, Vite, React Router DOM |
| Styling | Tailwind CSS |
| Real-time | Socket.io-client |
| HTTP Client | Axios |
| Icons | React Icons |
| Image Upload | Cloudinary |
| State Management | React Context API |
| Charts | Recharts |

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Backend server running

### Installation

```bash
git clone https://github.com/wakil-roomi-091/campus-lost-found-frontend.git
cd campus-lost-found-frontend
npm install
cp .env.example .env
npm run dev
