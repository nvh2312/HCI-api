const Video = require("./../models/videoModel");
const Channel = require("./../models/channelModel");
const PlayList = require("./../models/playListModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const View = require("./../models/viewModel");
const moment = require("moment");
const WatchHistory = require("../models/watchHistoryModel");

exports.getAllVideos = factory.getAll(Video, { path: "comments" });
// exports.getVideo = factory.getOne(Video);
exports.updateWatchedTime = catchAsync(async (req, res, next) => {
  const viewDoc = await View.findById(req.params.id);
  viewDoc.watchedTime = req.body.watchedTime;
  // const watchedHistory =
  await viewDoc.save({ validateBeforeSave: false });
  if (req.channel) {
    const today = new Date();
    const filter = {
      channel: req.channel,
      video: viewDoc.video,
      createdAt: { $gte: new Date(today - 30 * 60 * 1000) },
    };
    const options = { upsert: true };
    const update = {
      createdAt: today,
      watchedTime: req.body.watchedTime,
    };
    const watched = await WatchHistory.findOneAndUpdate(
      filter,
      update,
      options
    );
  }
  res.status(200).json({
    status: "success",
    data: {
      view: viewDoc,
    },
  });
});
exports.createView = catchAsync(async (req, res, next) => {
  const video = await Video.findById(req.body.video);
  if (!video) return next(new AppError("Not found this video", 404));
  video.view++;
  await video.save({ validateBeforeSave: false });
  if (req.channel) {
    const today = new Date();
    const filter = {
      channel: req.channel,
      video: req.body.video,
      createdAt: { $gte: new Date(today - 30 * 60 * 1000) },
    };
    const options = { upsert: true };
    const update = {
      createdAt: today,
      watchedTime: req.body.watchedTime,
    };
    const watched = await WatchHistory.findOneAndUpdate(
      filter,
      update,
      options
    );
  }
  const view = await View.create(req.body);
  res.status(200).json({
    status: "success",
    data: {
      view,
    },
  });
});
exports.getVideo = catchAsync(async (req, res, next) => {
  let query = Video.findById(req.params.id)
    .where({ isHidden: false })
    .populate("comments");
  const doc = await query;
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  if (req.channel) {
    const today = new Date();
    const filter = {
      channel: req.channel,
      video: req.params.id,
      createdAt: { $gte: new Date(today - 30 * 60 * 1000) },
    };
    const options = { upsert: true };
    const update = {
      createdAt: today,
    };
    const watched = await WatchHistory.findOneAndUpdate(
      filter,
      update,
      options
    );
  }
  res.status(200).json({
    status: "success",
    data: {
      video: doc,
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
  const notification = {
    video: {
      id: doc.id,
      title: doc.title,
      thumbnail: doc.thumbnail,
    },
    channel: { id: req.channel.id, avatar: req.channel.avatar },
    createdAt: doc.createdAt,
  };
  if (req.channel.subscribers) {
    Promise.all(
      req.channel.subscribers.map(async (item) => {
        const subscriber = await Channel.findById(item.id);
        subscriber.notification.unshift(notification);
        await subscriber.save({ validateBeforeSave: false });
      })
    );
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
  const doc = await Video.findByIdAndUpdate(videoId, req.body, {
    new: true,
    runValidators: true,
  });
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
  // const today = moment().startOf("day").toDate();
  // const yesterday = moment().subtract(1, "days").startOf("day").toDate();
  // const startOfWeek = moment().startOf("week").toDate();
  // const startOfMonth = moment().startOf("month").toDate();
  const now = new Date();
  const today = new Date(now - 24 * 60 * 60 * 1000);
  const yesterday = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now - 30 * 24 * 60 * 60 * 1000);
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
  const { keyword, timeRange, category, duration_min, duration_max, sortBy } =
    req.query;
  const filter = {};
  if (category) {
    filter.category = { $in: category };
    // filter.category = { $in: category.split(",") };  \\  $all
  }
  let user;
  const today = new Date();

  if (keyword) {
    filter.title = { $regex: `.*${keyword}.*`, $options: "i" };
    user = await Channel.find({
      fullName: { $regex: `.*${keyword}.*`, $options: "i" },
      active: "active",
      role: "user",
    });
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
        createdAt = { $gte: new Date(today - 24 * 60 * 60 * 1000) };
        break;
      case "thisWeek":
        createdAt = {
          $gte: new Date(today - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      case "thisMonth":
        createdAt = { $gte: new Date(today - 30 * 24 * 60 * 60 * 1000) };
        break;
      case "thisYear":
        createdAt = { $gte: new Date(today - 365 * 24 * 60 * 60 * 1000) };
        break;
    }

    filter.createdAt = createdAt;
  }
  filter.isHidden = false;
  const sort = sortBy === "view" ? { view: -1 } : { createdAt: -1 };
  const videos = await Video.find(filter).sort(sort);
  res.status(200).json({
    message: "success",
    data: { users: user || [], videos },
  });
});
