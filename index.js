const express = require("express");
const cors = require('cors');
const mongoose = require("mongoose");
const userRoutes = require("./authentification/user-routes");
const serviceRoutes = require("./Service-management/service-routes")
const profileRoutes = require("./Profile_management/profile-routes");
const requestRoutes = require("./Service_request_management/request-routes");
const notificationRoutes = require('./Notification/notification-routes');
const offerRoutes = require('./Make_offers/makeoffer-routes');

const app = express();
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"], // allow both ports
  credentials: true,
}));


const dotenv = require("dotenv");
dotenv.config();
app.use(express.json({}));
mongoose.connect("mongodb://localhost:27017/mydatabase");
if (mongoose.connection) {
  console.log("MongoDB connection ok");
}

app.get('/api/debug/auth-test', (req, res) => {
  console.log('=== AUTH DEBUG INFO ===');
  console.log('Headers:', req.headers);
  console.log('Authorization Header:', req.headers.authorization);
  res.json({ message: 'Auth test endpoint reached' });
});

app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/requests", requestRoutes);
app.use("/uploads", express.static("uploads"));
app.use('/api/notifications', notificationRoutes);
app.use('/api/offers', offerRoutes);

// Global error handler (return JSON)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const port = 5000;
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
