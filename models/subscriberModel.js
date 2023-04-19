const mongoose = require("mongoose");
const subscriberModel = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    subscriber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Subscriber = mongoose.model("Subcriber", subscriberModel);

module.exports = Subscriber;
