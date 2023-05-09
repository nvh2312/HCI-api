const express = require("express");
const videoController = require("./../controllers/videoController");
const authController = require("./../controllers/authController");
const factory = require("./../controllers/handlerFactory");
const commentRouter = require("./../routes/commentRoutes");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(authController.isLoggedIn, videoController.getAllVideos)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    factory.setChannel,
    videoController.createVideo
  );
router.get("/search-videos", videoController.searchVideos);
router.get(
  "/following-videos",
  authController.protect,
  videoController.videoFollowings
);
router.patch("/action", authController.protect, videoController.actionVideo);
router.use("/:videoId/comments", commentRouter);

router
  .route("/view")
  .post(authController.isLoggedIn, videoController.createView);

router
  .route("/view/:id")
  .patch(authController.isLoggedIn, videoController.updateWatchedTime);
router
  .route("/delete-multiple-videos")
  .patch(
    authController.protect,
    videoController.checkPermission,
    videoController.deleteMultipleVideos
  );

router
  .route("/:id")
  .get(authController.isLoggedIn, videoController.getVideo)
  .patch(
    authController.protect,
    videoController.isOwner,
    videoController.updateVideo
  )
  .delete(
    authController.protect,
    videoController.isOwner,
    videoController.deleteVideo
  );

module.exports = router;
