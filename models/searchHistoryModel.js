const mongoose = require("mongoose");
const searchHistorySchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    keyword: {
      type: String,
      required: [true, "Chưa có từ khóa tìm kiếm"],
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const SearchHistory = mongoose.model("SearchHistory", searchHistorySchema);

module.exports = SearchHistory;
