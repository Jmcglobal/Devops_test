const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "User must have a valid name"],
    },
    email: {
      type: String,
      required: [true, "User must have a Valid email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, `Please provide a valid email`],
    },
    password: {
      type: String,
      required: [true, "User must have a password"],
      minlength: 8,
      select: false,
    },
    passwordConfirmation: {
      type: String,
      required: [true, "User must confirm there password"],
      minlength: 8,
      validate: {
        validator: function (val) {
          return val === this.password;
        },
        message: "password are not the same",
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirmation = undefined;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
