const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const APIFeatures = require("./../utils/apiFeatures");
const Comment = require("../models/commentModel");
//define storage for the images
exports.setChannel = catchAsync(async (req, res, next) => {
  req.body.channel = req.channel;
  next();
});
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    if (Model === Comment) req.body.updatedAt = Date.now();
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: doc,
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      message: "success",
      data: doc,
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let filter = {};
    if (!req.channel || req.channel.role === "user") {
      filter.isHidden = { $ne: true };
      filter.active = { $nin: ["ban", "verify"] };
    }
    let query = Model.findById(req.params.id).where(filter);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(200).json({
      status: "success",
      data: doc,
    });
  });

exports.getAll = (Model, options) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET
    let filter = {};
    if (req.params.videoId) filter = { video: req.params.videoId };
    if (req.params.channelId) filter = { channel: req.params.channelId };
    if (!req.channel || req.channel.role === "user") {
      filter.isHidden = { $ne: true };
      filter.active = { $nin: ["ban", "verify"] };
    }
    if (Model === Comment) filter.parent = null;
    const features = new APIFeatures(
      Model.find(filter).populate(options),
      req.query
    )
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // const doc = await features.query.explain();
    const doc = await features.query;
    // SEND RESPONSE
    res.status(200).json({
      status: "success",
      results: doc.length,
      data: doc,
    });
  });

exports.isOwner = (Model) =>
  catchAsync(async (req, res, next) => {
    if (req.channel.role === "admin") return next();
    const doc = await Model.findById(req.params.id).where({
      isHidden: { $ne: true },
      active: { $nin: ["ban", "verify"] },
    });
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    if (doc.channel.id.toString() !== req.channel.id) {
      return next(new AppError("Not permission", 401));
    }
    req.doc = doc;
    next();
  });
