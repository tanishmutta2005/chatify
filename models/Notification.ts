import mongoose, { Schema, model, models } from "mongoose";

export interface INotification {
  _id: string;
  recipient: mongoose.Types.ObjectId;
  message: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message:   { type: mongoose.Schema.Types.ObjectId, ref: "Message", required: true },
    isRead:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = models.Notification || model<INotification>("Notification", NotificationSchema);
export default Notification;
