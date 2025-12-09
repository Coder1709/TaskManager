# TaskFlow - Smart Task Management

A production-ready Jira-like task management web application with JWT authentication, AI-powered summaries using Google Gemini, and Google Cloud deployment.

## Features

- **Authentication**: JWT-based auth with email OTP verification
- **Task Management**: Create, update, delete tasks with filtering and Kanban board
- **Projects**: Organize tasks into projects with team members
- **Multi-Invite**: Invite up to 20 team members at once
- **AI Summaries**: Daily and weekly task summaries powered by Google Gemini
- **Email Reports**: Automated email reports with professional templates
- **Responsive UI**: Modern, clean interface built with React and Tailwind CSS

## Tech Stack

### Backend
- Node.js + TypeScript + Express
- PostgreSQL with Prisma ORM
- JWT authentication
- Google Gemini API for AI summaries
- SendGrid/SMTP for emails
- Swagger/OpenAPI documentation

### Frontend
- React 18 + TypeScript
- Vite for building
- Tailwind CSS for styling
- React Query for data fetching
- Zustand for state management
- dnd-kit for drag-and-drop

### Infrastructure
- Docker for containerization
- GitHub Actions for CI/CD
- Google Cloud Run for hosting
- Cloud SQL for PostgreSQL

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd lite-jira
   ```

2. **Start PostgreSQL with Docker**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Setup Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   npm install
   npx prisma migrate dev
   npm run dev
   ```

4. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Swagger Docs: http://localhost:3000/api-docs

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/litejira"

# JWT
JWT_ACCESS_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Email (choose one provider)
EMAIL_PROVIDER="smtp"  # or "sendgrid"
EMAIL_FROM="noreply@litejira.com"

# SendGrid
SENDGRID_API_KEY=""

# SMTP
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""

# Gemini AI
GEMINI_API_KEY=""

# Frontend URL
FRONTEND_URL="http://localhost:5173"
```

## Running Tests

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run integration tests
npm run test:integration
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm test

# Run E2E tests (Playwright)
npm run test:e2e
```

## API Documentation

Swagger documentation is available at `/api-docs` when the backend is running.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/verify-otp | Verify email with OTP |
| POST | /api/auth/login | Login and get tokens |
| POST | /api/auth/refresh | Refresh access token |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/tasks | List tasks with filters |
| POST | /api/tasks | Create task |
| GET | /api/tasks/board/:projectId | Get board view |
| PATCH | /api/tasks/:id/status | Update task status |
| POST | /api/reports/daily | Generate daily report |
| POST | /api/reports/weekly | Generate weekly report |

## Deployment to Google Cloud

### Prerequisites
1. Google Cloud account with billing enabled
2. `gcloud` CLI installed and authenticated
3. Enable required APIs:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable sqladmin.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

### Setup Cloud SQL
```bash
# Create PostgreSQL instance
gcloud sql instances create litejira-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create litejira --instance=litejira-db

# Create user
gcloud sql users create litejira --instance=litejira-db --password=YOUR_PASSWORD
```

### Setup Secrets
```bash
# Store secrets
echo -n "postgresql://..." | gcloud secrets create litejira-db-url --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create litejira-jwt-access --data-file=-
echo -n "your-gemini-key" | gcloud secrets create litejira-gemini-key --data-file=-
```

### Deploy with Docker Compose (Production)
```bash
docker-compose up -d
```

### Deploy with GitHub Actions
1. Add these secrets to your GitHub repository:
   - `GCP_PROJECT_ID`: Your GCP project ID
   - `GCP_SA_KEY`: Service account JSON key with Cloud Run Admin, Artifact Registry Writer roles

2. Push to `main` branch to trigger deployment

## Project Structure

```
lite-jira/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utilities
│   │   ├── validators/      # Zod schemas
│   │   └── app.ts           # Express app
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── tests/               # Test files
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   ├── store/           # Zustand store
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main app
│   ├── Dockerfile
│   └── nginx.conf
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Production compose
└── docker-compose.dev.yml   # Development compose
```

## License

MIT
# TaskManager
