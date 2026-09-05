import mongoose, { Schema, model, models } from "mongoose";

export interface IUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  avatar: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatar:   {
      type: String,
      default: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
    },
  },
  { timestamps: true }
);

// Prevent model recompilation in Next.js hot reload
const User = models.User || model<IUser>("User", UserSchema);
export default User;
