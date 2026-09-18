-- ====================================================================
-- PostgreSQL & Supabase Database Schema Script
-- University Event Management Platform
-- ====================================================================

-- 1. Create Enums (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
        CREATE TYPE role_enum AS ENUM ('student', 'coordinator', 'mentor', 'finance', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_state_enum') THEN
        CREATE TYPE event_state_enum AS ENUM (
            'draft', 'submitted', 'faculty_review', 'finance_review', 
            'approved', 'published', 'registration_closed', 'in_progress', 
            'pending_completion', 'completed', 'cancelled'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status_enum') THEN
        CREATE TYPE registration_status_enum AS ENUM ('registered', 'waitlisted', 'cancelled');
    END IF;
END $$;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role role_enum DEFAULT 'student'::role_enum NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    bio TEXT,
    phone_number VARCHAR(50),
    department VARCHAR(255),
    gender VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Students Table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_number VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(255),
    semester INTEGER
);

CREATE INDEX IF NOT EXISTS idx_students_number ON students(student_number);

-- 4. Clubs Table
CREATE TABLE IF NOT EXISTS clubs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs(name);

-- 5. Events Table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    location VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL,
    budget INTEGER DEFAULT 0 NOT NULL,
    state event_state_enum DEFAULT 'draft'::event_state_enum NOT NULL,
    attendance_file_url TEXT,
    club_id INTEGER REFERENCES clubs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_title ON events(title);

-- 6. Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status registration_status_enum DEFAULT 'registered'::registration_status_enum,
    rank VARCHAR(100),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER UNIQUE NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    secure_token VARCHAR(255) UNIQUE NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_token ON tickets(secure_token);

-- 8. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER UNIQUE NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scanned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    certificate_number VARCHAR(255) UNIQUE NOT NULL,
    rank VARCHAR(100) DEFAULT 'Participation',
    is_published INTEGER DEFAULT 0,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);

-- 10. Participation Ledger Table
CREATE TABLE IF NOT EXISTS participation_ledger (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    hours_earned DOUBLE PRECISION NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    event_id INTEGER UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    total_allocated DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
    proposed_amount DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    proposed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    sentiment_score VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schema initialization complete
