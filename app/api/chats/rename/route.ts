import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Chat from "@/models/Chat";

// PATCH /api/chats/rename — rename group (admin only)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatId, groupName } = await req.json();
    if (!chatId || !groupName) {
      return NextResponse.json({ error: "chatId and groupName are required" }, { status: 400 });
    }

    await connectDB();

    const chat = await Chat.findById(chatId);
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

    // Only the admin can rename the group
    if (chat.admin?.toString() !== session.user.id) {
      return NextResponse.json({ error: "Only the group admin can rename the group" }, { status: 403 });
    }

    const updated = await Chat.findByIdAndUpdate(
      chatId,
      { groupName },
      { new: true }
    )
      .populate("members", "-password")
      .populate("admin", "-password");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[RENAME ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
