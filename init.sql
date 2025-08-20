-- Initialize the email_marketing database
-- This file is automatically executed when the PostgreSQL container starts

-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE email_marketing'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'email_marketing')\gexec

-- Connect to the email_marketing database
\c email_marketing;

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function to generate random UUIDs (used by Prisma)
CREATE OR REPLACE FUNCTION gen_random_uuid() RETURNS uuid AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;