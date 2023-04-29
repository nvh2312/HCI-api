const Channel = require("./../models/channelModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");
const PlayList = require("../models/playListModel");
const Comment = require("../models/commentModel");
const Video = require("../models/videoModel");
const Subscriber = require("../models/subscriberModel");

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
