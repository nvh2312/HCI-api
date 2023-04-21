const Video = require("../models/videoModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const FavoriteVideo = require("./../models/favoriteVideoModel");
const factory = require("./handlerFactory");

exports.getAllFavoriteVideos = factory.getAll(FavoriteVideo);
exports.createFavoriteVideo = catchAsync(async (req, res, next) => {
  const video = await Video.findOne({
    _id: req.body.video,
    isHidden: false,
  });
  if (!video) return next(new AppError("Not found this video", 404));
  const filter = { video: req.body.video, channel: req.channel };
  const options = { upsert: true };

  const doc = await FavoriteVideo.findOneAndUpdate(filter, {}, options);
  if (doc) {
    return next(new AppError("Bạn đã thêm video vào yêu thích rồi", 404));
  }
  res.status(201).json({
    message: "success",
  });
});
exports.deleteFavoriteVideo = catchAsync(async (req, res, next) => {
  const doc = await FavoriteVideo.findOneAndDelete({
    video: req.body.video,
    channel: req.channel,
  });

  if (!doc) {
    return next(
      new AppError("Bạn chưa thêm video này vào danh sách yêu thích", 404)
    );
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
