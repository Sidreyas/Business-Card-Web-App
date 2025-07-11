-- Business Card OCR Database Schema
-- PostgreSQL Schema for centralized data storage

-- Users table to manage unique usernames
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_cards INTEGER DEFAULT 0
);

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Main table for all business card entries
CREATE TABLE IF NOT EXISTS business_card_entries (
    id SERIAL PRIMARY KEY,
    
    -- User Information
    user_name VARCHAR(100) NOT NULL,
    
    -- OCR Results
    ocr_text TEXT,
    ocr_method VARCHAR(50), -- 'amazon_textract', 'google_vision', 'tesseract'
    parsing_method VARCHAR(50) DEFAULT 'rule_based', -- 'rule_based', 'ai', 'fallback'
    
    -- Parsed Business Card Data
    name VARCHAR(255),
    title VARCHAR(255),
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    address TEXT,
    
    -- User Comments and Metadata
    user_comment TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_on DATE DEFAULT CURRENT_DATE,
    
    -- Optional: Success indicators
    ocr_success BOOLEAN DEFAULT true,
    parsing_success BOOLEAN DEFAULT true
);

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
