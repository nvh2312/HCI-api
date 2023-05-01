const Video = require("./../models/videoModel");
const PlayList = require("./../models/playListModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const View = require("./../models/viewModel");
const moment = require("moment");

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
  const doc = await Video.findByIdAndUpdate(videoId, req.body);
  // const doc = await Video.findById(videoId);
  // update video and add video to new playlist
  const newList = req.body?.playList;
  if (newList) {
    // remove video from previous array playlist

    if (doc.playList) {
      for (let i = 0; i < doc.playList.length; i++) {
        let playlist = await PlayList.findById(doc.playList[i]);
        playlist.videos = playlist.videos.filter((item) => item.id !== videoId);
        await playlist.save({ validateBeforeSave: false });
      }
    }
    for (let i = 0; i < newList.length; i++) {
      let playlist = await PlayList.findById(newList[i]);
      playlist.videos.push(doc.id);
      await playlist.save({ validateBeforeSave: false });
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
async function getVideosByDateRange(channels, startDate, endDate) {
  return await Video.find({
    channel: { $in: channels },
    isHidden: false,
    createdAt: { $gte: startDate, $lte: endDate },
  });
}
exports.videoFollowings = catchAsync(async (req, res, next) => {
  const followings = req.channel.followings;
  if (followings.length === 0)
    next(new AppError("Bạn chưa đăng ký kênh nào", 404));
  // const todayStart = moment().startOf("day").toDate();
  // const todayEnd = moment().endOf("day").toDate();

  // const yesterdayStart = moment().subtract(1, "days").startOf("day").toDate();
  // const yesterdayEnd = moment().subtract(1, "days").endOf("day").toDate();

  // const thisWeekStart = moment().startOf("week").toDate();
  // const thisWeekEnd = moment().endOf("week").toDate();

  // const allStart = new Date(0); // Set to Unix epoch
  // const allEnd = moment().subtract(1, "weeks").endOf("week");

  // const [today, yesterday, thisWeek, later] = await Promise.all([
  //   getVideosByDateRange(followings, todayStart, todayEnd),
  //   getVideosByDateRange(followings, yesterdayStart, yesterdayEnd),
  //   getVideosByDateRange(followings, thisWeekStart, thisWeekEnd),
  //   getVideosByDateRange(followings, allStart, allEnd),
  // ]);
  // res.json({
  //   message: "success",
  //   data: {
  //     today,
  //     yesterday,
  //     thisWeek,
  //     later,
  //   },
  // });
  const today = moment().startOf("day").toDate();
  const yesterday = moment().subtract(1, "days").startOf("day").toDate();
  const startOfWeek = moment().startOf("week").toDate();
  const startOfMonth = moment().startOf("month").toDate();
  const filter = {
    channel: { $in: followings },
    isHidden: false,
  };
  const videos = await Video.find(filter).sort({ createdAt: -1 });
  const result = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };
  videos.forEach((video) => {
    const date = video.createdAt;
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
  });

  res.status(200).json({
    message: "success",
    data: result,
  });
});
exports.searchVideos = catchAsync(async (req, res, next) => {
  const { timeRange, category, duration_min, duration_max, sortBy } = req.query;
  const filter = {};
  if (category) {
    filter.category = { $in: category };
    // filter.category = { $in: category.split(",") };
  }
  if (duration_min && duration_max) {
    filter.duration = { $gte: duration_min, $lte: duration_max };
  } else if (duration_min) {
    filter.duration = { $gte: duration_min };
  } else if (duration_max) {
    filter.duration = { $lte: duration_max };
  }
  if (timeRange) {
    let createdAt = {};
    switch (timeRange) {
      case "today":
        createdAt = { $gte: moment().startOf("day").toDate() };
        break;
      case "thisWeek":
        createdAt = {
          $gte: moment().startOf("week").toDate(),
        };
        break;
      case "thisMonth":
        createdAt = { $gte: moment().startOf("month").toDate() };
        break;
      case "thisYear":
        createdAt = { $gte: moment().startOf("year").toDate() };
        break;
    }

    filter.createdAt = createdAt;
  }

  const sort = sortBy === "view" ? { view: -1 } : { createdAt: -1 };
  console.log(filter, sort);
  const videos = await Video.find(filter).sort(sort);
  res.status(200).json({
    message: "success",
    data: videos,
  });
});
