import { query } from './pool.js';

/**
 * Initialize database schema
 */
export async function initializeDatabase() {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        email_verified_at TIMESTAMP NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        phone_secondary VARCHAR(20),
        address_line1 VARCHAR(255) NOT NULL,
        address_line2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country CHAR(2) NOT NULL,
        address_notes TEXT,
        marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
        terms_accepted_at TIMESTAMP NOT NULL,
        privacy_accepted_at TIMESTAMP NOT NULL,
        oauth_provider VARCHAR(50),
        oauth_provider_id VARCHAR(128),
        account_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        account_locked_until TIMESTAMP,
        failed_login_count INT NOT NULL DEFAULT 0,
        tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
        loyalty_points INT NOT NULL DEFAULT 0,
        total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP
      );
    `);

    // Create indexes on users
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_provider_id);`);

    // Create password reset tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        requested_ip VARCHAR(45),
        user_agent VARCHAR(255)
      );
    `);

    // Create indexes on password reset tokens
    await query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);`);

    // Create email verification tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes on email verification tokens
    await query(`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id);`);

    // Create login attempts table
    await query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        email VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        success BOOLEAN NOT NULL,
        attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes on login attempts
    await query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at DESC);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id, attempted_at DESC);`);

    console.log('✅ All database tables initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}
