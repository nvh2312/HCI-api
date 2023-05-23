const mongoose = require("mongoose");
const viewSchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  watchedTime: {
    type: Number,
    default: 0,
  },
});

const View = mongoose.model("View", viewSchema);

module.exports = View;
