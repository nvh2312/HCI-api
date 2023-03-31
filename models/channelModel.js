const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const channelSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, "Vui lòng cung cấp tên!"],
  },
  email: {
    type: String,
    required: [true, "Vui lòng cung cấp email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Vui lòng cung cấp mail chính xác"],
  },
  avatar: {
    type: String,
    default:
      "https://png.pngtree.com/png-clipart/20200701/original/pngtree-default-avatar-png-image_5407175.jpg",
  },
  imageCover: {
    type: String,
    default:
      "https://png.pngtree.com/png-clipart/20200701/original/pngtree-default-avatar-png-image_5407175.jpg",
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Tài khoản cần có mật khẩu"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Vui lòng nhập lại mật khẩu"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Nhập lại mật khẩu chưa đúng!",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  channelVerifyToken: String,
  active: {
    type: String,
    enum: ["active", "verify", "ban"],
    default: "verify",
  },
  dateOfBirth: String,
  gender: String,
  phone: String,
});
channelSchema.index({ "$**": "text" });

channelSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

channelSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// channelSchema.pre(/^find/, function (next) {
//   // this points to the current query
//   // this.find({ active: { $ne: "ban" } });
//   next();
// });

channelSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  const result = await bcrypt.compare(candidatePassword, userPassword);
  return result;
};

channelSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

channelSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(3).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
channelSchema.methods.createVerifyToken = function () {
  const verifyToken = crypto.randomBytes(3).toString("hex");

  this.channelVerifyToken = crypto
    .createHash("sha256")
    .update(verifyToken)
    .digest("hex");

  console.log({ verifyToken }, this.channelVerifyToken);

  return verifyToken;
};

const Channel = mongoose.model("Channel", channelSchema);

module.exports = Channel;
