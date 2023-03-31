const express = require("express");
const authController = require("../controllers/authController");
// const channel = require("../controllers/channelController");

const router = express.Router();
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post(
  "/refresh-access-token",
  authController.validateRefreshToken,
  authController.refreshAccessToken
);
router.post("/verify", authController.verifyChannel);
router.post("/get-otp", authController.sendMailVerify);
module.exports = router;
