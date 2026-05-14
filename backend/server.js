const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Middlewares
const errorHandler = require('./src/middlewares/errorHandler');
const { validateCourseInput, validateUserInput, validateEnrollmentInput } = require('./src/middlewares/validation');

// Routes
const courseRoutes = require('./src/routes/courseRoutes');
const enrollRoutes = require('./src/routes/enrollRoutes');
const userRoutes = require('./src/routes/userRoutes');
const lessonRoutes = require('./src/routes/lessonRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');

// Pinata connection test
const { testPinataConnection } = require('./src/config/pinata');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Blockchain Learning Platform API',
    version: '1.0.0',
    endpoints: {
      courses: '/api/courses',
      users: '/api/users',
      enrollments: '/api/enrollments',
      lessons: '/api/lessons',
      reviews: '/api/reviews',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Documentation:`);
  console.log(`   - Courses:     http://localhost:${PORT}/api/courses`);
  console.log(`   - Users:       http://localhost:${PORT}/api/users`);
  console.log(`   - Enrollments: http://localhost:${PORT}/api/enrollments`);
  console.log(`   - Upload:      http://localhost:${PORT}/api/upload`);
  // Kiểm tra kết nối Pinata IPFS
  await testPinataConnection();
});

module.exports = app;
