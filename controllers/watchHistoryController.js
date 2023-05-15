const View = require("../models/viewModel");
const WatchHistory = require("../models/watchHistoryModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

exports.getAllWatchHistories = catchAsync(async (req, res, next) => {
  // To allow for nested GET
  let filter = {};
  if (req.params.channelId) filter = { channel: req.params.channelId };
  const now = new Date();
  const today = new Date(now - 24 * 60 * 60 * 1000);
  const yesterday = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const videos = await WatchHistory.find(filter).sort({ createdAt: -1 });
  const result = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };
  videos.forEach((video) => {
    const date = video.createdAt;
    if (video.video) {
      if (date >= today) {
        result.today.push(video);
      } else if (date >= yesterday) {
        result.yesterday.push(video);
      } else if (date >= startOfWeek) {
        result.thisWeek.push(video);
      } else if (date >= startOfMonth) {
        result.thisMonth.push(video);
      } else {
        result.older.push(video);
      }
    }
  });
  // SEND RESPONSE
  res.status(200).json({
    message: "success",
    data: result,
  });
});
exports.deleteWatchHistory = factory.deleteOne(WatchHistory);
exports.isOwner = factory.isOwner(WatchHistory);
exports.deleteAllViews = catchAsync(async (req, res, next) => {
  await View.deleteMany();
  res.status(204).json();
});
