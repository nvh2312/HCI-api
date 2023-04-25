const Comment = require("./../models/commentModel");
const factory = require("./handlerFactory");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

async function deleteChildComments(commentId) {
  const childComments = await Comment.find({ parent: commentId });
  for (let i = 0; i < childComments.length; i++) {
    const childComment = childComments[i];
    await deleteChildComments(childComment._id);
  }
  await Comment.deleteMany({ _id: commentId });
}

exports.setUserVideo = catchAsync(async (req, res, next) => {
  req.body.channel = req.channel.id;
  // Allow nested routes
  if (!req.body.video) req.body.video = req.params.videoId;
  next();
});
exports.getAllComments = factory.getAll(Comment);
exports.getComment = factory.getOne(Comment);
exports.createComment = catchAsync(async (req, res, next) => {
  const doc = await Comment.create(req.body);
  const data = await Comment.findById(req.body.parent);
  if (data) {
    data.children.push(doc.id);
    await data.save({ validateBeforeSave: false });
  }
  res.status(201).json({
    message: "success",
    data: doc,
  });
});
exports.updateComment = factory.updateOne(Comment);
exports.deleteComment = catchAsync(async (req, res, next) => {
  const doc = await Comment.findByIdAndDelete(req.params.id);
  await deleteChildComments(req.params.id);
  if (doc.parent != null) {
    const parent = await Comment.findById(doc.parent);
    const newChildren = await parent.children.filter(
      (child) => child.id != doc.id
    );
    parent.children = newChildren;
    await parent.save({ validateBeforeSave: false });
  }
  res.status(204).json({
    message: "success",
    data: null,
  });
});
exports.isOwner = factory.isOwner(Comment);

exports.actionComment = catchAsync(async (req, res, next) => {
  const data = await Comment.findById(req.body.comment).where({
    isHidden: false,
  });
  if (!data) return next(new AppError("Not found this comment"), 404);
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
