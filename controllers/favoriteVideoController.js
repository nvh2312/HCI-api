const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const FavoriteVideo = require("./../models/favoriteVideoModel");
const Channel = require("./../models/channelModel");
const factory = require("./handlerFactory");
const Video = require("../models/videoModel");

exports.getAllFavoriteVideos = catchAsync(async (req, res, next) => {
  let filter;
  if (req.params.channelId) filter = { channel: req.params.channelId };
  const doc = await FavoriteVideo.find(filter).sort({ createdAt: -1 });
  const filteredDoc = doc.filter((item) => item.video !== null);
  res.status(200).json({
    status: "success",
    results: filteredDoc.length,
    data: filteredDoc,
  });
});
exports.createFavoriteVideo = catchAsync(async (req, res, next) => {
  const video = await Video.findOne({
    _id: req.body.video,
    isHidden: false,
  });
  if (!video) return next(new AppError("Not found this video", 404));
  const channel = await Channel.findOne({
    _id: req.channel.id,
    active: "active",
  });
  if (!channel) return next(new AppError("Not found this channel", 404));

  const filter = { video: req.body.video, channel: req.channel.id };
  const options = { upsert: true };

  const doc = await FavoriteVideo.findOneAndUpdate(filter, {}, options);
  if (doc) {
    return next(new AppError("Bạn đã thêm video vào yêu thích rồi", 404));
  }

  const newFavo = channel.favoriteVideos.push(req.body.video);
  channel.favoriteVideos = newFavo;
  await channel.save({ validateBeforeSave: false });

  res.status(201).json({
    message: "success",
    data: { user: channel },
  });
});
exports.deleteFavoriteVideo = catchAsync(async (req, res, next) => {
  const channel = await Channel.findOne({
    _id: req.channel.id,
    active: "active",
  });
  if (!channel) return next(new AppError("Not found this channel", 404));
  const doc = await FavoriteVideo.findOneAndDelete({
    video: req.body.video,
    channel: req.channel.id,
  });

  if (!doc) {
    return next(
      new AppError("Bạn chưa thêm video này vào danh sách yêu thích", 404)
    );
  }
  const newFavo = await channel.favoriteVideos.filter(
    (item) => item.toString() !== req.body.video
  );
  channel.favoriteVideos = newFavo;
  await channel.save({ validateBeforeSave: false });
  res.status(200).json({
    status: "success",
    data: { user: channel },
  });
});
