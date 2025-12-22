const express = require("express");
const {
  registercontroller,
  logincontroller,
  forgotpasswordcontroller,
  uploadPhoto,   
} = require("./user-controller");

const router = express.Router();


router.post("/login", logincontroller);


router.post("/signup", uploadPhoto, registercontroller);


router.put("/reset", forgotpasswordcontroller);

module.exports = router;