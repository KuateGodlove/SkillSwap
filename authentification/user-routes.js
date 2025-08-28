const express = require("express");
const {registercontroller}= require('./user-controller');
const {logincontroller}= require('./user-controller');
const {forgotpasswordcontroller}= require('./user-controller');
const router = express.Router();
router.post('/login', logincontroller);
router.post('/signup', registercontroller);
router.put('/reset',  forgotpasswordcontroller);

module.exports = router;