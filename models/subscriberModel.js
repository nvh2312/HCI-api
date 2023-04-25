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
// subscriberModel.pre(/^find/, function (next) {
//   this.populate({
//     path: "subscriber",
//     select: "-__v",
//   });
//   next();
// });
const Subscriber = mongoose.model("Subcriber", subscriberModel);

module.exports = Subscriber;
