const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề video không thể để trống"],
      trim: true,
      maxlength: [200, "Tiêu đề video tối đa 200 kí tự"],
      minlength: [2, "Tiêu đề video tối thiểu 2 kí tự"],
    },
    description: String,
    thumbnail: String,
    video: String,
    like: [],
    dislike: [],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    updatedAt: Date,
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    duration: Number,
    view: {
      type: Number,
      default: 0,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    playList: [],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

videoSchema.virtual("comments", {
  ref: "Comment",
  foreignField: "video",
  localField: "_id",
  options: { match: { isHidden: false } },
});

videoSchema.index({ createdAt: -1 });
videoSchema.index({ "$**": "text" });
videoSchema.pre(/^find/, function (next) {
  // this.find({ isHidden: { $ne: true } });
  this.populate({
    path: "channel",
    select: "-__v",
    populate: {
      path: "subscribers",
    },
  });
  next();
});

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
