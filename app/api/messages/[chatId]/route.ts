import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Chat from "@/models/Chat";

// GET /api/messages/[chatId] — fetch messages visible to the requesting user
// - Respects clearedAt timestamp: messages sent before the user clicked 'clear' are hidden for this user
// - For group chats: newly added members only see messages created after joinedAt
// - For removed members: they only see messages created before leftAt
export async function GET(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    // Verify user is an active member or past member of the chat
    const chat = await Chat.findOne({
      _id: chatId,
      $or: [
        { members: session.user.id },
        { "memberHistory.user": session.user.id },
      ],
    });

    if (!chat) return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 });

    const messageQuery: any = { chat: chatId };
    const dateConditions: any = {};

    // 1. Check if user cleared messages in this chat
    const clearedEntry = chat.clearedHistory?.find(
      (c: any) => c.user?.toString() === session.user.id
    );
    if (clearedEntry?.clearedAt) {
      dateConditions.$gt = new Date(clearedEntry.clearedAt);
    }

    // 2. Check group membership history for joinedAt & leftAt
    if (chat.isGroup && chat.memberHistory?.length) {
      // Find history entries for this user
      const userHistories = chat.memberHistory.filter(
        (h: any) => h.user?.toString() === session.user.id
      );

      if (userHistories.length > 0) {
        // Find earliest joinedAt or latest relevant joinedAt
        const latestHistory = userHistories[userHistories.length - 1];

        if (latestHistory.joinedAt) {
          const joinedTime = new Date(latestHistory.joinedAt);
          if (!dateConditions.$gt || joinedTime > dateConditions.$gt) {
            dateConditions.$gt = joinedTime;
          }
        }

        // If member was removed / left, they can only see messages up to leftAt
        if (latestHistory.leftAt) {
          dateConditions.$lte = new Date(latestHistory.leftAt);
        }
      }
    }

    if (Object.keys(dateConditions).length > 0) {
      messageQuery.createdAt = dateConditions;
    }

    const messages = await Message.find(messageQuery)
      .populate("sender", "name username avatar")
      .sort({ createdAt: 1 }); // oldest first

    // Mark visible messages as read by current user
    await Message.updateMany(
      { ...messageQuery, readBy: { $nin: [session.user.id] } },
      { $push: { readBy: session.user.id } }
    );

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[MESSAGES GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
