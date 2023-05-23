const mongoose = require("mongoose");
const Channel = require("./channelModel");
const subscriberSchema = new mongoose.Schema(
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
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
subscriberSchema.statics.updateSub = async function (channel, sub, method) {
  const channelDoc = await Channel.findById(channel);
  if (method === "delete") {
    const newSub = await channelDoc.subscribers.filter(
      (item) => item.toString() !== sub
    );
    channelDoc.subscribers = newSub;
    await channelDoc.save({ validateBeforeSave: false });
  }
  if (method === "add") {
    const newSub = channelDoc.subscribers.push(sub);
    channelDoc.subscribers = newSub;
    await channelDoc.save({ validateBeforeSave: false });
  }
};
// subscriberModel.pre(/^find/, function (next) {
//   this.populate({
//     path: "subscriber",
//     select: "-__v",
//   });
//   next();
// });
const Subscriber = mongoose.model("Subcriber", subscriberSchema);

module.exports = Subscriber;
