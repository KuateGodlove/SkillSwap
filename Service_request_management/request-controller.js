const requestModel = require("./request-model");

// Create new request
module.exports = {
  createRequest: async (req, res) => {
    try {
      const { serviceId, message, exchangeOffer } = req.body;
      const requestedBy = req.user.id; // from JWT

      const request = new requestModel({
        serviceId,
        requestedBy,
        message,
        exchangeOffer,
      });

      await request.save();

      res.status(201).json({
        success: true,
        message: "Service request created successfully",
        request,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  // Get requests made by me
  getMyRequests: async (req, res) => {
    try {
      const requests = await requestModel.find({ requestedBy: req.user.id })
        .populate("serviceId")
        .populate("requestedBy", "firstName lastName email");

      res.json({ success: true, requests });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  // Get requests for my services
  getRequestsForMe: async (req, res) => {
    try {
      const requests = await requestModel.find()
        .populate("serviceId")
        .populate("requestedBy", "firstName lastName email");

      // Only include requests for services owned by current user
      const myRequests = requests.filter(
        (r) => r.serviceId.owner.toString() === req.user.id
      );

      res.json({ success: true, requests: myRequests });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  // Update request status (accept/reject)
  updateRequestStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const request = await requestModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!request) {
        return res.status(404).json({ success: false, message: "Request not found" });
      }

      res.json({ success: true, message: `Request ${status}`, request });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  // 📌 Accept a request
 acceptRequest: async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    request.status = "accepted";
    await request.save();

    res.json({ success: true, message: "Request accepted", request });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
},

// 📌 Reject a request
  rejectRequest: async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    if (request.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    request.status = "rejected";
    await request.save();

    res.json({ success: true, message: "Request rejected", request });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
},

  // Delete request
  deleteRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const request = await requestModel.findByIdAndDelete(id);

      if (!request) {
        return res.status(404).json({ success: false, message: "Request not found" });
      }

      res.json({ success: true, message: "Request deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },
  // 📌 Get details of a single request
  getRequestDetails: async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("serviceId")
      .populate("requestedBy", "firstName lastName email")
      .populate("ownerId", "firstName lastName email");

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}
};
