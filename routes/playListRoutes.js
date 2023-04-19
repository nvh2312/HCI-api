const express = require("express");
const playListController = require("./../controllers/playListController");
const authController = require("./../controllers/authController");
const factory = require("./../controllers/handlerFactory");
const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(playListController.getAllPlayLists)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    factory.setChannel,
    playListController.createPlayList
  );

router
  .route("/:id")
  .get(playListController.getPlayList)
  .patch(authController.restrictTo("user"), playListController.updatePlayList)
  .delete(authController.restrictTo("user"), playListController.deletePlayList);

module.exports = router;
