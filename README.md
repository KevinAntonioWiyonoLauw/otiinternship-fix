# HUMAN LOOP - OmahTI Internship

![OTI Internship Banner](otiinternship.png)

## 😎 Anggota
- Christiano Jose Intoro (Frontend)
- Fahmi Abdillah Zain (Sekretaris & Project Manager)
- Kevin Antonio Wiyono Lauw (Backend)
- Thomas Nadandra Aryawida (UI/UX)
- Widad Muhammad Rafi (UI/UX)

## 📌 Overview

The OTI Internship Management System is a comprehensive platform designed to streamline the management of internship programs. The system follows a microservices architecture with multiple specialized services handling different aspects of the internship management process.

## ✨ Features

- **Authentication System**: Secure user authentication and authorization
- **Meeting Management**: Schedule, organize and track meetings
- **Training Management**: Create and manage training programs
- **Progress Tracking**: Monitor and evaluate intern progress
- **Presence Tracking**: Record and monitor attendance
- **Feedback System**: Collect and manage feedback through the aspirations service
- **Email Notifications**: Automated email notifications for important events

## 🏗️ System Architecture

The application is built using a modern microservices architecture with the following components:

### Frontend
- Next.js application with React

### Backend Services
- **Auth Service**: Handles user authentication and user management
- **Meeting Service**: Manages meeting scheduling and notifications
- **Training Service**: Manages training programs and sessions
- **Progress Service**: Tracks intern progress and evaluations
- **Presence Service**: Handles attendance tracking
- **Aspirasi Service**: Manages feedback collection
- **Email Service**: Handles email notifications and communication

### Databases
- PostgreSQL databases for each service
- Redis for caching and queue management

### Infrastructure
- Docker containerization for all services
- API Gateway for unified access to microservices

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18 or higher (for local development)
- PostgreSQL (for local development without Docker)

### Installation and Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/otiinternship.git
   cd otiinternship
   ```

2. **Environment Configuration**
   - Create `.env` files for each service in their respective directories
   - Create a root `.env` file for Docker Compose configuration

   Example for root `.env`:
   ```
   # Service Ports
   AUTH_SERVICE_PORT=8001
   MEETING_SERVICE_PORT=8002
   EMAIL_SERVICE_PORT=8003
   TRAINING_SERVICE_PORT=8004
   ASPIRASI_SERVICE_PORT=8005
   PRESENCE_SERVICE_PORT=8006
   PROGRESS_SERVICE_PORT=8007
   
   # Redis Configuration
   REDIS_PASSWORD=your_redis_password
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start the Services**
   ```bash
   docker-compose up -d
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:8000

## 🔧 Development Setup

### Running Services Individually

Each service can be run independently for development:

```bash
cd backend/[service-name]
npm install
npm run dev
```

## 📝 API Documentation

Each service exposes RESTful APIs for integration:

- **Auth Service**: `http://localhost:8001/api/auth`
- **Meeting Service**: `http://localhost:8002/api/meetings`
- **Training Service**: `http://localhost:8004/api/training`
- **Progress Service**: `http://localhost:8007/api/progress`
- **Presence Service**: `http://localhost:8006/api/presence`
- **Aspirasi Service**: `http://localhost:8005/api/aspirasi`

or

- **API Gateway**: `http://localhost:8000/api/{{serviceName}}`

Health check endpoints are available for all services at `/health`.

## 🧪 Testing

Run tests with:

```bash
npm test
```

For Storybook component tests:

```bash
npm run test:storybook
```

## 📊 Monitoring

Service health can be monitored using:
- Health check endpoints: `/health` for full checks and `/health/light` for quick status checks
- Bull Board for queue monitoring (available in services that use queues)

## 🛡️ Security

- CORS protection is configured for all services
- Rate limiting is implemented on critical endpoints
- Environment variables are used for all sensitive information

## 🔄 CI/CD

The project uses automated CI/CD workflows for:
- Running tests
- Building Docker images
- Deploying to staging/production environments

## 📦 Project Structure

```
otiinternship/
├── frontend/             # Next.js frontend application
├── backend/              # Backend microservices
│   ├── auth-service/     # Authentication service
│   ├── meeting-service/  # Meeting management service
│   ├── email-service/    # Email notification service
│   ├── training-service/ # Training management service
│   ├── aspirasi-service/ # Feedback management service
│   ├── presence-service/ # Attendance tracking service
│   └── progress-service/ # Progress tracking service
├── docker-compose.yml    # Docker Compose configuration
└── .env                  # Root environment variables
```

## 📚 Technologies

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Node.js, Express, Prisma ORM
- **Databases**: PostgreSQL, Redis
- **DevOps**: Docker, Docker Compose

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Contact

For any inquiries, please reach out to [keviniogt02@gmail.com](mailto:keviniogt02@gmail.com).