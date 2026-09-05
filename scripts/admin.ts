import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Usage:
// 1. List all users:
//    npx ts-node --project tsconfig.json scripts/admin.ts list
// 2. Create user:
//    npx ts-node --project tsconfig.json scripts/admin.ts create "Full Name" "username" "email@example.com" "password123"
// 3. Delete user:
//    npx ts-node --project tsconfig.json scripts/admin.ts delete "username_or_email"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://tanishmutta2005_db_user:tOH30RSL8YgREoDW@chatify.rrizjlq.mongodb.net/test?appName=Chatify";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "https://api.dicebear.com/7.x/avataaars/svg?seed=default" },
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

const ChatSchema = new mongoose.Schema({
  isGroup: Boolean,
  groupName: String,
  groupAvatar: String,
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  memberHistory: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, joinedAt: Date, leftAt: Date }],
  clearedHistory: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, clearedAt: Date }],
  latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);
const Chat = mongoose.models.Chat || mongoose.model("Chat", ChatSchema);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || !["create", "delete", "list"].includes(command)) {
    console.log(`
ChatApp Admin CLI:
  List all users:
    npx ts-node --project tsconfig.json scripts/admin.ts list

  Create user:
    npx ts-node --project tsconfig.json scripts/admin.ts create "<Name>" "<username>" "<email>" "<password>"

  Delete user & cleanup:
    npx ts-node --project tsconfig.json scripts/admin.ts delete "<username or email>"
`);
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  try {
    if (command === "list") {
      const users = await User.find({}, "name username email createdAt").sort({ createdAt: -1 });
      console.log(`\nRegistered Users (${users.length}):`);
      console.table(users.map(u => ({
        ID: u._id.toString(),
        Name: u.name,
        Username: u.username,
        Email: u.email,
        Created: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
      })));
    } else if (command === "create") {
      const [, name, username, email, password] = args;
      if (!name || !username || !email || !password) {
        console.error("Error: Missing parameters. Expected: <name> <username> <email> <password>");
        process.exit(1);
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      const existing = await User.findOne({
        $or: [{ username: cleanUsername }, { email: cleanEmail }]
      });

      if (existing) {
        console.error(`Error: User with this email or username already exists: ${existing.username} (${existing.email})`);
        process.exit(1);
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`;

      const newUser = await User.create({
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        avatar,
      });

      console.log(`\nSuccessfully created user!`);
      console.log(`  Name:     ${newUser.name}`);
      console.log(`  Username: ${newUser.username}`);
      console.log(`  Email:    ${newUser.email}`);
    } else if (command === "delete") {
      const target = args[1]?.trim().toLowerCase();
      if (!target) {
        console.error("Error: Missing username or email to delete.");
        process.exit(1);
      }

      const user = await User.findOne({
        $or: [{ username: target }, { email: target }]
      });

      if (!user) {
        console.error(`Error: User not found with username or email: "${target}"`);
        process.exit(1);
      }

      const userId = user._id;
      console.log(`Found user: ${user.name} (@${user.username}, ${user.email})`);

      // 1. Delete user's messages
      const deletedMessages = await Message.deleteMany({ sender: userId });
      console.log(`- Deleted ${deletedMessages.deletedCount} messages sent by this user.`);

      // 2. Remove user from chat members and history
      await Chat.updateMany(
        { members: userId },
        {
          $pull: {
            members: userId,
            memberHistory: { user: userId },
            clearedHistory: { user: userId },
          }
        }
      );

      // 3. Remove 1-on-1 chats where this user was a participant
      const dmChats = await Chat.find({ isGroup: false, members: userId });
      for (const dm of dmChats) {
        await Message.deleteMany({ chat: dm._id });
        await Chat.findByIdAndDelete(dm._id);
        console.log(`- Deleted 1-on-1 chat ${dm._id}`);
      }

      // If user was admin of a group, reassign or delete if empty
      const adminGroups = await Chat.find({ isGroup: true, admin: userId });
      for (const group of adminGroups) {
        if (group.members.length > 0) {
          group.admin = group.members[0];
          await group.save();
          console.log(`- Transferred admin role of "${group.groupName}" to user ${group.admin}.`);
        } else {
          await Message.deleteMany({ chat: group._id });
          await Chat.findByIdAndDelete(group._id);
          console.log(`- Deleted empty group "${group.groupName}".`);
        }
      }

      // 4. Finally delete user record
      await User.findByIdAndDelete(userId);
      console.log(`\nSuccessfully deleted user "${user.name}" and purged all associated records.`);
    }
  } catch (err) {
    console.error("Operation failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
