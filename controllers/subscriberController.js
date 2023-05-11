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
  })
    .populate("subscribers")
    .populate("followings");
  const myChannel = req.channel;
  if (!channel) return next(new AppError("Not found this channel", 404));
  const index = await channel.subscribers.findIndex(
    (item) => item.id === myChannel.id
  );
  if (index !== -1)
    return next(new AppError("Bạn đã đăng ký kênh này rồi", 404));
  await Subscriber.create({
    channel: req.body.channel,
    subscriber: req.channel.id,
  });
  const newSub = channel.subscribers.push(myChannel);
  const myFollowings = myChannel.followings.push(channel);
  channel.subscribers = newSub;
  myChannel.followings = myFollowings;
  await channel.save({ validateBeforeSave: false });
  await myChannel.save({ validateBeforeSave: false });

  res.status(201).json({
    message: "success",
    data: { user: myChannel, channel },
  });
});
exports.deleteSubscriber = catchAsync(async (req, res, next) => {
  const channel = await Channel.findOne({
    _id: req.body.channel,
    active: "active",
  })
    .populate("subscribers")
    .populate("followings");
  if (!channel) return next(new AppError("Not found this channel", 404));
  const myChannel = req.channel;
  const newSub = await channel.subscribers.filter(
    (item) => item.id !== myChannel.id
  );
  if (channel.subscribers.length === newSub.length)
    return next(new AppError("Bạn chưa đăng ký kênh này", 404));
  await Subscriber.findOneAndDelete({
    channel: req.body.channel,
    subscriber: req.channel.id,
  });
  const myFollowings = await myChannel.followings.filter(
    (item) => item.id !== channel.id
  );
  channel.subscribers = newSub;
  myChannel.followings = myFollowings;
  await channel.save({ validateBeforeSave: false });
  await myChannel.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    data: { user: myChannel, channel },
  });
});
