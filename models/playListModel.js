const mongoose = require("mongoose");
const playListSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Không thể để trống tiêu đề playlist"],
      trim: true,
    },
    description: String,
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
playListSchema.pre(/^find/, function (next) {
  this.populate({
    path: "videos",
    select: "-__v",
  }).populate({
    path: "channel",
    select: "-__v",
  });
  next();
});
const PlayList = mongoose.model("PlayList", playListSchema);

module.exports = PlayList;
