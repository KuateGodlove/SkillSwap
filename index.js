const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./authentification/user-routes");
const serviceRoutes = require("./Service-management/service-routes")
const profileRoutes = require("./Profile_management/profile-routes");
const requestRoutes = require("./Service_request_management/request-routes");

const app = express();
const dotenv = require("dotenv");
dotenv.config();
app.use(express.json({}));
mongoose.connect("mongodb://localhost:27017/mydatabase");
if (mongoose.connection) {
  console.log("MongoDB connection ok");
}

app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/request", requestRoutes);

const port = 5000;
app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
