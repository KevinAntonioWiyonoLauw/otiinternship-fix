# OmahTI Internship Management System
## Product Requirements Document

**Version:** 1.0  
**Date:** Mei 1, 2025  

![Human Loop](../otiinternship.png)

## Table of Contents
1. [Introduction](#1-introduction)
2. [Product Overview](#2-product-overview)
3. [User Roles](#3-user-roles)
4. [Feature Requirements](#4-feature-requirements)
5. [Technical Requirements](#5-technical-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Metrics and Analytics](#7-metrics-and-analytics)
8. [Future Enhancements](#8-future-enhancements)

## 1. Introduction

The OmahTI Internship Management System is a web-based platform developed to support and streamline the management of internship activities within OmahTI (Organisasi Mahasiswa Teknologi Informasi) at Universitas Gadjah Mada. The system focuses on improving coordination, tracking, and communication between staffs and the Human Development (HD) division.

### 1.1 Purpose
This Product Requirements Document (PRD) defines the functional and non-functional requirements for the development of the OmahTI Internship Management System. It serves as the primary reference for all stakeholders involved in the design, implementation, testing, and deployment of the system.

### 1.2 Scope
The system provides an integrated solution built using a microservices architecture, covering the following key functionalities:

- Authentication & Authorization: Secure login and role-based access for interns and division leaders (KADIV).
- Meeting & Training Scheduling: Tools to schedule, join, and manage events, with automated reminders.
- Attendance Tracking: Real-time presence recording using QR code scanning and manual attendance for trainings.
- Progress Monitoring: Visual indicators of intern progress based on participation in trainings, committees, and assignments.
- Feedback & Aspirasi: Anonymized feedback submission for interns with moderation capabilities by the HD division.

## 2. Product Overview

The OTI Internship Management System is a comprehensive platform that enables efficient management of internship activities through a modern, responsive web application supported by a robust microservices backend.

### 2.1 Product Vision
To create a seamless, intuitive, and comprehensive platform that enhances collaboration and productivity in internship management.

### 2.2 Target Audience
- Division Heads (KADIV)
- OmahTI Staff Members

### 2.3 Core Value Proposition
The system provides a centralized platform for internship management, eliminating manual processes, reducing administrative overhead, and enhancing communication between divisions and staff.

## 3. User Roles

### 3.1 KADIV (Division Head)
- Manage division members
- Schedule and oversee training sessions and meetings
- Generate QR codes for attendance
- Record manual attendance
- Receive participation reports

### 3.2 HD KADIV (Human Development Division Head)
- Access system-wide administrative privileges
- Approve participation and progress reports
- Generate attendance reports across all divisions
- Override attendance records when necessary

### 3.3 Staff
- View scheduled events
- Record attendance via QR code scanning
- Submit participation reports
- Track personal progress
- Submit feedback and aspirations

## 4. Feature Requirements

### 4.1 Authentication & User Management
#### 4.1.1 User Registration
- Staff registration by KADIV
- CSV bulk import functionality for multiple users
- Field validation for email, NIU, full name

#### 4.1.2 User Authentication
- Secure login via email/password
- JWT token-based authentication
- Password reset functionality via email

### 4.2 Attendance Management
#### 4.2.1 QR-based Presence
- QR code generation by KADIV
- QR code scanning by staff
- 15-minute expiry for QR codes
- Time-windowed validation (only valid during training sessions)

#### 4.2.2 Manual Presence Recording
- KADIV interface for manual attendance marking
- User selection and batch processing
- Visual feedback for successful/failed operations

#### 4.2.3 Attendance History
- Historical view of attendance records
- Filtering options by date, event type
- Statistical attendance reports

### 4.3 Schedule Management
#### 4.3.1 Training Management
- Create training sessions with title, date, time, location
- Conflict detection with existing schedules
- Training enrollment and participant management
- Reminder system for upcoming sessions

#### 4.3.2 Meeting Management
- Meeting scheduling with join code generation
- Meeting participation tracking
- Real-time meeting updates
- Calendar integration

### 4.4 Progress Monitoring
#### 4.4.1 Participation Recording
- Self-reported participation in events and tasks
- Evidence submission capability
- KADIV approval workflow

#### 4.4.2 Progress Reporting
- Visual progress dashboards
- Achievement tracking
- Performance metrics

### 4.5 Feedback System
#### 4.5.1 Aspirasi (Feedback) Submission
- Anonymous and identified feedback options
- Targeted feedback to specific divisions
- Feedback categorization

#### 4.5.2 Feedback Management
- Response tracking
- Implementation status updates
- Analytics on feedback trends

## 5. Technical Requirements

### 5.1 Architecture
- Microservices-based architecture
- Containerized deployment with Docker
- API Gateway for service orchestration
- Redis for caching and rate limiting

### 5.2 Backend Services
- Auth Service: User authentication and authorization
- Presence Service: Attendance tracking and QR management
- Training Service: Training session management
- Meeting Service: Meeting coordination
- Email Service: Notification delivery
- Aspirasi Service: Feedback collection and processing
- Progress Service: Performance tracking

### 5.3 Frontend
- Next.js-based responsive web application
- Modern UI with tailored experiences by user role
- Progressive enhancement for mobile users
- Themed components with consistent styling

### 5.4 Security
- JWT-based authentication
- Role-based access control
- Rate limiting to prevent abuse
- Data validation and sanitization
- HTTPS enforcement in production

## 6. Non-Functional Requirements

### 6.1 Performance
- API response times under 500ms for 95% of requests
- Support for concurrent users (up to 500 simultaneous users)
- Graceful degradation under high load

### 6.2 Reliability
- Service availability of 99.9%
- Fault tolerance with graceful error handling
- Comprehensive logging and monitoring

### 6.3 Security
- Secure transmission of sensitive data
- Protection against common web vulnerabilities
- Regular security audits and updates

### 6.4 Scalability
- Horizontal scaling of services
- Efficient database query optimization
- Resource utilization monitoring

### 6.5 Usability
- Intuitive user interface
- Responsive design for all screen sizes
- Accessibility compliance

## 7. Metrics and Analytics

### 7.1 System Performance
- Service uptime
- Response time metrics
- Error rates and types

## 8. Future Enhancements

### 8.1 Planned Features
- Mobile application development
- Machine learning for attendance pattern analysis
- Integration with academic management systems
- Advanced reporting and analytics
- Gamification elements for increased engagement