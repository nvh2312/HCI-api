const express = require("express");
const videoController = require("./../controllers/videoController");
const authController = require("./../controllers/authController");
const factory = require("./../controllers/handlerFactory");
const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(videoController.getAllVideos)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    factory.setChannel,
    videoController.createVideo
  );

router
  .route("/:id")
  .get(videoController.getVideo)
  .patch(
    authController.protect,
    authController.restrictTo("user"),
    videoController.updateVideo
  )
  .delete(
    authController.restrictTo("user", "admin"),
    videoController.deleteVideo
  );

module.exports = router;
