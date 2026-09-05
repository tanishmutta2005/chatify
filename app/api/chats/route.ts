import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Chat from "@/models/Chat";
import Message from "@/models/Message";

// GET /api/chats — get all chats for current user (active members and past group members)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    // Find chats where user is currently a member, or was in memberHistory (e.g. removed group member)
    const chats = await Chat.find({
      $or: [
        { members: { $in: [session.user.id] } },
        { "memberHistory.user": session.user.id },
      ],
    })
      .populate("members", "-password")
      .populate("admin", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "sender", select: "name username avatar" },
      })
      .sort({ updatedAt: -1 });

    return NextResponse.json(chats);
  } catch (error) {
    console.error("[CHATS GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/chats — create or fetch existing 1-on-1 chat
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    await connectDB();

    // Check if 1-on-1 chat already exists between the two users
    const existing = await Chat.findOne({
      isGroup: false,
      members: { $all: [session.user.id, userId] },
    })
      .populate("members", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "sender", select: "name username avatar" },
      });

    if (existing) {
      return NextResponse.json(existing);
    }

    // Create a new 1-on-1 chat
    const newChat = await Chat.create({
      isGroup: false,
      members: [session.user.id, userId],
    });

    const fullChat = await Chat.findById(newChat._id).populate("members", "-password");
    return NextResponse.json(fullChat, { status: 201 });
  } catch (error) {
    console.error("[CHATS POST ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
