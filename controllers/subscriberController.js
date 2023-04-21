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
  const filter = { channel: req.body.channel, subscriber: req.channel };
  const options = { upsert: true };

  const doc = await Subscriber.findOneAndUpdate(filter, {}, options);
  if (doc) {
    return next(new AppError("Bạn đã đăng ký kênh này rồi", 404));
  }
  res.status(201).json({
    message: "success",
  });
});
exports.deleteSubscriber = catchAsync(async (req, res, next) => {
  const doc = await Subscriber.findOneAndDelete({
    channel: req.body.channel,
    subscriber: req.channel,
  });

  if (!doc) {
    return next(new AppError("Bạn chưa đăng ký kênh này", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});
