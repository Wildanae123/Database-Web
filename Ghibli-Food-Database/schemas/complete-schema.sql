-- Ghibli Food Database Complete Schema
-- PostgreSQL Database Schema for the Ghibli Food Recipe Application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Full Text Search extension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom ENUM types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'guest');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE library_status AS ENUM ('unread', 'reading', 'read', 'want_to_read');

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    profile_picture_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    genre VARCHAR(100) NOT NULL,
    description TEXT,
    published_date DATE,
    book_cover_url TEXT,
    cuisine_type VARCHAR(100),
    dietary_category VARCHAR(100),
    difficulty_level difficulty_level,
    ingredients JSONB,
    sample_recipes TEXT,
    author_bio TEXT,
    visibility BOOLEAN DEFAULT TRUE,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Books (Library) table
CREATE TABLE IF NOT EXISTS user_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status library_status DEFAULT 'unread',
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    notes TEXT,
    date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_started TIMESTAMP WITH TIME ZONE,
    date_completed TIMESTAMP WITH TIME ZONE,
    is_favorite BOOLEAN DEFAULT FALSE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- Categories table (for better genre management)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color code
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book Categories (many-to-many)
CREATE TABLE IF NOT EXISTS book_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(book_id, category_id)
);

-- Reviews table (separate from user_books for public reviews)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book Tags (many-to-many)
CREATE TABLE IF NOT EXISTS book_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(book_id, tag_id)
);

-- Notes table (standalone notes system)
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE, -- nullable for general notes
    title VARCHAR(255),
    content TEXT NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reading Sessions table (for tracking reading progress)
CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    pages_read INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendations table (for ML recommendations)
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    score DECIMAL(5,4) NOT NULL,
    reason TEXT,
    recommendation_type VARCHAR(50), -- 'content_based', 'collaborative', 'hybrid'
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Activity Log table (for audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Database migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_visibility ON books(visibility);
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_rating ON books(average_rating);

CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON user_books(book_id);
CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books(status);
CREATE INDEX IF NOT EXISTS idx_user_books_rating ON user_books(rating);
CREATE INDEX IF NOT EXISTS idx_user_books_favorite ON user_books(is_favorite);

CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_public ON reviews(is_public);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(is_archived);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON recommendations(score);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires_at ON recommendations(expires_at);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_books_title_gin ON books USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_books_description_gin ON books USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_books_search_gin ON books USING gin((title || ' ' || author || ' ' || COALESCE(description, '')));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_books_user_status ON user_books(user_id, status);
CREATE INDEX IF NOT EXISTS idx_books_genre_rating ON books(genre, average_rating);
CREATE INDEX IF NOT EXISTS idx_reviews_book_rating ON reviews(book_id, rating);

-- Functions and triggers for maintaining data integrity

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_books_updated_at BEFORE UPDATE ON user_books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update book rating averages
CREATE OR REPLACE FUNCTION update_book_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE books 
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating::decimal), 0) 
            FROM reviews 
            WHERE book_id = COALESCE(NEW.book_id, OLD.book_id) 
            AND is_public = true
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM reviews 
            WHERE book_id = COALESCE(NEW.book_id, OLD.book_id) 
            AND is_public = true
        )
    WHERE id = COALESCE(NEW.book_id, OLD.book_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for rating updates
CREATE TRIGGER update_book_rating_on_review 
    AFTER INSERT OR UPDATE OR DELETE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_book_rating();

-- Function for tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tag usage count
    UPDATE tags 
    SET usage_count = (
        SELECT COUNT(*) 
        FROM book_tags 
        WHERE tag_id = COALESCE(NEW.tag_id, OLD.tag_id)
    )
    WHERE id = COALESCE(NEW.tag_id, OLD.tag_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for tag usage count
CREATE TRIGGER update_tag_usage_count_trigger 
    AFTER INSERT OR DELETE ON book_tags 
    FOR EACH ROW 
    EXECUTE FUNCTION update_tag_usage_count();

-- Views for common queries

-- User library summary view
CREATE OR REPLACE VIEW user_library_summary AS
SELECT 
    u.id as user_id,
    u.name,
    COUNT(ub.id) as total_books,
    COUNT(CASE WHEN ub.status = 'read' THEN 1 END) as books_read,
    COUNT(CASE WHEN ub.status = 'reading' THEN 1 END) as books_reading,
    COUNT(CASE WHEN ub.status = 'unread' THEN 1 END) as books_unread,
    COUNT(CASE WHEN ub.is_favorite = true THEN 1 END) as favorite_books,
    AVG(ub.rating) as average_user_rating,
    MAX(ub.date_completed) as last_completed_date
FROM users u
LEFT JOIN user_books ub ON u.id = ub.user_id
GROUP BY u.id, u.name;

-- Popular books view
CREATE OR REPLACE VIEW popular_books AS
SELECT 
    b.*,
    COUNT(ub.id) as library_count,
    COUNT(r.id) as review_count,
    COALESCE(AVG(r.rating), 0) as avg_rating
FROM books b
LEFT JOIN user_books ub ON b.id = ub.book_id
LEFT JOIN reviews r ON b.id = r.book_id AND r.is_public = true
WHERE b.visibility = true
GROUP BY b.id
ORDER BY library_count DESC, avg_rating DESC;

-- Recent activity view
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    'book_added' as activity_type,
    b.title as description,
    b.created_at as activity_date,
    u.name as user_name,
    b.id as entity_id
FROM books b
JOIN users u ON b.user_id = u.id
WHERE b.created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
    'review_added' as activity_type,
    'Review for ' || b.title as description,
    r.created_at as activity_date,
    u.name as user_name,
    r.id as entity_id
FROM reviews r
JOIN books b ON r.book_id = b.id
JOIN users u ON r.user_id = u.id
WHERE r.created_at >= NOW() - INTERVAL '30 days'
AND r.is_public = true

ORDER BY activity_date DESC
LIMIT 100;