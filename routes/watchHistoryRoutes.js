const express = require("express");
const WatchHistoryController = require("./../controllers/watchHistoryController");
const authController = require("./../controllers/authController");

const router = express.Router({ mergeParams: true });
router.use(authController.protect);

router.route("/").get(WatchHistoryController.getAllWatchHistories);
// router.route("/deleteAllViews").delete(WatchHistoryController.deleteAllViews);
router
  .route("/:id")
  .delete(
    WatchHistoryController.isOwner,
    WatchHistoryController.deleteWatchHistory
  );

module.exports = router;
