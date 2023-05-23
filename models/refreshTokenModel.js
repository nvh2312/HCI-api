const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Channel",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
refreshTokenSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 }
);
const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = RefreshToken;
