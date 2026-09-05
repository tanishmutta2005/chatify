const mongoose = require("mongoose");
const uri = "mongodb+srv://tanishmutta2005_db_user:tOH30RSL8YgREoDW@chatify.rrizjlq.mongodb.net/test?appName=Chatify";

async function run() {
  await mongoose.connect(uri);
  const result = await mongoose.connection.db.collection("chats").updateMany(
    {},
    { $set: { deletedBy: [] } }
  );
  console.log("SUCCESS: Reset deletedBy count:", result.modifiedCount);
  const chats = await mongoose.connection.db.collection("chats").find({}).toArray();
  console.log("All chats now visible:", chats.map(c => ({ id: c._id, isGroup: c.isGroup, name: c.groupName, membersCount: c.members.length })));
  process.exit(0);
}

run().catch(console.error);
