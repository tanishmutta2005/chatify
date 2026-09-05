import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Chat from "@/models/Chat";

// DELETE /api/chats/[chatId] — deletes/clears messages inside the chat for the requesting user ONLY
// The chat stays in the list, but previous messages are hidden for this user.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!/^[a-f\d]{24}$/i.test(chatId)) {
      return NextResponse.json({ error: "Invalid chatId" }, { status: 400 });
    }

    await connectDB();

    // Verify user is a member (or past member) of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      $or: [
        { members: session.user.id },
        { "memberHistory.user": session.user.id },
      ],
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 });
    }

    const now = new Date();

    // Remove any existing cleared record for this user and push new clearedAt timestamp
    await Chat.findByIdAndUpdate(chatId, {
      $pull: { clearedHistory: { user: session.user.id } }
    });

    await Chat.findByIdAndUpdate(chatId, {
      $push: {
        clearedHistory: {
          user: session.user.id,
          clearedAt: now,
        },
      },
    });

    return NextResponse.json({ message: "Messages cleared for you" });
  } catch (error) {
    console.error("[CHAT CLEAR ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
