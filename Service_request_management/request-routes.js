const express = require("express");
const {
  createRequest,
  getMyRequests,
  getRequestsForMe,
  updateRequestStatus,
  deleteRequest,
  getRequestDetails,
  acceptRequest,
  rejectRequest,
} = require('./request-controller.js');
const checkAuth = require("../auth-middleware");

const router = express.Router();
router.use(checkAuth);

router.post("/create", createRequest);         // Create request
router.get("/sent", getMyRequests);            // My sent requests
router.get("/received", getRequestsForMe);     // Requests for me
router.put("/:id", updateRequestStatus);       // Accept / Reject
router.delete("/:id", deleteRequest);          // Delete request
router.get("/:id", getRequestDetails);       // Get details 
router.put("/:id/accept", acceptRequest);    // Accept a request
router.put("/:id/reject", rejectRequest);    // Reject a request

module.exports = router;