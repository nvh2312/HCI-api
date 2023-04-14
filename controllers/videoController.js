const Video = require("./../models/videoModel");
const PlayList = require("./../models/playListModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");

exports.getAllVideos = factory.getAll(Video);
exports.getVideo = factory.getOne(Video);
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
  const videoId = req.body.id;
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
    status: "success",
    data: null,
  });
});