const express = require("express");
const authController = require("../controllers/authController");
const channelController = require("../controllers/channelController");

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

router.use(authController.protect);

router.patch("/updateMyPassword", authController.updatePassword);
router.get("/me", channelController.getMe, channelController.getChannel);
router.patch("/updateMe", channelController.updateMe);
router.delete("/deleteMe", channelController.deleteMe);

module.exports = router;
