import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Chat from "@/models/Chat";

// PATCH /api/chats/groupremove
// - Admin: remove any member
// - Any member: remove themselves (leave)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatId, userId } = await req.json();
    if (!chatId || !userId) {
      return NextResponse.json({ error: "chatId and userId are required" }, { status: 400 });
    }

    await connectDB();

    const chat = await Chat.findById(chatId);
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    if (!chat.isGroup) return NextResponse.json({ error: "Not a group chat" }, { status: 400 });

    const isAdmin = chat.admin?.toString() === session.user.id;
    const isSelf  = userId === session.user.id;

    // Admin can remove anyone; regular members can only remove themselves
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "Only the group admin can remove other members" }, { status: 403 });
    }

    // Admin cannot remove themselves if they are the last admin
    if (isAdmin && isSelf) {
      return NextResponse.json(
        { error: "Admin cannot leave. Transfer admin first." },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1. Pull user from active members
    // 2. Set leftAt timestamp in memberHistory for this user
    await Chat.updateOne(
      { _id: chatId, "memberHistory.user": userId, "memberHistory.leftAt": null },
      { $set: { "memberHistory.$.leftAt": now } }
    );

    const updated = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { members: userId } },
      { new: true }
    )
      .populate("members", "-password")
      .populate("admin", "-password");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[GROUPREMOVE ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
