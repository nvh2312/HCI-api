const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const Channel = require("./../models/channelModel");
const RefreshToken = require("./../models/refreshTokenModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const sendEmail = require("./../utils/email");

const signAccessToken = (channelId) => {
  return jwt.sign({ channelId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.TOKEN_EXPIRES_IN,
  });
};
const signRefreshToken = (channel, refreshTokenId) => {
  return jwt.sign(
    {
      channel,
      tokenId: refreshTokenId,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_EXPIRES_IN,
    }
  );
};
exports.refreshAccessToken = catchAsync(async (req, res, next) => {
  const currentRefreshToken = req.currentRefreshToken;
  const refreshTokenDoc = RefreshToken({
    channel: currentRefreshToken.channel,
  });

  await refreshTokenDoc.save();
  await RefreshToken.deleteOne({ _id: currentRefreshToken.tokenId });

  const refreshToken = signRefreshToken(
    currentRefreshToken.channel,
    refreshTokenDoc.id
  );
  const accessToken = signAccessToken(currentRefreshToken.channel);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwt", refreshToken, cookieOptions);
  res.status(201).json({
    message: "success",
    data: {
      // user: channel,
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
});
exports.validateRefreshToken = catchAsync(async (req, res, next) => {
  const currentRefreshToken = req.cookies.jwt;
  const decoded = await promisify(jwt.verify)(
    currentRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  const tokenExists = await RefreshToken.exists({
    _id: decoded.tokenId,
    channel: decoded.channel,
  });
  if (!tokenExists) {
    return next(new AppError("Unauthorised!!!", 401));
  }
  req.currentRefreshToken = decoded;
  next();
});

const createSendToken = async (channel, statusCode, res) => {
  const refreshTokenDoc = RefreshToken({
    channel: channel.id,
  });
  await refreshTokenDoc.save();
  const token = signAccessToken(channel.id);
  const refreshToken = signRefreshToken(channel.id, refreshTokenDoc.id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", refreshToken, cookieOptions);
  channel.password = undefined;
  res.status(statusCode).json({
    message: "success",
    data: {
      user: channel,
      access_token: token,
      refresh_token: refreshToken,
    },
  });
};
exports.sendMailVerify = catchAsync(async (req, res, next) => {
  const channel = await Channel.findOne({ email: req.body.email });
  if (!channel) return next(new AppError("Not found this channel.", 404));
  // 1) create token to verify
  const verifyToken = channel.createVerifyToken();
  await channel.save({ validateBeforeSave: false });

  // 2) Send it to channel's email
  const verifyURL = `${req.protocol}://${req.get("host")}/verify`;
  const message = `Bạn là chủ tài khoản? Vui lòng xác nhận tài khoản tại:  ${verifyURL}.\nMã xác nhận: ${verifyToken}\n.Nếu không phải, vui lòng bỏ qua mail này!`;
  channel.password = undefined;
  console.log(verifyToken);
  try {
    await sendEmail({
      email: channel.email,
      subject: "verify channel",
      message,
    });
    res.status(201).json({
      data: {
        user: channel,
      },
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log(err);
  }
});

const sendVerifyToken = async (channel, statusCode, res, req) => {
  // 1) create token to verify
  const verifyToken = channel.createVerifyToken();
  await channel.save({ validateBeforeSave: false });
  // 2) Send it to channel's email
  const verifyURL = `${req.protocol}://${req.get("host")}/verify`;
  const message = `Bạn là chủ tài khoản? Vui lòng xác nhận tài khoản tại:  ${verifyURL}.\nMã xác nhận: ${verifyToken}\n.Nếu không phải, vui lòng bỏ qua mail này!`;
  channel.password = undefined;
  console.log(verifyToken);
  try {
    await sendEmail({
      email: channel.email,
      subject: "verify channel",
      message,
    });
    res.status(statusCode).json({
      data: {
        user: channel,
      },
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log(err);
  }
};

exports.verifyChannel = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.encode)
    .digest("hex");
  const channel = await Channel.findOne({
    email: req.body.email,
    channelVerifyToken: hashedToken,
  });

  if (!channel) {
    return next(new AppError("Mã xác nhận không hợp lệ hoặc đã hết hạn", 422));
  }
  channel.active = "active";
  channel.channelVerifyToken = undefined;
  await channel.save({ validateBeforeSave: false });

  createSendToken(channel, 200, res);
});

exports.signup = catchAsync(async (req, res, next) => {
  const channelExist = await Channel.findOne({ email: req.body.email });
  if (channelExist) {
    return next(new AppError("Email này đã được đăng ký.", 422));
  }
  const newChannel = await Channel.create({
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  sendVerifyToken(newChannel, 201, res, req);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Vui lòng cung cấp email và mật khẩu!", 422));
  }
  // 2) Check if channel exists && password is correct
  const channel = await Channel.findOne({ email })
    .select("+password")
    .populate("subscribers")
    .populate("followings");
  if (
    !channel ||
    !(await channel.correctPassword(password.toString(), channel.password))
  ) {
    return next(new AppError("Email hoặc mật khẩu không chính xác", 422));
  }
  // 3) Check if channel not verify, send code to gmail
  if (channel.active === "verify") {
    sendVerifyToken(channel, 201, res, req);
  } else if (channel.active === "ban")
    return next(new AppError("Tài khoản đã bị khóa", 403));
  // 4) If everything ok, send token to client
  else {
    createSendToken(channel, 200, res);
  }
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  let refreshToken;
  try {
    token = req.headers.authorization.split(" ")[1];
    refreshToken = req.cookies.jwt;
  } catch (error) {
    return next(
      new AppError(
        "Bạn chưa đăng nhập hoặc đăng ký. Vui lòng thực hiện!!!",
        401
      )
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.ACCESS_TOKEN_SECRET
  );
  // 3) Check if channel still exists
  const currentChannel = await Channel.findById(decoded.channelId)
    .populate("subscribers")
    .populate("followings");
  if (!currentChannel) {
    return next(new AppError("Token người dùng không còn tồn tại.", 401));
  }
  if (currentChannel.active === "ban") {
    res.cookie("jwt", "loggedout", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    return next(new AppError("Tài khoản của bạn đang bị khóa", 403));
  }

  // 4) Check if channel changed password after the token was issued
  if (currentChannel.changedPasswordAfter(decoded.iat)) {
    console.log(decoded);
    return next(
      new AppError(
        "Tài khoản gần đây đã thay đổi mật khẩu! Xin vui lòng đăng nhập lại.",
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.channel = currentChannel;
  next();
});
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.REFRESH_TOKEN_SECRET
      );
      // 2) Check if channel still exists
      const currentchannel = await Channel.findById(decoded.channel).populate(
        "subscribers"
      );
      if (!currentchannel) {
        return next();
      }
      // THERE IS A LOGGED IN channel
      req.channel = currentchannel;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.channel || !roles.includes(req.channel.role)) {
      return next(new AppError("Bạn không có quyền thực hiện", 403));
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get channel based on POSTed email
  const channel = await Channel.findOne({
    email: req.body.email,
  });
  if (!channel) {
    return next(
      new AppError(
        "Tài khoản này không tồn tại. Vui lòng đăng ký để sử dụng",
        404
      )
    );
  }
  if (channel.active === "ban") {
    return next(new AppError("Tài khoản này đã bị khóa", 404));
  }

  // 2) Generate the random reset token
  const resetToken = channel.createPasswordResetToken();
  await channel.save({ validateBeforeSave: false });

  // 3) Send it to channel's email
  const resetURL = `${req.protocol}://${req.get("host")}/verify-reset-password`;

  const message = `Bạn quên mật khẩu? Mã xác nhận của bạn: ${resetToken}.\nĐổi mật khẩu mới tại : ${resetURL}.\nNếu không phải bạn, vui lòng bỏ qua email này!`;

  try {
    await sendEmail({
      email: channel.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    res.status(201).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log(err);
    channel.passwordResetToken = undefined;
    channel.passwordResetExpires = undefined;
    await channel.save({ validateBeforeSave: false });

    return next(
      new AppError("Đã có lỗi xảy ra. Vui lòng thực hiện lại sau!"),
      500
    );
  }
});
exports.verifyResetPass = catchAsync(async (req, res, next) => {
  // 1) Get channel based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.encode)
    .digest("hex");
  const channel = await Channel.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired, and there is channel, set the new password
  if (!channel) {
    return next(new AppError("Mã xác nhận không hợp lệ hoặc đã hết hạn", 400));
  }
  res.status(200).json({
    status: "success",
    hashedToken,
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get channel based on the token
  const channel = await Channel.findOne({
    passwordResetToken: req.params.token,
    passwordResetExpires: { $gt: Date.now() },
  })
    .populate("subscribers")
    .populate("followings");
  // 2) If token has not expired, and there is channel, set the new password
  if (!channel) {
    return next(new AppError("Mã xác nhận không hợp lệ hoặc đã hết hạn", 400));
  }
  channel.password = req.body.password;
  channel.passwordConfirm = req.body.passwordConfirm;
  channel.passwordResetToken = undefined;
  channel.passwordResetExpires = undefined;
  await channel.save();

  // 3) Update changedPasswordAt property for the channel
  // 4) Log the channel in, send JWT
  createSendToken(channel, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get channel from collection
  const channel = await Channel.findById(req.channel.id)
    .select("+password")
    .populate("subscribers")
    .populate("followings");
  // 2) Check if POSTed current password is correct
  if (
    !(await channel.correctPassword(req.body.passwordCurrent, channel.password))
  ) {
    return next(new AppError("Mật khẩu hiện tại chưa chính xác.", 401));
  }

  // 3) If so, update password
  channel.password = req.body.password;
  channel.passwordConfirm = req.body.passwordConfirm;
  await channel.save();
  // channel.findByIdAndUpdate will NOT work as intended!

  // 4) Log channel in, send JWT
  createSendToken(channel, 200, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  return res.status(200).json({ status: "success" });
};
exports.logoutAll = catchAsync(async (req, res) => {
  const refreshToken = req.currentRefreshToken;
  await RefreshToken.deleteMany({ channel: refreshToken.channel });
  return res.status(200).json({ status: "success" });
});
exports.googleLogin = catchAsync(async (req, res) => {
  const { email, displayName } = req.body.channel;
  // 1) Check if channel exists
  const data = await Channel.findOne({ email })
    .populate("subscribers")
    .populate("followings");
  // 2) Check if channel exist
  if (!data) {
    const password = email + process.env.ACCESS_TOKEN_SECRET;
    const inform = {
      email,
      password,
      passwordConfirm: password,
      fullName: displayName,
      active: "active",
    };
    const newChannel = await Channel.create(inform);
    createSendToken(newChannel, 201, res);
  }
  // 3) If channel does not exist, create one
  else {
    if (data.active === "ban")
      return next(new AppError("Tài khoản của bạn đã bị ban.", 401));
    if (data.active === "verify") {
      data.active = "active";
      await data.save({ validateBeforeSave: false });
    }
    createSendToken(data, 200, res);
  }
});
