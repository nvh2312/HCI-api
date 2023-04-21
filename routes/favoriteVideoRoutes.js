const express = require("express");
const favoriteVideoController = require("./../controllers/favoriteVideoController");
const authController = require("./../controllers/authController");
const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(favoriteVideoController.getAllFavoriteVideos)
  .post(authController.protect, favoriteVideoController.createFavoriteVideo)
  .delete(authController.protect, favoriteVideoController.deleteFavoriteVideo);

module.exports = router;
