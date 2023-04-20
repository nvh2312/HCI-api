const express = require("express");
const playListController = require("./../controllers/playListController");
const authController = require("./../controllers/authController");
const factory = require("./../controllers/handlerFactory");
const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(authController.isLoggedIn, playListController.getAllPlayLists)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    factory.setChannel,
    playListController.createPlayList
  );

router
  .route("/:id")
  .get(authController.isLoggedIn, playListController.getPlayList)
  .patch(
    authController.protect,
    authController.restrictTo("user"),
    playListController.isOwner,
    playListController.updatePlayList
  )
  .delete(authController.restrictTo("user"), playListController.deletePlayList);

module.exports = router;
