const View = require("../models/viewModel");
const WatchHistory = require("../models/watchHistoryModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

exports.getAllWatchHistories = factory.getAll(WatchHistory);
exports.deleteWatchHistory = factory.deleteOne(WatchHistory);
exports.isOwner = factory.isOwner(WatchHistory);
exports.deleteAllViews = catchAsync(async (req, res, next) => {
  await View.deleteMany();
  res.status(204).json();
});
