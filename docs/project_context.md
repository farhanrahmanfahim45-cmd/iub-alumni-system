# IUB International Business Alumni Information Management System
## Project Context

## 1. Project Overview

The IUB International Business Alumni Information Management System is a web-based information management platform for the Department of International Business at Independent University, Bangladesh (IUB).

The system is designed to centralize, manage, verify, and analyze information about alumni who have graduated with an International Business major or minor.

The prototype will use a synthetic dataset of approximately 500 alumni records and will eventually serve as the foundation for a production departmental system.

---

## 2. Core Objectives

The system aims to:

- Centralize alumni academic, contact, and career information.
- Allow alumni to submit and update their own information.
- Allow administrators to verify and manage submitted information.
- Provide faculty/admin users with a searchable alumni directory.
- Provide live academic and career analytics.
- Maintain PostgreSQL as the central source of truth.
- Establish a scalable foundation for future departmental use.

---

## 3. Target Users

### Alumni
Can:
- Access their own profile.
- Submit personal and academic information.
- Update contact and employment information.
- Submit changes for verification.
- View the status of their submissions.

### Faculty
Can:
- Search and filter alumni.
- View alumni profiles.
- Access approved academic and career information.
- View analytics dashboards.

### Administrator
Can:
- Manage alumni records.
- Review and verify submissions.
- Add, edit, or deactivate records.
- Manage academic and employment information.
- Access analytics.
- Monitor data quality.

---

## 4. Core Application Areas

The application consists of:

1. Alumni Portal
2. Alumni Directory
3. Alumni Profiles
4. Admin Panel
5. Analytics Dashboard

Analytics consists of two dashboard pages:

- Alumni & Academic Overview
- Career Landscape

---

## 5. Core Database Structure

PostgreSQL is the central source of truth.

Current core tables:

- alumni
- academic_records
- employment
- employment_history

`student_id` is currently the primary identifier used to relate alumni records.

`alumni_id` follows the format:

`AL-00001`

The database schema and relationships are defined in:

`database/schema.sql`

Detailed field definitions are documented in:

`docs/database_dictionary.md`

---

## 6. System Architecture

The intended architecture is:

Frontend
→ React + TypeScript

Backend
→ FastAPI + Python

Database
→ PostgreSQL

Data Processing
→ Python

Visualization
→ Recharts

General flow:

React Frontend
↓
FastAPI Backend
↓
PostgreSQL

The frontend must never connect directly to PostgreSQL.

---

## 7. Data Flow

### Initial Data Migration

Excel
↓
Python validation/ETL
↓
PostgreSQL

### Alumni Information Update

Alumni Portal
↓
FastAPI
↓
Validation
↓
Pending Submission
↓
Administrator Review
↓
Approval
↓
PostgreSQL

### Analytics

PostgreSQL
↓
FastAPI
↓
Aggregated API responses
↓
React Dashboard

Detailed data-processing rules are documented in:

`docs/data_workflow.md`

---

## 8. Authentication & Permissions

The system uses role-based access.

Roles:

- Alumni
- Faculty
- Administrator

Alumni should only be able to manage their own information.

Faculty should primarily have read access.

Administrators have management and verification privileges.

Security requirements are documented in:

`docs/security.md`

---

## 9. API

The backend exposes REST APIs through FastAPI.

API structure and intended endpoints are documented in:

`docs/api_spec.md`

The API should be treated as the controlled interface between the frontend and PostgreSQL.

---

## 10. User Interface

The interface should be:

- Professional
- Clean
- Modern
- Easy to navigate
- Data-focused
- Responsive
- Suitable for a university departmental system

UI/UX requirements and recommendations are documented in:

`docs/ui_ux_recommendations.md`

Visual references and design inspiration are stored in the project's design/reference folders.

Branding requirements are documented in:

`docs/brand_guidelines.md`

Do not copy reference websites directly. Use them only as visual and UX inspiration.

---

## 11. Development Environment

Current environment:

- OS: Windows
- Database: PostgreSQL 18
- Database GUI: pgAdmin
- Frontend: React + TypeScript
- Backend: FastAPI + Python
- Database Driver: psycopg
- Visualization: Recharts
- Development approach: Claude Code / Vibe Coding
- Database: Local PostgreSQL during prototype development

Environment details are documented in:

`docs/environment.md`

---

## 12. Data & Privacy

The current development dataset is synthetic.

Approximately 500 dummy alumni records are being used for development and testing.

No real alumni personal information should be used during prototype development.

Database credentials and secrets must remain in `.env`.

`.env` must never be committed to Git or exposed in source code.

---

## 13. Important Business Rules

- `Student_ID` is the current primary identifier.
- `Alumni_ID` follows the `AL-00001` format.
- Personal email is stored separately from any institutional email.
- Alumni may have an International Business major or minor.
- Major/degree combinations must be academically valid.
- BBA alumni must have completed the mandatory internship in the prototype dataset.
- Other degrees may or may not have internship information.
- One alumni may have multiple employment history records.
- Current employment is stored separately from employment history.
- Employment status may include:
  - Employed
  - Seeking Employment
  - Further Studies
  - Self-Employed
- PostgreSQL is the source of truth.
- Submitted alumni changes should go through verification before becoming official records.

---

## 14. Current Scope

The prototype focuses on:

- Alumni information management
- Alumni self-service
- Alumni directory
- Alumni profiles
- Academic information
- Contact information
- Current employment
- Employment history
- Verification workflow
- Two live analytics dashboards
- Admin management

---

## 15. Out of Scope for the Current Prototype

Do not implement these unless explicitly requested:

- Alumni events management
- Event registration
- Donations/fundraising
- Alumni networking/social features
- Job board
- Newsletter management
- Messaging system
- Advanced AI functionality
- IUB-wide university system integration
- Complex institutional SSO

These may be considered future extensions.

---

## 16. Project Documentation Map

Use the following documents as the project's source of truth:

### Product Requirements
`PRD.md`

Defines:
- Product goals
- Functional requirements
- User roles
- Modules
- Workflows
- Acceptance criteria
- Development roadmap

### Database
`database/schema.sql`

Defines:
- Tables
- Columns
- Primary keys
- Foreign keys
- Constraints

### Database Dictionary
`docs/database_dictionary.md`

Defines:
- Meaning of database fields
- Expected values
- Data relationships

### API
`docs/api_spec.md`

Defines:
- API architecture
- Endpoints
- Request/response expectations

### Security
`docs/security.md`

Defines:
- Authentication
- Authorization
- Data protection
- Security requirements

### Data Workflow
`docs/data_workflow.md`

Defines:
- Data ingestion
- Validation
- Cleaning
- ETL
- Database loading

### UI/UX
`docs/ui_ux_recommendations.md`

Defines:
- Layout
- Navigation
- Components
- UX requirements
- Interaction patterns

### Branding
`docs/brand_guidelines.md`

Defines:
- Brand identity
- Colors
- Typography
- Logo usage
- Visual direction

### Environment
`docs/environment.md`

Defines:
- Development environment
- Technology stack
- Local infrastructure

### Design References

The provided images/reference assets are visual inspiration for the interface and should be considered alongside the UI/UX and branding documentation.

---

## 17. Development Principles

When implementing the system:

1. Read the relevant documentation before making architectural decisions.
2. Follow the PRD as the primary product specification.
3. Follow `schema.sql` as the authoritative database structure.
4. Do not invent new database structures when an existing structure already satisfies the requirement.
5. Keep frontend, backend, and database responsibilities separated.
6. Never expose database credentials in source code.
7. Do not use real alumni data during development.
8. Build incrementally rather than generating the entire application at once.
9. Preserve working functionality when adding new features.
10. Test each major feature before moving to the next development phase.
11. Ask for clarification when requirements conflict instead of silently making major architectural changes.
12. Prefer maintainable, production-oriented code over quick hacks.

---

## 18. Development Strategy

The system should be developed incrementally in the following order:

1. Project setup
2. PostgreSQL connection
3. Backend structure
4. Database models and APIs
5. Authentication and role management
6. Alumni portal
7. Alumni directory
8. Alumni profiles
9. Admin panel
10. Verification workflow
11. Analytics dashboards
12. Data validation and quality controls
13. Security hardening
14. Testing
15. Deployment preparation

Do not attempt to implement all phases simultaneously.

---

## 19. Prototype Philosophy

The prototype should demonstrate the complete information lifecycle:

Collect
→ Validate
→ Verify
→ Store
→ Manage
→ Analyze
→ Update
→ Audit

The objective is not simply to create a website.

The objective is to demonstrate a functioning departmental information system that can eventually evolve into a long-term institutional alumni management infrastructure.