const express = require("express");
const{removeServiceController} = require('./service-controller');
const { addServiceController } = require('./service-controller');
const { listUserServicesController } = require('./service-controller');
const {listAllUserServicesController } = require('./service-controller');
const {getServiceDetailsController } = require('./service-controller');

const checkAuth = require("../auth-middleware");

const router = express.Router();
router.use(checkAuth);

router.delete('/delete/:id', removeServiceController);
router.post("/add", addServiceController);
router.get('/user/:userId', listUserServicesController);
router.get('/Allservice', listAllUserServicesController);
router.get('/:id', getServiceDetailsController);
module.exports = router;