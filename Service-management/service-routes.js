const express = require("express");
const {getProfileController} = require('./service-controller');
const{removeServiceController} = require('./service-controller');
const { addSkillController } = require('./service-controller');

const router = express.Router();
router.get('/profile/:userid', getProfileController);
router.delete('/skillId', removeServiceController);
router.put("/add/:userid", addSkillController);

module.exports = router;