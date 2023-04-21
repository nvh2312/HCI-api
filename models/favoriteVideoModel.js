const mongoose = require("mongoose");
const favoriteVideoSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
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
favoriteVideoSchema.pre(/^find/, function (next) {
  this.populate({
    path: "video",
    select: "-__v",
  });
  next();
});
const FavoriteVideo = mongoose.model("FavoriteVideo", favoriteVideoSchema);

module.exports = FavoriteVideo;
