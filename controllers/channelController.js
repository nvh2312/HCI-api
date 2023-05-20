const Channel = require("./../models/channelModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");
const PlayList = require("../models/playListModel");
const Comment = require("../models/commentModel");
const Video = require("../models/videoModel");
const Subscriber = require("../models/subscriberModel");
const { ObjectId } = require("mongodb");
const View = require("../models/viewModel");
const moment = require("moment");

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.channel.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if Channel POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("Trang này không dùng để thay đổi mật khẩu", 400));
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated,this is all field can update:
  const filteredBody = filterObj(
    req.body,
    "fullName",
    "avatar",
    "description",
    "thumbnail"
  );

  // 3) Update Channel document
  const updatedChannel = await Channel.findByIdAndUpdate(
    req.channel.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("subscribers")
    .populate("followings");

  res.status(200).json({
    message: "success",
    data: { user: updatedChannel },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await Channel.findByIdAndUpdate(req.channel.id, { active: "ban" });

  res.status(204).json({
    status: "success",
    user: null,
  });
});

exports.createChannel = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /signup instead",
  });
};

// exports.getChannel = factory.getOne(Channel, { path: "subscribers" });
exports.getAllChannels = factory.getAll(Channel, { path: "subscribers" });
exports.getChannel = catchAsync(async (req, res, next) => {
  let filter = {};

  filter.active = { $nin: ["ban", "verify"] };
  filter.role = "user";
  let query = Channel.findById(req.params.id).where(filter);
  query = query.populate("subscribers").populate("followings");
  const doc = await query;
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: doc,
  });
});
exports.seenNotification = catchAsync(async (req, res, next) => {
  const channel = req.channel;
  const index = channel.notification.findIndex(
    (item) => item.video.id === req.body.video
  );
  if (index !== -1) {
    channel.notification[index].seen = true;
    await channel.save({ validateBeforeSave: false });
  }
  res.status(200).json({
    status: "success",
    data: channel,
  });
});
exports.banChannel = catchAsync(async (req, res, next) => {
  const channelId = req.body.channel;
  const action = req.body.action;
  const channelDoc = await Channel.findOneAndUpdate(
    { _id: channelId },
    { active: action },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!channelDoc) {
    return next(new AppError("Not found this channel", 404));
  }
  const isHidden = action === "ban" ? true : false;
  await PlayList.updateMany({ channel: channelId }, { $set: { isHidden } });
  await Video.updateMany({ channel: channelId }, { $set: { isHidden } });
  await Comment.updateMany({ channel: channelId }, { $set: { isHidden } });
  res.status(200).json({
    message: "success",
    data: channelDoc,
  });
});
exports.analysis = catchAsync(async (req, res, next) => {
  const timeRanges = req.query.date;
  const option = req.query.option;
  const model = option === "subscriber" ? Subscriber : View;
  const match = option === "subscriber" ? "channel" : "video.channel";
  const count = option === "time" ? "$watchedTime" : 1;
  let days;
  switch (timeRanges) {
    case "7days":
      days = 6;
      break;
    case "28days":
      days = 27;
      break;
    case "90days":
      days = 89;
      break;
    case "365days":
      days = 364;
      break;
    default:
      days = 6;
  }
  const now = new Date();
  const startDate = moment(now).subtract(days, "days").startOf("day").utc().toDate();
  const pipeline = [
    ...(option === "subscriber"
      ? []
      : [
          {
            $lookup: {
              from: "videos",
              localField: "video",
              foreignField: "_id",
              as: "video",
            },
          },
        ]),
    {
      $match: {
        [match]: new ObjectId(req.channel.id),
        createdAt: {
          $gte: startDate,
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%d-%m-%Y", date: "$createdAt" },
        },
        count: { $sum: count },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const doc = await model.aggregate(pipeline);
  const data = doc.map((item) => ({ date: item._id, count: item.count }));
  res.status(200).json({
    message: "success",
    data,
  });
});
exports.overview = catchAsync(async (req, res, next) => {
  const channelId = req.channel.id;
  const [stats, totalSub] = await Promise.all([
    View.aggregate([
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "video",
        },
      },
      { $match: { "video.channel": new ObjectId(channelId) } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          totalWatchedTime: { $sum: "$watchedTime" },
        },
      },
    ]),
    Subscriber.countDocuments({ channel: new ObjectId(channelId) }),
  ]);

  res.status(200).json({
    message: "success",
    data: {
      totalViews: stats[0]?.totalViews || 0,
      totalTime: Number((stats[0]?.totalWatchedTime / 3600).toFixed(2)) || 0,
      totalSub,
    },
  });
});
