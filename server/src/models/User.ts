import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser, UserRole } from "../types";

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, 
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
      match: [
        /^[a-zA-Z\s]+$/,
        "First name can only contain letters and spaces",
      ],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
      match: [/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces"],
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: "Role must be either admin or member",
      },
      default: UserRole.MEMBER,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  },
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.getAdmins = function () {
  return this.find({ role: UserRole.ADMIN });
};

userSchema.statics.getMembers = function () {
  return this.find({ role: UserRole.MEMBER });
};

export default mongoose.model<IUser>("User", userSchema);
