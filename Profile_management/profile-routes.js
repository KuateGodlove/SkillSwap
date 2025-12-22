const express = require("express");
const {getProfileController} = require('./profile-controller');
const {updateProfilecontroller} = require('./profile-controller');
const checkAuth = require("../auth-middleware");
const router = express.Router();
router.use(checkAuth);

router.get('/Myprofile', getProfileController);
router.put("/updateprofile", updateProfilecontroller);
module.exports = router;