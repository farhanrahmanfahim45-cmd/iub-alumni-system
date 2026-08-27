**Product Requirements Document (PRD)**

**IUB International Business Alumni Information Management System**

**Version:** 1.0  
**Status:** Prototype / Faculty Demonstration  
**Primary Department:** Department of International Business, Independent University, Bangladesh (IUB)  
**Primary Objective:** Establish a centralized, secure, web-based alumni information infrastructure for collecting, verifying, managing, and analyzing alumni academic, contact, and career information.

**1\. Product Overview**

The **IUB International Business Alumni Information Management System** is a web-based information system designed to create a centralized and continuously maintainable database of alumni who have completed a **Major or Minor in International Business**.

The system will replace fragmented spreadsheets and manually maintained records with a structured platform where:

- Alumni can submit and update their information.
- Department administrators can verify and manage submitted information.
- Faculty/admin users can search and view alumni records.
- The system can provide live academic and career analytics.
- PostgreSQL serves as the central source of truth.
- The web application provides the operational interface.
- Python-based ETL/data-processing workflows can be used for initial data migration and future bulk updates.

The prototype will initially use a **dummy dataset of approximately 500 alumni** and will not contain real personal information.

**2\. Problem Statement**

The Department currently lacks a centralized, structured, continuously updated system for maintaining information about alumni associated with International Business.

Existing information may be distributed across:

- Excel files
- Academic records
- Individual faculty records
- Alumni-provided information
- Other departmental sources

This creates several problems:

- Difficulty locating alumni records.
- Difficulty determining current employment status.
- Lack of structured employment history.
- Difficulty maintaining updated contact information.
- No centralized verification mechanism.
- Limited analytical capability.
- High dependence on manually maintained spreadsheets.
- Risk of duplicate, outdated, or inconsistent information.

The proposed system addresses these problems by establishing a centralized database and web-based interface.

**3\. Product Goals**

**Primary Goals**

**3.1 Centralize Alumni Information**

Maintain a structured database containing:

- Personal information
- Academic information
- Contact information
- Internship information
- Research interests
- Current employment
- Employment history

**3.2 Enable Alumni Self-Service**

Allow alumni to:

- Register/claim their profile.
- Provide their information.
- Update their information.
- Submit employment updates.
- Track verification status.

**3.3 Establish Data Verification**

Ensure that information submitted by alumni does not immediately become official institutional data.

All significant submissions should go through:

**Submit → Validate → Review → Approve → Store**

**3.4 Provide Live Analytics**

Allow authorized faculty/admin users to see current statistics directly from PostgreSQL.

**3.5 Create a Scalable Foundation**

The prototype should be designed so that it can eventually become a production-level departmental system without requiring a complete architectural redesign.

**4\. Non-Goals for Prototype**

The first version will **not** attempt to implement:

- Alumni events management
- Event registration
- Donations/fundraising
- Alumni networking/social features
- Messaging between alumni
- Job board
- Newsletter management
- Advanced AI features
- IUB-wide integration
- Complex institutional SSO

These may be considered future extensions.

**5\. Target Users**

The system will have three primary user roles.

**5.1 Alumni**

Can:

- Create/claim a profile.
- Submit information.
- View their profile.
- Request changes.
- Update employment information.
- View submission/verification status.

They **cannot directly modify verified institutional records**.

**5.2 Faculty**

Can:

- Search alumni.
- Filter alumni.
- View alumni profiles.
- View academic/career information.
- Access dashboards.

Faculty permissions may be read-only in the prototype.

**5.3 Administrator**

Can:

- Manage alumni records.
- Verify alumni.
- Approve/reject submissions.
- Correct records.
- Add/edit employment information.
- Manage users.
- Access dashboards.
- Review data-quality issues.

**6\. Core System Modules**

The application will contain four primary functional areas across two portals.

IUB ALUMNI SYSTEM

├── Alumni Portal

│ ├── My Profile

│ ├── Profile Submission

│ ├── Update Information

│ └── Submission Status

│

└── Admin/Faculty Portal

├── Alumni Directory

├── Alumni Profiles

├── Verification Center

├── Admin Management

└── Analytics

**7\. Alumni Portal**

**7.1 Registration / Profile Claiming**

An alumni should be able to identify themselves using their institutional information.

Primary identifier:

**Student ID**

Example:

2310843

The system should eventually verify the Student ID against the existing database.

**Initial workflow**

Alumni

↓

Enter Student ID

↓

System checks database

↓

Existing record found

↓

Claim profile

↓

Authentication/verification

↓

Access profile

For alumni not yet present in the database:

Submit information

↓

Pending verification

↓

Admin review

**8\. Alumni Profile**

Each alumni should have a dedicated profile.

Example:

**Ahmed Rahman**

AL-00001  
Student ID: 2310843

**Academic Information**

- Degree
- Major
- Minor
- Admission Year
- Graduation Year
- CGPA
- Academic Honors
- Internship information
- Research Interest

**Contact Information**

- Personal Email
- Phone
- LinkedIn
- Location

**Current Employment**

- Employment Status
- Company
- Job Title
- Industry
- Job Function
- Country
- City
- Start Year

**Employment History**

Display previous employment as a chronological timeline/table.

Example:

| **Period**   | **Organization** | **Position** | **Industry** |
| ------------ | ---------------- | ------------ | ------------ |
| 2027–Present | Company A        | Manager      | FMCG         |
| 2025–2027    | Company B        | Executive    | Retail       |

One alumni may have **zero, one, or multiple historical employment records**.

**9\. Alumni Information Submission**

Alumni should be able to submit or update:

- Personal details
- Contact information
- Academic information
- Internship
- Research interests
- Current employment
- Employment history

However, submitted information should initially be stored as a **pending submission** rather than immediately overwriting official data.

**10\. Verification Workflow**

The system should implement:

Alumni submits information

↓

Frontend validation

↓

Backend validation

↓

Pending submission

↓

Administrator review

↓

┌────────┼────────┐

↓ ↓ ↓

Approve Reject Correction

↓

Official database

**Submission states**

- Pending
- Approved
- Rejected
- Correction Required

The administrator should be able to view the old and proposed values before approval.

Example:

Current Company:

ABC Ltd.

Requested Change:

XYZ Ltd.

\[Approve\] \[Reject\] \[Request Correction\]

**11\. Alumni Directory**

The directory is the main administrative search interface.

**Search**

Users with appropriate permissions should be able to search by:

- Name
- Student ID
- Alumni ID
- Personal email
- Company

**Filters**

- Degree
- Major
- Minor
- Graduation Year
- Employment Status
- Industry
- Country

**Directory Results**

Display:

| **Student ID** | **Name** | **Degree** | **Major** | **Graduation** | **Company** |
| -------------- | -------- | ---------- | --------- | -------------- | ----------- |

Clicking a record opens the full alumni profile.

**12\. Alumni Identification**

Currently, **Student ID is the primary identifier**.

Example:

2310843

The system should also support an Alumni ID:

AL-00001

The Alumni ID will be treated as the long-term institutional identifier.

For the prototype, the Alumni IDs are populated in the dummy dataset.

In a future production deployment, the department may determine whether Alumni IDs are assigned:

- At graduation
- During verification
- During profile claiming

The database should support this transition without changing the Student ID relationship structure.

**13\. Academic Data Requirements**

Academic records should contain:

- Student ID
- CGPA
- Academic Honors
- Internship Completed
- Internship Organization
- Internship Position
- Internship Industry
- Research Interest

**Internship rule**

For the current prototype:

**BBA alumni must have completed an internship.**

Other degrees may or may not have internships depending on their academic requirements.

The system should therefore not universally enforce internship completion for every degree.

**14\. Employment Data Requirements**

**Current Employment**

The system should support:

- Employed
- Seeking Employment
- Further Studies
- Self-Employed

For employed alumni:

- Company
- Job Title
- Industry
- Job Function
- Country
- City
- Start Year

**Employment History**

A separate structure should support multiple previous employment records.

One Alumni

↓

Current Employment

-

Employment History #1

Employment History #2

Employment History #3

...

**15\. Analytics**

Analytics will be integrated directly into the web application rather than relying on Tableau for the prototype.

The dashboards will query PostgreSQL through the backend.

**16\. Dashboard 1 — Alumni & Academic Overview**

**KPI Cards**

- Total Alumni
- International Business Majors
- International Business Minors
- Average CGPA
- Internship Completion

**Visualizations**

1. Alumni by Graduation Year
2. Degree Distribution
3. Major Distribution
4. Minor Distribution
5. CGPA Distribution
6. Internship Completion

**Filters**

- Graduation Year
- Degree
- Major
- Minor

All visualizations should update dynamically based on selected filters.

**17\. Dashboard 2 — Career Landscape**

**KPI Cards**

- Employed
- Seeking Employment
- Further Studies
- Self-Employed

**Visualizations**

1. Employment by Industry
2. Top Employers
3. Employment by Job Function
4. Employment by Country
5. Current Career Snapshot
6. Employment History / Career Progression

Filters may include:

- Graduation Year
- Degree
- Major
- Minor
- Industry
- Country
- Employment Status

**18\. Data Architecture**

PostgreSQL will serve as the **single source of truth**.

Current core database tables:

alumni

academic_records

employment

employment_history

Relationships:

alumni

student_id PK

│

┌───────────┼────────────┐

│ │ │

▼ ▼ ▼

academic employment employment

records current history

student_id is the foreign key connecting the tables.

**19\. Future Supporting Tables**

The prototype can later introduce additional tables such as:

users

roles

alumni_submissions

audit_logs

notifications

These should be added when authentication, verification, and auditing are implemented.

**20\. Technical Architecture**

Recommended stack:

**Frontend**

**React + TypeScript**

Responsibilities:

- User interface
- Forms
- Directory
- Profiles
- Dashboards
- Filtering
- Authentication interface

**Backend**

**FastAPI + Python**

Responsibilities:

- REST API
- Authentication
- Authorization
- Business logic
- Validation
- Database interaction
- Dashboard queries
- Submission workflow

**Database**

**PostgreSQL**

Responsibilities:

- Permanent data storage
- Relational integrity
- Constraints
- Querying
- Aggregation

**Data Processing**

**Python**

Used for:

- Initial Excel → PostgreSQL migration
- Data validation
- Cleaning
- Duplicate detection
- Future bulk imports

**Visualization**

Recommended:

- Recharts, or
- Apache ECharts

inside the React application.

**21\. Data Flow**

**Initial Data Migration**

The existing 500-record dummy dataset will be used for the prototype.

Excel

↓

Python ETL

↓

Validation

↓

PostgreSQL

**Normal Alumni Update**

Alumni Portal

↓

FastAPI

↓

Validation

↓

Pending Submission

↓

Admin Verification

↓

PostgreSQL

**Dashboard**

PostgreSQL

↓

FastAPI

↓

Aggregated API response

↓

React Dashboard

The frontend should **never connect directly to PostgreSQL**.

**22\. API Requirements**

Representative endpoints:

**Authentication**

POST /api/auth/login

POST /api/auth/register

POST /api/auth/logout

**Alumni**

GET /api/alumni

GET /api/alumni/{student_id}

POST /api/alumni

PUT /api/alumni/{student_id}

**Academic**

GET /api/alumni/{student_id}/academic

PUT /api/alumni/{student_id}/academic

**Employment**

GET /api/alumni/{student_id}/employment

PUT /api/alumni/{student_id}/employment

POST /api/alumni/{student_id}/employment-history

**Submissions**

POST /api/submissions

GET /api/submissions

PUT /api/submissions/{id}/approve

PUT /api/submissions/{id}/reject

**Analytics**

GET /api/dashboard/overview

GET /api/dashboard/career

**23\. Security Requirements**

Because the system stores personal information, security is a core requirement.

**Authentication**

Users must authenticate before accessing restricted functions.

**Role-Based Access Control**

**Alumni**

Can:

- View own profile
- Submit changes
- View submission status

Cannot:

- View other alumni's private information
- Modify verified institutional records
- Access administrative functions

**Faculty**

Can:

- View directory
- View profiles
- Access analytics

**Administrator**

Can:

- Manage records
- Verify submissions
- Modify data
- Manage users
- Access all dashboards

**24\. Database Security**

The application must not expose PostgreSQL credentials to the frontend.

Correct:

React

↓

FastAPI

↓

PostgreSQL

Incorrect:

React

↓

PostgreSQL

The application should use a dedicated PostgreSQL user rather than the PostgreSQL superuser.

**25\. Personal Information Protection**

Contact information should not automatically be publicly exposed.

Sensitive fields such as:

- Personal email
- Phone

should only be visible to users with appropriate permissions.

Alumni should also have control over which optional information they make visible to other authorized users, subject to departmental policy.

The final privacy/visibility policy should be approved by IUB/departmental authorities before production deployment.

**26\. Data Validation**

Validation should happen at multiple layers.

**Frontend**

- Required fields
- Email format
- Student ID format
- Year format

**Backend**

- Business rules
- Allowed values
- Duplicate detection
- Relationship validation

**PostgreSQL**

- Primary keys
- Foreign keys
- Unique constraints
- Check constraints
- Data types

**27\. Audit Logging**

The production system should record important administrative actions.

Example:

| **User** | **Action**       | **Record** | **Timestamp** |
| -------- | ---------------- | ---------- | ------------- |
| Admin01  | Updated CGPA     | 2310843    | 2026-08-26    |
| Alumni02 | Submitted update | AL-00002   | 2026-08-26    |
| Admin01  | Approved update  | AL-00002   | 2026-08-27    |

This provides accountability and makes unauthorized changes easier to investigate.

**28\. Backup & Recovery**

PostgreSQL should have regular backups.

Architecture:

Production PostgreSQL

↓

Automated Backup

↓

Separate Storage

The backup should not be stored only on the same machine as the production database.

**29\. Data Quality Management**

The system should eventually detect:

- Duplicate Student IDs
- Duplicate email addresses
- Missing contact information
- Invalid CGPA
- Invalid years
- Inconsistent employment data
- Missing required information
- Potential duplicate alumni

The admin panel should show a simple **Data Quality Summary**.

Example:

Data Quality

Incomplete Profiles 17

Pending Verification 12

Potential Duplicates 3

Missing Employment Info 24

**30\. UI/UX Requirements**

The interface should be:

- Clean
- Professional
- University-oriented
- Responsive
- Desktop-first for administration
- Mobile-friendly for alumni

The design should prioritize:

**Clarity → Searchability → Data readability → Minimal complexity**

Avoid excessive animations or decorative elements.

**31\. Prototype Dataset**

The prototype will initially use approximately **500 synthetic alumni records**.

The dataset should contain realistic variation including:

- Different admission years
- Different graduation years
- BBA-heavy degree distribution
- International Business majors
- International Business minors
- Other valid majors aligned with their respective degrees
- Different CGPAs
- Different employment statuses
- Multiple employment history records
- Different industries
- Different countries/cities
- Some unemployed alumni
- Some alumni pursuing further studies
- Missing/optional information where realistic

The dataset must contain **no real personal information**.

**32\. Prototype Scope**

The first working prototype should demonstrate:

**Alumni Side**

- Registration/profile submission
- Login
- Profile
- Profile update request
- Submission status

**Admin Side**

- Login
- Alumni directory
- Search/filter
- Profile viewing
- Record editing
- Submission verification

**Analytics**

- Academic dashboard
- Career dashboard
- Live PostgreSQL-backed data

**33\. Prototype User Journey**

**Alumni**

Login

↓

My Profile

↓

Review Information

↓

Update Employment

↓

Submit

↓

Pending Verification

**Admin**

Login

↓

Dashboard

↓

Pending Submissions

↓

Review

↓

Approve

↓

Database Updated

**Faculty**

Login

↓

Alumni Directory

↓

Search/Filter

↓

Open Profile

↓

View Academic/Career Information

**34\. Future Expansion**

The architecture should allow future modules to be added without rebuilding the core system.

Potential future features:

- Alumni events
- Event registration
- Alumni networking
- Mentorship
- Job opportunities
- Department newsletters
- Alumni engagement tracking
- Automated email communication
- Alumni surveys
- Advanced career analytics
- IUB authentication/SSO
- Integration with university systems

These are **outside the current prototype scope**.

**35\. Development Roadmap**

**Phase 1 — Database**

**Complete/current**

Excel

↓

Python validation

↓

PostgreSQL

Finalize:

- Schema
- Constraints
- Relationships
- Dummy dataset
- Data validation

**Phase 2 — Backend**

Build:

- FastAPI
- Database connection
- CRUD APIs
- Validation
- Authentication foundation

**Phase 3 — Frontend**

Build:

- Login
- Alumni directory
- Profile
- Alumni submission
- Admin interface

**Phase 4 — Analytics**

Build:

- Academic dashboard
- Career dashboard
- Dynamic filtering
- PostgreSQL-backed metrics

**Phase 5 — Security & Governance**

Add:

- RBAC
- Verification workflow
- Audit logs
- Data-quality monitoring
- Backup strategy

**Phase 6 — Deployment**

Deploy:

React

↓

Web Hosting

FastAPI

↓

Cloud Server

PostgreSQL

↓

Managed Database

**36\. Acceptance Criteria**

The prototype will be considered successful when:

**Database**

- 500 synthetic alumni can be stored.
- Relationships between the four core tables work correctly.
- Referential integrity is maintained.

**Alumni**

- An alumni can submit their information.
- An alumni can view their profile.
- An alumni can submit an update.

**Administration**

- Admin can search and filter alumni.
- Admin can view complete profiles.
- Admin can approve/reject submissions.
- Approved changes update the official database.

**Analytics**

- Dashboards pull data directly from PostgreSQL.
- KPI values reflect database changes.
- Filters dynamically update visualizations.

**Security**

- Users must authenticate.
- Alumni cannot access admin functions.
- PostgreSQL credentials are never exposed to the frontend.
- Sensitive contact information is appropriately restricted.

**37\. Success Criteria**

The prototype should demonstrate that the department can move from:

**Fragmented alumni information**

to:

**A centralized, verified, searchable and analytically useful alumni information system.**

The most important demonstration should be the **complete data lifecycle**:

ALUMNI

│

▼

Submit Information

│

▼

Validation

│

▼

Admin Verification

│

▼

PostgreSQL

SOURCE OF TRUTH

│

┌────────┴─────────┐

▼ ▼

Directory Dashboards

│ │

└────────┬─────────┘

▼

Departmental Insight

**Core product philosophy**

**Collect → Validate → Verify → Store → Manage → Analyze → Update → Audit**

That should be the central idea behind the entire application.

For the **Claude/vibe-coding phase**, this PRD should be treated as the product specification; Claude should build the system incrementally from the architecture rather than attempting to generate the entire application in one pass.