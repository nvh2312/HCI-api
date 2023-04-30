const express = require("express");
const subscriberController = require("./../controllers/subscriberController");
const authController = require("./../controllers/authController");
const router = express.Router();

router
  .route("/")
  .get(subscriberController.getAllSubscribers)
  .post(
    authController.protect,
    authController.restrictTo("user"),
    subscriberController.createSubscriber
  )
  .patch(authController.protect, subscriberController.deleteSubscriber);

module.exports = router;
