# Email Marketing Application

A comprehensive email marketing platform built with React, TypeScript, Express.js, and PostgreSQL. This application provides a complete solution for managing email campaigns, subscriber lists, email templates, and analytics with a modern, responsive dashboard.

## 🚀 Project Status

**Current Version**: v1.0.0  
**Status**: Active Development  
**Last Updated**: January 2025

### Recent Updates
- ✅ Enhanced dashboard with improved metrics visualization
- ✅ Added quick action cards for better user experience
- ✅ Implemented recent activity tracking
- ✅ Email templates feature with categorization and personalization
- ✅ Responsive design improvements
- ✅ Fixed campaign data loading issues

## 📋 Table of Contents

- [🚀 Project Status](#-project-status)
- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📋 Prerequisites](#-prerequisites)
- [⚡ Quick Start](#-quick-start)
- [🗄️ Database Setup](#️-database-setup)
- [🚀 Running the Application](#-running-the-application)
- [📊 Default Admin Account](#-default-admin-account)
- [🔧 Development](#-development)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)

## ✨ Features

- **Dashboard**: Overview of campaigns, metrics, and quick actions with real-time analytics
- **Campaign Creation Wizard**: 4-step process for creating email campaigns
  - Campaign Setup (name, subject, sender info)
  - Audience Selection (email lists and recipients)
  - Content Creation (rich text editor with email templates)
  - Review & Schedule (preview and scheduling options)
- **Email Templates**: Pre-designed templates with categorization and personalization
  - Template library with categories (Newsletter, Promotional, Welcome, etc.)
  - Drag-and-drop template selection in campaign wizard
  - Personalization tags support ({{firstName}}, {{lastName}}, {{email}})
  - Template usage tracking and analytics
- **Email Lists Management**: Create, edit, and manage subscriber lists
- **CSV Import/Export**: Bulk import/export of recipients
- **Analytics & Tracking**: Campaign performance metrics and engagement tracking
- **Authentication**: Secure user registration and login with JWT
- **Responsive Design**: Mobile-friendly interface with Material-UI

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) for components
- React Router for navigation
- Zustand for state management
- Chart.js for analytics visualization
- Vite for development and building

### Backend
- Express.js with TypeScript
- PostgreSQL database
- Prisma ORM for database management
- JWT authentication
- Nodemailer for email sending
- Multer for file uploads

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- pnpm package manager

## ⚡ Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd email-marketing
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   
   The `.env` file is already configured with default values. Update the following variables as needed:
   
   ```env
   # Database (use Docker Compose defaults or your local setup)
   DATABASE_URL="postgresql://postgres:password@localhost:5432/email_marketing?schema=public"
   
   # JWT Secret (change this in production)
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   
   # Email Configuration (configure with your SMTP provider)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   
   # Application
   PORT=3001
   NODE_ENV="development"
   ```

## 🗄️ Database Setup

### Option 1: Using Docker Compose (Recommended)

1. **Start PostgreSQL with Docker Compose**
   ```bash
   docker-compose up -d postgres
   ```
   
   This will:
   - Start a PostgreSQL 15 container on port 5432
   - Create the `email_marketing` database automatically
   - Set up the database with user `postgres` and password `password`
   - Include Adminer (database management UI) on port 8080

2. **Update your .env file**
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/email_marketing?schema=public"
   ```

3. **Run Database Migrations**
   ```bash
   npx prisma migrate dev
   ```

4. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

### Option 2: Local PostgreSQL Installation

1. **Install PostgreSQL locally** (if not already installed)
   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create Database and User**
   ```bash
   # Connect to PostgreSQL as superuser
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE email_marketing;
   CREATE USER email_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE email_marketing TO email_user;
   \q
   ```

3. **Update your .env file**
   ```env
   DATABASE_URL="postgresql://email_user:your_password@localhost:5432/email_marketing?schema=public"
   ```

4. **Run Database Migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

6. **Seed the database with initial data**
   ```bash
   pnpm run db:seed
   ```

### 🗄️ Database Management Tools

- **Prisma Studio**: `npx prisma studio` (opens on http://localhost:5555)
- **Adminer** (with Docker): http://localhost:8080 (server: postgres, user: postgres, password: password)
- **pgAdmin** or any PostgreSQL client of your choice

## Docker Compose Commands

### Start All Services
```bash
# Start PostgreSQL and Adminer
docker-compose up -d

# Start only PostgreSQL
docker-compose up -d postgres

# View logs
docker-compose logs -f postgres
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

### Database Access
- **Adminer UI**: http://localhost:8080
  - Server: `postgres`
  - Username: `postgres`
  - Password: `password`
  - Database: `email_marketing`

## 🚀 Running the Application

### 🔧 Development Mode

**Start both frontend and backend concurrently:**
```bash
pnpm run dev
```

This will start:
- Frontend (Vite): http://localhost:5173
- Backend (Express): http://localhost:3001

### Individual Services

**Frontend only:**
```bash
pnpm run client:dev
```

**Backend only:**
```bash
pnpm run server:dev
```

### Production Build

```bash
pnpm run build
pnpm run preview
```

## 📊 Default Admin Account

**Note**: This application does not include a default admin account. You need to register a new account through the registration page at `/register`.

To create an admin user:
1. Start the application
2. Navigate to http://localhost:5173/register
3. Create a new account
4. The first registered user will have full access to all features

## Database Management

### Useful Prisma Commands

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database (WARNING: This will delete all data)
npx prisma migrate reset

# Deploy migrations to production
npx prisma migrate deploy

# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name
```

### Database Schema

The application uses the following main entities:
- **Users**: Application users with authentication
- **Campaigns**: Email campaigns with content, scheduling, and template support
- **EmailTemplates**: Pre-designed email templates with categorization
- **EmailLists**: Subscriber lists for organizing recipients
- **Recipients**: Individual email subscribers with personalization data
- **EmailTracking**: Analytics and engagement tracking
- **CampaignRecipients**: Junction table for campaign-recipient relationships

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign (supports templateId)
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign (supports templateId)
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/send` - Send campaign
- `POST /api/campaigns/:id/duplicate` - Duplicate campaign

### Email Templates
- `GET /api/email-templates` - List email templates
- `POST /api/email-templates` - Create email template
- `GET /api/email-templates/:id` - Get template details
- `PUT /api/email-templates/:id` - Update email template
- `DELETE /api/email-templates/:id` - Delete email template
- `POST /api/email-templates/:id/test` - Send test email with template

### Email Lists
- `GET /api/email-lists` - List email lists
- `POST /api/email-lists` - Create email list
- `PUT /api/email-lists/:id` - Update email list
- `DELETE /api/email-lists/:id` - Delete email list
- `POST /api/email-lists/:id/import` - Import recipients from CSV
- `GET /api/email-lists/:id/export` - Export recipients to CSV

### Recipients
- `GET /api/recipients` - List recipients
- `POST /api/recipients` - Create recipient
- `PUT /api/recipients/:id` - Update recipient
- `DELETE /api/recipients/:id` - Delete recipient

### Analytics
- `GET /api/analytics/overview` - Dashboard metrics
- `GET /api/analytics/campaigns/:id` - Campaign analytics

## Development

### Code Quality

```bash
# Type checking
pnpm run check

# Linting
pnpm run lint
```

### Project Structure

```
├── api/                 # Backend Express.js application
│   ├── routes/         # API route handlers
│   ├── lib/           # Utility functions and middleware
│   └── app.ts         # Express app configuration
├── src/                # Frontend React application
│   ├── components/    # Reusable React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── store/         # Zustand state management
│   └── lib/           # Utility functions
├── prisma/            # Database schema and migrations
└── public/            # Static assets
```

## 🚀 Deployment

The application is configured for deployment on Vercel with the included `vercel.json` configuration. Make sure to:

1. Set up environment variables in your deployment platform
2. Configure your PostgreSQL database
3. Run database migrations in production
4. Update CORS settings for your domain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
