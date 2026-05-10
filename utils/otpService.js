const crypto = require('crypto');

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with email and expiration (90 seconds = 1.5 minutes)
const storeOTP = (email, otp) => {
    otpStore.set(email, {
        otp,
        expiresAt: Date.now() + 90 * 1000, // 90 seconds (1.5 minutes)
        attempts: 0
    });
    
    // Auto cleanup after 90 seconds
    setTimeout(() => {
        if (otpStore.has(email)) {
            otpStore.delete(email);
        }
    }, 90 * 1000);
};

// Verify OTP
const verifyOTP = (email, otp) => {
    const record = otpStore.get(email);
    
    if (!record) {
        return { valid: false, message: 'OTP expired or not found. Please request a new one.' };
    }
    
    if (record.expiresAt < Date.now()) {
        otpStore.delete(email);
        return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }
    
    if (record.attempts >= 5) {
        otpStore.delete(email);
        return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }
    
    if (record.otp !== otp) {
        record.attempts++;
        return { valid: false, message: `Invalid OTP. ${5 - record.attempts} attempts remaining.` };
    }
    
    // OTP verified successfully
    otpStore.delete(email);
    return { valid: true, message: 'Email verified successfully!' };
};

// Resend OTP (reset attempts and expiration)
const resendOTP = (email) => {
    if (otpStore.has(email)) {
        otpStore.delete(email);
    }
    const newOTP = generateOTP();
    storeOTP(email, newOTP);
    return newOTP;
};

module.exports = { generateOTP, storeOTP, verifyOTP, resendOTP };