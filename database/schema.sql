-- Business Card OCR Database Schema
-- PostgreSQL Schema for centralized data storage

-- SQL schema for users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_cards INT DEFAULT 0
);

-- SQL schema for business_card_entries table
CREATE TABLE IF NOT EXISTS business_card_entries (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    ocr_text TEXT NOT NULL,
    ocr_method VARCHAR(50) NOT NULL,
    parsing_method VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    title VARCHAR(255),
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    address TEXT,
    user_comment TEXT,
    ocr_success BOOLEAN DEFAULT TRUE,
    parsing_success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint
ALTER TABLE business_card_entries
ADD CONSTRAINT fk_user_name FOREIGN KEY (user_name)
REFERENCES users (username)
ON DELETE CASCADE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_card_user_name ON business_card_entries (user_name);
CREATE INDEX IF NOT EXISTS idx_business_card_created_at ON business_card_entries (created_at);
CREATE INDEX IF NOT EXISTS idx_business_card_company ON business_card_entries (company);
CREATE INDEX IF NOT EXISTS idx_business_card_email ON business_card_entries (email);
CREATE INDEX IF NOT EXISTS idx_business_card_generated_on ON business_card_entries (generated_on);

-- Create a view for easy querying with formatted data
CREATE OR REPLACE VIEW business_card_summary AS
SELECT 
    id,
    user_name,
    name,
    title,
    company,
    email,
    phone,
    website,
    SUBSTRING(address, 1, 100) as address_short,
    user_comment,
    ocr_method,
    parsing_method,
    created_at,
    DATE(created_at) as created_date,
    CASE 
        WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' THEN 'Today'
        WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'This Week'
        WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 'This Month'
        ELSE 'Older'
    END as time_category
FROM business_card_entries
ORDER BY created_at DESC;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_business_card_entries_updated_at 
    BEFORE UPDATE ON business_card_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- INSERT INTO business_card_entries (
--     user_name, name, title, company, email, phone, website, address, user_comment, ocr_method, parsing_method
-- ) VALUES (
--     'Test User', 'John Smith', 'Senior Developer', 'TechCorp Inc', 'john@techcorp.com', '555-123-4567', 'www.techcorp.com', '123 Tech St, Silicon Valley, CA 94105', 'Sample business card', 'rule_based', 'rule_based'
-- );
