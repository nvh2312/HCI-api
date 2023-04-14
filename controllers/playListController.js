const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const PlayList = require("./../models/playListModel");
const Video = require("./../models/videoModel");
const factory = require("./handlerFactory");

exports.getAllPlayLists = factory.getAll(PlayList);
exports.getPlayList = factory.getOne(PlayList);
exports.createPlayList = factory.createOne(PlayList);
exports.updatePlayList = catchAsync(async (req, res, next) => {
  let playListDoc = PlayList.findById(req.body.playList);
  if (!playListDoc) {
    return next(new AppError("Not found this playlist", 404));
  }
  const index = playListDoc.videos.findIndex((item) => item === req.body.video);
  if ((req.body.action = "add")) {
    if (index !== 1)
      return next(new AppError("This video is already in playlist", 400));
    playListDoc.videos.push(req.body.video);
  }
  if ((req.body.action = "remove")) {
    if (index !== 1)
      return next(new AppError("This video isn't already in playlist", 400));
    playListDoc.videos.splice(index, 1);
    const video = Video.findById(req.body.video);
    console.log(req.channel.id === video.channel);
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
