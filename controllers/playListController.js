const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const PlayList = require("./../models/playListModel");
const Video = require("./../models/videoModel");
const factory = require("./handlerFactory");
// const mongoose = require("mongoose");
// const { ObjectId } = mongoose.Types;

exports.getAllPlayLists = factory.getAll(PlayList);
exports.getPlayList = factory.getOne(PlayList);
// const doc = await PlayList.aggregate([
//   { $match: { _id: new ObjectId(req.params.id) } },

//   // Lọc các video không bị ẩn khỏi mảng video
//   { $unwind: "$videos" },
//   {
//     $lookup: {
//       from: "videos",
//       localField: "videos",
//       foreignField: "_id",
//       as: "video",
//     },
//   },
//   { $unwind: "$video" },
//   { $match: { "video.isHidden": { $ne: true } } },
//   {
//     $group: {
//       _id: "$_id",
//       title: { $first: "$title" },
//       description: { $first: "$description" },
//       channel: { $first: "$channel" },
//       isHidden: { $first: "$isHidden" },
//       createdAt: { $first: "$createdAt" },
//       videos: { $push: "$video" },
//     },
//   },
// ]);

exports.createPlayList = factory.createOne(PlayList);
exports.updatePlayList = catchAsync(async (req, res, next) => {
  let playListDoc = await PlayList.findById(req.params.id).where({
    isHidden: { $ne: true },
  });
  if (!playListDoc) {
    return next(new AppError("Not found this playlist", 404));
  }
  const index = playListDoc.videos.findIndex((item) => item === req.body.video);
  if (req.body.action === "add") {
    if (index !== -1)
      return next(new AppError("This video is already in playlist", 400));
    const videoDoc = await Video.findById(req.body.video).where({
      isHidden: { $ne: true },
    });
    if (!videoDoc) {
      return next(new AppError("Not found this video", 404));
    }
    playListDoc.videos.push(req.body.video);
  }
  if (req.body.action === "remove") {
    if (index !== -1)
      return next(new AppError("This video isn't already in playlist", 400));
    playListDoc.videos.splice(index, 1);
    const video = Video.findById(req.body.video);
    if (req.channel.id === video.channel) {
      video.playList.filter((item) => item !== req.body.playList);
      await video.save({ validateBeforeSave: false });
    }
  }
  await playListDoc.save({ validateBeforeSave: false });
  res.status(200).json({
    message: "success",
    data: {
      playList: playListDoc,
    },
  });
});
exports.deletePlayList = factory.deleteOne(PlayList);
exports.isOwner = factory.isOwner(PlayList);
