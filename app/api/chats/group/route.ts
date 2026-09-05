import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Chat from "@/models/Chat";

// POST /api/chats/group — create group chat (creator becomes admin)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, members } = await req.json();

    if (!name || !members || members.length < 2) {
      return NextResponse.json(
        { error: "Group name and at least 2 other members are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Add current user to members if not already included
    const allMembers = [...new Set([...members, session.user.id])];
    const now = new Date();

    const memberHistory = allMembers.map((userId) => ({
      user:     userId,
      joinedAt: now,
      leftAt:   null,
    }));

    const group = await Chat.create({
      isGroup:        true,
      groupName:      name,
      groupAvatar:    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      admin:          session.user.id,
      members:        allMembers,
      memberHistory,
      clearedHistory: [],
    });

    const fullGroup = await Chat.findById(group._id)
      .populate("members", "-password")
      .populate("admin", "-password");

    return NextResponse.json(fullGroup, { status: 201 });
  } catch (error) {
    console.error("[GROUP CREATE ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
