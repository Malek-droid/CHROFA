const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function reset() {
  await mongoose.connect("mongodb://127.0.0.1:27017/cadence", { bufferCommands: false });

  const userSchema = new mongoose.Schema(
    {
      name: String,
      email: { type: String, lowercase: true },
      password: { type: String, select: false },
      role: String,
      businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },
      authProvider: String,
      googleId: String,
    },
    { timestamps: true },
  );

  userSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
  });

  const User = mongoose.model("User", userSchema);

  const newPassword = "test123456";
  const user = await User.findOne({ email: "kousatkoskos@gmail.com" }).select("+password");

  if (!user) {
    console.log("User not found with that email.");
    await mongoose.disconnect();
    return;
  }

  user.password = newPassword;
  user.authProvider = "local";
  await user.save();
  console.log("Password reset successfully to: " + newPassword);
  await mongoose.disconnect();
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
