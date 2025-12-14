const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 5000;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Database connection
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'rawfade_user',
  password: 'Arafath143@',
  database: 'rawfade'
};

let dbConnection;

async function connectToDatabase() {
  try {
    dbConnection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL database');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'img/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Mock data storage (in production, use a proper database)
let orders = [];
let products = [
  {
    id: 1,
    title: "RAW FADE Premium Shirt",
    price: 1299,
    stock: 50,
    category: "shirts",
    brand: "RAW FADE",
    imagePath: "img/products/shirt1.jpg"
  },
  // Add more mock products as needed
];

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rawfadeclothing@gmail.com',
    // Google app passwords are shown with spaces, but should be used without spaces in code
    pass: 'ftmczqvlsfwduybn'
  }
});

// API Routes

// Image upload endpoint
app.post('/api/images/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileUrl = `img/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    if (!dbConnection) {
      await connectToDatabase();
    }
    
    const [rows] = await dbConnection.execute('SELECT * FROM products');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Create Razorpay order
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    
    // In production, integrate with actual Razorpay API
    const mockOrder = {
      id: `order_${Date.now()}`,
      amount: amount,
      currency: 'INR'
    };
    
    res.json(mockOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify payment
app.post('/api/payment/verify', (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    
    // In production, verify signature with Razorpay
    // For now, we'll assume verification passes
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Create order
app.post('/api/orders', (req, res) => {
  try {
    const orderData = {
      id: orders.length + 1,
      ...req.body,
      createdAt: new Date().toISOString(),
      status: 'confirmed'
    };
    
    orders.push(orderData);
    res.json(orderData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Send order email notification
app.post('/api/orders/send-email', async (req, res) => {
  try {
    const { orderId, customerEmail, customerData, totalAmount, razorpayPaymentId } = req.body;

    // Build email content directly from posted data
    const emailContent = `
      <h2>New Order Received - RAW FADE</h2>
      <h3>Order Details</h3>
      <p><strong>Order ID:</strong> #${orderId}</p>
      <p><strong>Payment ID:</strong> ${razorpayPaymentId}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${customerData?.firstName || ''} ${customerData?.lastName || ''}</p>
      <p><strong>Email:</strong> ${customerData?.email || ''}</p>
      <p><strong>Phone:</strong> ${customerData?.phone || ''}</p>
      <p><strong>Address:</strong> ${customerData?.address || ''}, ${customerData?.city || ''}, ${customerData?.state || ''} - ${customerData?.postalCode || customerData?.pincode || ''}</p>
      
      <h3>Order Summary</h3>
      <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
      <p><strong>Payment Status:</strong> Success</p>
      
      <h3>Items Ordered</h3>
      <p>Order details are stored in the Spring admin panel (Order ID: ${orderId}).</p>
      
      <hr>
      <p><em>This is an automated email from RAW FADE e-commerce system.</em></p>
    `;

    // Send email (to your admin email; could also send to customerEmail if desired)
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

// Get all orders for admin
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// Get order details
app.get('/api/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Email service configured for rawfadeclothing@gmail.com');
  });
}

startServer();
