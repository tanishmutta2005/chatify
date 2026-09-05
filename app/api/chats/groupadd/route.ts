import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Chat from "@/models/Chat";

// PATCH /api/chats/groupadd — add member to group (admin only)
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

    // Only admin can add members
    if (chat.admin?.toString() !== session.user.id) {
      return NextResponse.json({ error: "Only the group admin can add members" }, { status: 403 });
    }

    // Check if user is already an active member
    if (chat.members.map((m: any) => m.toString()).includes(userId)) {
      return NextResponse.json({ error: "User is already in the group" }, { status: 409 });
    }

    const now = new Date();

    // Push into members and record joinedAt in memberHistory
    const updated = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: {
          members: userId,
          memberHistory: {
            user: userId,
            joinedAt: now,
            leftAt: null,
          },
        },
      },
      { new: true }
    )
      .populate("members", "-password")
      .populate("admin", "-password");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[GROUPADD ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
