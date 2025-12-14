const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rawfadeclothing@gmail.com',
    pass: 'ftmczqvlsfwduybn' // Gmail app password for RAW FADE
  }
});

// API Routes

// Send order email notification
app.post('/api/orders/send-email', async (req, res) => {
  try {
    const { orderId, customerEmail, customerData, totalAmount, razorpayPaymentId } = req.body;
    
    // Create email content
    const emailContent = `
      <h2>New Order Received - RAW FADE</h2>
      <h3>Order Details</h3>
      <p><strong>Order ID:</strong> #${orderId}</p>
      <p><strong>Payment ID:</strong> ${razorpayPaymentId}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${customerData.firstName} ${customerData.lastName}</p>
      <p><strong>Email:</strong> ${customerData.email}</p>
      <p><strong>Phone:</strong> ${customerData.phone}</p>
      <p><strong>Address:</strong> ${customerData.address}, ${customerData.city}, ${customerData.state} - ${customerData.pincode}</p>
      
      <h3>Order Summary</h3>
      <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
      <p><strong>Payment Status:</strong> Success</p>
      
      <h3>Items Ordered</h3>
      <p>Order details will be available in the admin panel.</p>
      
      <hr>
      <p><em>This is an automated email from RAW FADE e-commerce system.</em></p>
    `;
    
    // Send email
    const mailOptions = {
      from: 'rawfadeclothing@gmail.com',
      to: 'rawfadeclothing@gmail.com',
      subject: `New Order Received - Order #${orderId}`,
      html: emailContent
    };
    
    await transporter.sendMail(mailOptions);
    
    console.log(`Order confirmation email sent for order #${orderId}`);
    res.json({ success: true, message: 'Email sent successfully' });
    
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Email service running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Email service running on http://localhost:${PORT}`);
  console.log('Email service configured for rawfadeclothing@gmail.com');
});
