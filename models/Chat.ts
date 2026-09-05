import mongoose, { Schema, model, models } from "mongoose";

export interface IMemberHistory {
  user: mongoose.Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date | null;
}

export interface IClearedHistory {
  user: mongoose.Types.ObjectId;
  clearedAt: Date;
}

export interface IChat {
  _id: string;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  admin?: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  memberHistory?: IMemberHistory[];
  clearedHistory?: IClearedHistory[];
  latestMessage?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const MemberHistorySchema = new Schema<IMemberHistory>(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt:   { type: Date, default: null },
  },
  { _id: false }
);

const ClearedHistorySchema = new Schema<IClearedHistory>(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clearedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChatSchema = new Schema<IChat>(
  {
    isGroup:     { type: Boolean, default: false },
    groupName:   { type: String, trim: true },
    groupAvatar: { type: String },
    admin:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    members: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    memberHistory:  [MemberHistorySchema],
    clearedHistory: [ClearedHistorySchema],
    latestMessage:  { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

const Chat = models.Chat || model<IChat>("Chat", ChatSchema);
export default Chat;
