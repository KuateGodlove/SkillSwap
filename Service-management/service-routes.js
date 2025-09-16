const express = require("express");
const{removeServiceController} = require('./service-controller');
const { addServiceController } = require('./service-controller');
const { listUserServicesController } = require('./service-controller');
const {listAllUserServicesController } = require('./service-controller');
const checkAuth = require("../auth-middleware");

const router = express.Router();
router.use(checkAuth);

router.delete('/delete', removeServiceController);
router.post("/add", addServiceController);
router.get('/service', listUserServicesController);
router.get('/Allservice', listAllUserServicesController);
module.exports = router;