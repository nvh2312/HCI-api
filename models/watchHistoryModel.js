const mongoose = require("mongoose");
const watchHistorySchema = new mongoose.Schema({
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel",
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
  },
  watchedTime: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

watchHistorySchema.pre(/^find/, function (next) {
  this.populate({
    path: "video",
    select: "title channel duration thumbnail description view",
  });
  next();
});

const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);

module.exports = WatchHistory;
