import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send verification email
 */
export async function sendVerificationEmail(email, firstName, verifyUrl) {
  try {
    await transporter.sendMail({
      from: `"Friedays" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Verify Your Friedays Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #f39c00; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .btn { background: #f39c00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍗 Friedays Email Verification</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName || 'Valued Customer'},</p>
              <p>Welcome to Friedays! Please verify your email address to complete your account registration.</p>
              <p>Click the button below to verify your email within 24 hours:</p>
              <a href="${verifyUrl}" class="btn">Verify Email</a>
              <p>Or copy and paste this link:</p>
              <p>${verifyUrl}</p>
              <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Friedays. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${firstName},\n\nWelcome to Friedays! Please verify your email by visiting: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    });
    console.log('✅ Verification email sent to', email);
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, firstName, resetUrl) {
  try {
    await transporter.sendMail({
      from: `"Friedays" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Reset Your Friedays Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #f39c00; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .btn { background: #f39c00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
            .security-box { background: #fff3cd; border-left: 4px solid #f39c00; padding: 12px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Friedays Password Reset</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName || 'Valued Customer'},</p>
              <p>We received a request to reset the password for your Friedays account.</p>
              <p>Click the button below to reset your password within 30 minutes:</p>
              <a href="${resetUrl}" class="btn">Reset Password</a>
              <p>Or copy and paste this link:</p>
              <p>${resetUrl}</p>
              <div class="security-box">
                <strong>⚠️ Security Notice</strong>
                <p>If you did not request this, please ignore this email or contact support immediately.</p>
                <p>This link will expire in 30 minutes and can only be used once.</p>
                <p><strong>Never share this link with anyone.</strong></p>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Friedays. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${firstName},\n\nReset your password here: ${resetUrl}\n\nThis link expires in 30 minutes.\n\nIf you didn't request this, ignore this email.`,
    });
    console.log('✅ Password reset email sent to', email);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw error;
  }
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(email, firstName) {
  try {
    await transporter.sendMail({
      from: `"Friedays" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Your Friedays Password Has Been Changed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #f39c00; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Updated</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName || 'Valued Customer'},</p>
              <p>Your Friedays password has been successfully changed.</p>
              <p>If you did not make this change, please contact our support team immediately.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Friedays. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${firstName},\n\nYour password has been successfully changed.`,
    });
    console.log('✅ Password changed confirmation email sent to', email);
  } catch (error) {
    console.error('❌ Failed to send password changed email:', error);
    throw error;
  }
}

/**
 * Send account welcome email
 */
export async function sendWelcomeEmail(email, firstName) {
  try {
    await transporter.sendMail({
      from: `"Friedays" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Welcome to Friedays! 🍗',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #f39c00; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .benefit { background: white; padding: 10px; margin: 10px 0; border-left: 4px solid #f39c00; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍗 Welcome to Friedays! 🍗</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName || 'Valued Customer'},</p>
              <p>You're now a member of Friedays! Enjoy exclusive benefits and start earning rewards.</p>
              <p><strong>Your Starting Tier: Bronze</strong></p>
              <div class="benefit">
                <strong>🥉 Bronze Benefits:</strong>
                <ul>
                  <li>5% discount on all orders</li>
                  <li>Free delivery on orders ₱500+</li>
                  <li>Earn loyalty points on every order</li>
                </ul>
              </div>
              <p>Start ordering now and work your way up to Silver, Gold, and Platinum tiers for even better rewards!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Friedays. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to Friedays, ${firstName}!\n\nYou're now a Bronze member with 5% discount and loyalty rewards.`,
    });
    console.log('✅ Welcome email sent to', email);
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    throw error;
  }
}

/**
 * Send account lockout notification
 */
export async function sendAccountLockedEmail(email, firstName, unlockTime) {
  try {
    await transporter.sendMail({
      from: `"Friedays" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Your Friedays Account Has Been Locked',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Account Locked</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName || 'Valued Customer'},</p>
              <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
              <p><strong>Account will be unlocked at:</strong> ${unlockTime.toLocaleString()}</p>
              <p>If you didn't attempt to log in, please contact our support team immediately.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Friedays. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your account has been locked due to security. It will unlock at ${unlockTime.toLocaleString()}.`,
    });
    console.log('✅ Account locked notification sent to', email);
  } catch (error) {
    console.error('❌ Failed to send account locked email:', error);
    // Don't throw - this is non-critical
  }
}
