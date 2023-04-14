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
const signRefreshToken = (channelId, refreshTokenId) => {
  return jwt.sign(
    {
      channelId,
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
    channelId: currentRefreshToken.channelId,
  });

  await refreshTokenDoc.save();
  await RefreshToken.deleteOne({ _id: currentRefreshToken.tokenId });

  const refreshToken = signRefreshToken(
    currentRefreshToken.channelId,
    refreshTokenDoc.id
  );
  const accessToken = signAccessToken(currentRefreshToken.channelId);
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
    _id: decodedToken.tokenId,
    owner: decodedToken.channelId,
  });
  if (!tokenExists) {
    return next(new AppError("Unauthorised!!!", 401));
  }
  req.currentRefreshToken = decoded;
  next();
});

const createSendToken = async (channel, statusCode, res) => {
  const refreshTokenDoc = RefreshToken({
    channelId: channel.id,
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
  console.log(channel);
  // 1) create token to verify
  const verifyToken = channel.createVerifyToken();
  await channel.save({ validateBeforeSave: false });
  // // 2) create cookie to client
  // const refreshTokenDoc = RefreshToken({
  //   channelId: channel.id,
  // });
  // await refreshTokenDoc.save();
  // const token = signAccessToken(channel.id);
  // const refreshToken = signRefreshToken(channel.id, refreshTokenDoc.id);
  // const cookieOptions = {
  //   expires: new Date(
  //     Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  //   ),
  //   httpOnly: true,
  // };
  // if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  // res.cookie("jwt", refreshToken, cookieOptions);
  // 3) Send it to channel's email
  const verifyURL = `https://youtube.onrender.com/verify`;
  const message = `Bạn là chủ tài khoản? Vui lòng xác nhận tài khoản tại:  ${verifyURL}.\nMã xác nhận: ${verifyToken}\n.Nếu không phải, vui lòng bỏ qua mail này!`;
  channel.password = undefined;
  console.log(verifyToken);
  try {
    // await sendEmail({
    //   email: channel.email,
    //   subject: "verify channel",
    //   message,
    // });
    res.status(201).json({
      data: {
        user: channel,
        // access_token: token,
        // refresh_token: refreshToken,
      },
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log(err);
  }
});
const sendVerifyToken = async (channel, statusCode, res) => {
  // 1) create token to verify
  const verifyToken = channel.createVerifyToken();
  await channel.save({ validateBeforeSave: false });
  // // 2) create cookie to client
  // const refreshTokenDoc = RefreshToken({
  //   channelId: channel.id,
  // });
  // await refreshTokenDoc.save();
  // const token = signAccessToken(channel.id);
  // const refreshToken = signRefreshToken(channel.id, refreshTokenDoc.id);
  // const cookieOptions = {
  //   expires: new Date(
  //     Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  //   ),
  //   httpOnly: true,
  // };
  // if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  // res.cookie("jwt", refreshToken, cookieOptions);
  // 3) Send it to channel's email
  const verifyURL = `https://youtube.onrender.com/verify`;
  const message = `Bạn là chủ tài khoản? Vui lòng xác nhận tài khoản tại:  ${verifyURL}.\nMã xác nhận: ${verifyToken}\n.Nếu không phải, vui lòng bỏ qua mail này!`;
  channel.password = undefined;
  console.log(verifyToken);
  try {
    // await sendEmail({
    //   email: channel.email,
    //   subject: "verify channel",
    //   message,
    // });
    res.status(statusCode).json({
      data: {
        user: channel,
        // access_token: token,
        // refresh_token: refreshToken,
      },
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log(err);
  }
};

exports.verifyChannel = catchAsync(async (req, res, next) => {
  // 1) Get channel based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.encode)
    .digest("hex");
  const channel = await Channel.findOne({
    email: req.body.email,
    channelVerifyToken: hashedToken,
  });
  // 2) If token true, verify this channel
  if (!channel) {
    return next(new AppError("Mã xác nhận không hợp lệ hoặc đã hết hạn", 422));
  }
  channel.active = "active";
  channel.channelVerifyToken = undefined;
  await channel.save({ validateBeforeSave: false });
  // 3) Update changedPasswordAt property for the channel
  // 4) Log the channel in, send JWT
  createSendToken(channel, 200, res);

  // res.status(200).json({
  //   message: "success",
  //   data: {
  //     channel,
  //   },
  // });
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
  sendVerifyToken(newChannel, 201, res);
  // res.status(201).json({
  //   message: "create user successfully",
  //   data: { user: newChannel },
  // });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Vui lòng cung cấp email và mật khẩu!", 422));
  }
  // 2) Check if channel exists && password is correct
  const channel = await Channel.findOne({ email }).select("+password");

  if (
    !channel ||
    !(await channel.correctPassword(password.toString(), channel.password))
  ) {
    return next(new AppError("Email hoặc mật khẩu không chính xác", 422));
  }
  // 3) Check if channel not verify, send code to gmail
  if (channel.active === "verify") {
    // 1) create token to verify
    const verifyToken = channel.createVerifyToken();
    await channel.save({ validateBeforeSave: false });
    // 3) Send it to channel's email
    const verifyURL = `https://youtube.onrender.com/verify`;
    const message = `Bạn là chủ tài khoản? Vui lòng xác nhận tài khoản tại:  ${verifyURL}.\nMã xác nhận: ${verifyToken}\n.Nếu không phải, vui lòng bỏ qua mail này!`;
    channel.password = undefined;
    console.log(verifyToken);
    try {
      // await sendEmail({
      //   email: channel.email,
      //   subject: "verify channel",
      //   message,
      // });
      res.status(201).json({
        data: {
          user: channel,
        },
        message: "Token sent to email!",
      });
    } catch (err) {
      console.log(err);
    }
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
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
  } catch (error) {
    return next(
      new AppError(
        "Bạn chưa đăng nhập hoặc đăng ký. Vui lòng thực hiện!!!",
        401
      )
    );
  }
  // console.log(req.cookies.jwt);
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.ACCESS_TOKEN_SECRET
  );
  // 3) Check if channel still exists
  const currentChannel = await Channel.findById(decoded.channelId);

  if (!currentChannel) {
    return next(new AppError("Token người dùng không còn tồn tại.", 401));
  }

  // 4) Check if channel changed password after the token was issued
  if (currentChannel.changedPasswordAfter(decoded.iat)) {
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
        process.env.JWT_SECRET
      );

      // 2) Check if channel still exists
      const currentchannel = await channel.findById(decoded.id);
      if (!currentchannel) {
        return next();
      }
      // THERE IS A LOGGED IN channel
      res.locals.channel = currentchannel;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (req.channel == undefined || !roles.includes(req.channel.role)) {
      return next(new AppError("Bạn không có quyền thực hiện", 403));
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get channel based on POSTed email
  const channel = await channel.findOne({ email: req.body.email });
  if (!channel) {
    return next(
      new AppError(
        "Tài khoản này không tồn tại. Vui lòng đăng ký để sử dụng",
        404
      )
    );
  }

  // 2) Generate the random reset token
  const resetToken = channel.createPasswordResetToken();
  await channel.save({ validateBeforeSave: false });

  // 3) Send it to channel's email
  const resetURL = `${req.protocol}://${req.get("host")}/forgot-password`;

  const message = `Bạn quên mật khẩu? Mã xác nhận của bạn: ${resetToken}.\nĐổi mật khẩu mới tại : ${resetURL}.\nNếu không phải bạn, vui lòng bỏ qua email này!`;

  try {
    // await sendEmail({
    //   email: channel.email,
    //   subject: "Your password reset token (valid for 10 min)",
    //   message,
    // });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log(err);
    channel.passwordResetToken = undefined;
    channel.passwordResetExpires = undefined;
    await channel.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "Đã có lỗi xảy ra trong quá trình gửi mail. Vui lòng thực hiện lại sau!"
      ),
      500
    );
  }
});
exports.verifyResetPass = catchAsync(async (req, res, next) => {
  // 1) Get channel based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");
  const channel = await channel.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired, and there is channel, set the new password
  if (!channel) {
    return next(new AppError("Token không hợp lệ hoặc đã hết hạn", 400));
  }
  res.status(200).json({
    status: "success",
    hashedToken,
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get channel based on the token
  const channel = await channel.findOne({
    passwordResetToken: req.params.token,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired, and there is channel, set the new password
  if (!channel) {
    return next(new AppError("oken không hợp lệ hoặc đã hết hạn", 400));
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
  const channel = await channel.findById(req.channel.id).select("+password");

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
  res.status(200).json({ status: "success" });
};

exports.googleLogin = catchAsync(async (req, res) => {
  const email = req.body.email;
  // 1) Check if channel exists
  const data = await channel.findOne({ email });
  // 2) Check if channel exist
  if (data.role == "admin") {
    createSendToken(data, 200, res);
  }
  // 3) If channel does not exist, create one
  else {
    res.status(400).json({ message: "Tài khoản này không được phép truy cập" });
  }
});