import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Chat from "@/models/Chat";
import User from "@/models/User";

// POST /api/messages — send a message
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatId, content, fileUrl, fileName } = await req.json();

    // ── Input validation ─────────────────────────────────────
    const trimmedContent = content?.trim() || "";
    if (!chatId || (!trimmedContent && !fileUrl)) {
      return NextResponse.json({ error: "chatId and message content or file are required" }, { status: 400 });
    }
    // Prevent excessively large message content
    if (trimmedContent.length > 2000) {
      return NextResponse.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
    }
    // Basic ObjectId format guard (24 hex chars) to prevent injection
    if (!/^[a-f\d]{24}$/i.test(chatId)) {
      return NextResponse.json({ error: "Invalid chatId" }, { status: 400 });
    }

    await connectDB();

    // Verify sender is a member of the chat
    const chat = await Chat.findOne({ _id: chatId, members: session.user.id });
    if (!chat) return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 });

    // Create message
    let message = await Message.create({
      sender:   session.user.id,
      content:  trimmedContent,
      fileUrl:  fileUrl || null,
      fileName: fileName || null,
      chat:     chatId,
      readBy:   [session.user.id],
    });

    // Populate sender details
    message = await Message.findById(message._id)
      .populate("sender", "name username avatar")
      .populate("chat");

    // Update chat's latestMessage
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[MESSAGES POST ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
