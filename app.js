const express = require("express");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const channelRouter = require("./routes/channelRoutes");
const categoryRouter = require("./routes/categoryRoutes");
const videoRouter = require("./routes/videoRoutes");
const playListRouter = require("./routes/playListRoutes");
const commentRouter = require("./routes/commentRoutes");
const subscriberRouter = require("./routes/subscriberRoutes");
const favoriteVideoRouter = require("./routes/favoriteVideoRoutes");
const watchHistoryRouter = require("./routes/watchHistoryRoutes");

const app = express();
// Add headers before the routes are defined
app.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["POST", "GET", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
// Serving static files
// 1) GLOBAL MIDDLEWARE
// Set security HTTP headers
app.use(helmet());
app.use(cookieParser());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ["ratingsQuantity", "ratingsAverage", "price"],
  })
);
app.use(compression());
// Serving static files

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

// 3) ROUTES
app.use("/api/v1/channels", channelRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/playlists", playListRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/subscribers", subscriberRouter);
app.use("/api/v1/favoriteVideos", favoriteVideoRouter);
app.use("/api/v1/watchHistories", watchHistoryRouter);

// const __variableOfChoice = path.resolve();
// app.use(express.static(path.join(__variableOfChoice, "/fe/dist")));
// app.get("*", (req, res) =>
//   res.sendFile(path.join(__variableOfChoice, "/fe/dist/index.html"))
// );
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  // res.status(200).render("404");
});

// app.use((err, req, res, next) => {
//   // console.log(err.stack);

//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || "error";
//   res.status(err.statusCode).json({
//     status: err.status,
//     error: err,
//     message: err.message,
//     stack: err.stack,
//   });
// });
app.use(globalErrorHandler);

module.exports = app;
