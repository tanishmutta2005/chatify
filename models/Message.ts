import mongoose, { Schema, model, models } from "mongoose";

export interface IMessage {
  _id: string;
  sender: mongoose.Types.ObjectId;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  chat: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content:  { type: String, trim: true, default: "" },
    fileUrl:  { type: String, default: null },
    fileName: { type: String, default: null },
    chat:     { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    readBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const Message = models.Message || model<IMessage>("Message", MessageSchema);
export default Message;
