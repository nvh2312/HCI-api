const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Subscriber = require("./../models/subscriberModel");
const Channel = require("./../models/channelModel");
const factory = require("./handlerFactory");

exports.getAllSubscribers = factory.getAll(Subscriber);
exports.createSubscriber = catchAsync(async (req, res, next) => {
  const channel = await Channel.findOne({
    _id: req.body.channel,
    active: "active",
  });
  if (!channel) return next(new AppError("Not found this channel", 404));
  const index = await channel.subscribers.findIndex(
    (item) => item.toString() === req.channel.id
  );
  if (index !== -1)
    return next(new AppError("Bạn đã đăng ký kênh này rồi", 404));
  const newSub = channel.subscribers.push(req.channel.id);
  channel.subscribers = newSub;
  await channel.save({ validateBeforeSave: false });

  res.status(201).json({
    message: "success",
    data: { user: channel },
  });
});
exports.deleteSubscriber = catchAsync(async (req, res, next) => {
  const channel = await Channel.findOne({
    _id: req.body.channel,
    active: "active",
  });
  if (!channel) return next(new AppError("Not found this channel", 404));
  const newSub = await channel.subscribers.filter(
    (item) => item.toString() !== req.channel.id
  );
  if (channel.subscribers.length === newSub.length)
    return next(new AppError("Bạn chưa đăng ký kênh này", 404));
  channel.subscribers = newSub;
  await channel.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    data: { user: channel },
  });
});
