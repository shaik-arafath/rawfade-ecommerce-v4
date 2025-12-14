const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('Testing email service...');
    
    // RAW FADE email service (same config as production email-server)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'rawfadeclothing@gmail.com',
            pass: 'ftmczqvlsfwduybn'
        }
    });

    try {
        const info = await transporter.sendMail({
            from: 'rawfadeclothing@gmail.com',
            to: 'rawfadeclothing@gmail.com',
            subject: 'Test Email - RAW FADE System',
            html: '<h2>Test Email</h2><p>This is a test to verify email service is working.</p>'
        });
        
        console.log('Email sent successfully:', info.messageId);
    } catch (error) {
        console.error('Email failed:', error.message);
    }
}

testEmail();
