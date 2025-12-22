const mongoose = require("mongoose");
const schema = mongoose.Schema;
const requestSchema = new schema({
    serviceid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    exchangeOffer: {
        type: String,         // I can offer tutoring in return
        default: "",
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
    },
}, {timestamps: true});

module.exports = mongoose.model("Request", requestSchema);