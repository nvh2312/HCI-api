const Video = require("./../models/videoModel");
const PlayList = require("./../models/playListModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const View = require("./../models/viewModel");

exports.getAllVideos = factory.getAll(Video, { path: "comments" });
// exports.getVideo = factory.getOne(Video);
exports.updateWatchedTime = catchAsync(async (req, res, next) => {
  const viewDoc = await View.findById(req.params.id);
  viewDoc.watchedTime = req.body.watchedTime;
  // const watchedHistory =
  await viewDoc.save({ validateBeforeSave: false });
  res.status(200).json({
    status: "success",
    data: {
      view: viewDoc,
    },
  });
});
exports.getVideo = catchAsync(async (req, res, next) => {
  let query = Video.findById(req.params.id).populate("comments");
  const doc = await query;
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  doc.view++;
  await doc.save({ validateBeforeSave: false });
  const view = View({
    video: req.params.id,
  });
  await view.save();
  res.status(200).json({
    status: "success",
    data: {
      video: doc,
      view,
    },
  });
});
exports.createVideo = catchAsync(async (req, res, next) => {
  const doc = await Video.create(req.body);
  if (req.body.playList) {
    for (let i = 0; i < req.body.playList.length; i++) {
      let playList = await PlayList.findById(req.body.playList[i]);
      playList.videos.push(doc.id);
      await playList.save({ validateBeforeSave: false });
    }
  }
  res.status(201).json({
    message: "success",
    data: {
      video: doc,
    },
  });
});
exports.updateVideo = catchAsync(async (req, res, next) => {
  const videoId = req.params.id;
  const doc = await Video.findById(videoId);
  // remove video from previous array playlist
  if (doc.playList) {
    for (let i = 0; i < doc.playList.length; i++) {
      let playList = await PlayList.findById(req.body.playList[i]);
      playList.videos.filter((item) => item !== videoId);
      await playList.save({ validateBeforeSave: false });
    }
  }
  // update video and add video to new playlist
  await doc.update(req.body);
  const newList = req.body?.playList;
  if (newList) {
    for (let i = 0; i < newList.length; i++) {
      let playList = await PlayList.findById(newList[i]);
      playList.videos.push(doc.id);
      await playListDoc.save({ validateBeforeSave: false });
    }
  }
  res.status(200).json({
    message: "success",
    data: {
      video: doc,
    },
  });
});
exports.deleteVideo = catchAsync(async (req, res, next) => {
  const doc = await Video.findByIdAndDelete(req.params.id);

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  //   const videos= doc.videos;
  //   for(int i=0
  res.status(204).json({
    message: "success",
    data: null,
  });
});
exports.deleteMultipleVideos = catchAsync(async (req, res, next) => {
  await Video.deleteMany({ _id: { $in: req.body.videos } });
  res.status(204).json({
    message: "success",
    data: null,
  });
});
exports.checkPermission = catchAsync(async (req, res, next) => {
  if (req.channel.role === "admin") return next();
  const arr = req.body.videos;
  for (let i = 0; i < arr.length; i++) {
    const doc = await Video.findOne({ _id: arr[i], channel: req.channel.id });
    if (!doc) next(new AppError("Not permission", 401));
  }
  next();
});
exports.isOwner = factory.isOwner(Video);
exports.actionVideo = catchAsync(async (req, res, next) => {
  const data = await Video.findById(req.body.video).where({ isHidden: false });
  if (!data) return next(new AppError("Not found this video"), 404);
  const like = data.like;
  const dislike = data.dislike;
  let result = await like?.filter((u) => u !== req.channel.id);
  let resultDis = await dislike?.filter((u) => u !== req.channel.id);
  const action = req.body.action;
  if (action === "like") {
    if (like.length === result.length) result.push(req.channel.id);
    data.like = result;
    data.dislike = resultDis;
  }
  if (action === "dislike") {
    if (dislike.length === resultDis.length) resultDis.push(req.channel.id);
    data.dislike = resultDis;
    data.like = result;
  }
  await data.save({ validateBeforeSave: false });

  res.status(200).json({
    message: "Cập nhật thành công",
    doc: data,
  });
});
