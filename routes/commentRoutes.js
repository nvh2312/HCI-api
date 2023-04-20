const express = require("express");
const commentController = require("./../controllers/commentController");
const authController = require("./../controllers/authController");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(commentController.getAllComments)
  .post(
    authController.protect,
    commentController.setUserVideo,
    commentController.createComment
  );
// router
//   .route("/setLike/:id")
//   .patch(authController.protect, commentController.likeComment);
router
  .route("/:id")
  .get(commentController.getComment)
  .patch(
    authController.protect,
    commentController.isOwner,
    commentController.updateComment
  )
  .delete(
    authController.protect,
    commentController.isOwner,
    commentController.deleteComment
  );

module.exports = router;
