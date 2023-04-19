const mongoose = require("mongoose");
const Video = require("./videoModel");

const CommentSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: [true, "Bình luận không thể để trống!"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    video: {
      type: mongoose.Schema.ObjectId,
      ref: "Video",
      required: [true, "Vui lòng cung cấp video được Bình luận."],
    },
    updateAt: Date,
    channel: {
      type: mongoose.Schema.ObjectId,
      ref: "Channel",
      required: [true, "Bình luận phải từ một người dùng nào đó"],
    },
    parent: {
      type: mongoose.Schema.ObjectId,
      ref: "Comment",
      default: null,
    },
    like: [],
    children: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Comment",
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CommentSchema.index({ "$**": "text" });

CommentSchema.pre(/^find/, function (next) {
  this.populate({
    path: "channel",
    select: "fullName avatar",
  }).populate({
    path: "children",
    select: "-__v",
  });
  next();
});

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;
