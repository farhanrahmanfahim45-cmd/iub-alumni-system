CREATE TABLE alumni (
    student_id VARCHAR(7) PRIMARY KEY,
    alumni_id VARCHAR(8) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    personal_email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    linkedin_url TEXT,
    degree VARCHAR(20) NOT NULL,
    major VARCHAR(100) NOT NULL,
    minor VARCHAR(100),
    admission_year INT,
    graduation_year INT,

    CONSTRAINT chk_alumni_id
        CHECK (alumni_id ~ '^AL-[0-9]{5}$'),

    CONSTRAINT chk_email
        CHECK (personal_email ~ '^[^@]+@iub\.edu\.bd$'),

    CONSTRAINT chk_years
        CHECK (graduation_year >= admission_year)
);

CREATE TABLE academic_records (
    academic_id VARCHAR(20) PRIMARY KEY,
    student_id VARCHAR(7) NOT NULL,
    cgpa NUMERIC(3,2),
    academic_honors VARCHAR(100),
    internship_completed VARCHAR(10),
    internship_organization VARCHAR(255),
    internship_position VARCHAR(150),
    internship_industry VARCHAR(100),
    research_interest VARCHAR(255),

    CONSTRAINT fk_academic_alumni
        FOREIGN KEY (student_id)
        REFERENCES alumni(student_id),

    CONSTRAINT chk_cgpa
        CHECK (cgpa >= 0 AND cgpa <= 4.00),

    CONSTRAINT chk_internship
        CHECK (internship_completed IN ('Yes', 'No'))
);

CREATE TABLE employment (
    employment_id VARCHAR(20) PRIMARY KEY,
    student_id VARCHAR(7) NOT NULL,
    employment_status VARCHAR(50) NOT NULL,
    company VARCHAR(255),
    job_title VARCHAR(150),
    industry VARCHAR(100),
    job_function VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    start_year INT,

    CONSTRAINT fk_employment_alumni
        FOREIGN KEY (student_id)
        REFERENCES alumni(student_id),

    CONSTRAINT chk_employment_status
        CHECK (
            employment_status IN (
                'Employed',
                'Seeking Employment',
                'Further Studies',
                'Self-Employed'
            )
        )
);

CREATE TABLE employment_history (
    employment_history_id VARCHAR(20) PRIMARY KEY,
    student_id VARCHAR(7) NOT NULL,
    company VARCHAR(255),
    job_title VARCHAR(150),
    industry VARCHAR(100),
    job_function VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    start_year INT,
    end_year INT,

    CONSTRAINT fk_history_alumni
        FOREIGN KEY (student_id)
        REFERENCES alumni(student_id),

    CONSTRAINT chk_employment_years
        CHECK (
            end_year IS NULL
            OR end_year >= start_year
        )
);