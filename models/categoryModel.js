const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Thể loại video không thể để trống"],
      unique: true,
      trim: true,
      maxlength: [40, "Tối đa 40 kí tự"],
      minlength: [2, "Tối thiểu 2 kí tự"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
