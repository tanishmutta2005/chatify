import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Chat from "@/models/Chat";
import Message from "@/models/Message";

// DELETE /api/chats/group/[chatId] — permanently delete group chat (admin only)
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

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (!chat.isGroup) {
      return NextResponse.json({ error: "Only group chats can be deleted via this endpoint" }, { status: 400 });
    }

    // Only admin can permanently delete the group
    const adminId = chat.admin?._id ? chat.admin._id.toString() : chat.admin?.toString();
    if (adminId !== session.user.id) {
      return NextResponse.json({ error: "Only the group admin can permanently delete this group" }, { status: 403 });
    }

    // Collect all member IDs (active and past) so socket can notify them if needed
    const allMemberIds = [
      ...new Set([
        ...chat.members.map((m: any) => (m._id || m).toString()),
        ...(chat.memberHistory || []).map((h: any) => (h.user?._id || h.user).toString()),
      ]),
    ];

    // Delete all messages associated with this group
    await Message.deleteMany({ chat: chatId });

    // Delete the group document permanently
    await Chat.findByIdAndDelete(chatId);

    return NextResponse.json({
      message: "Group permanently deleted",
      chatId,
      memberIds: allMemberIds,
    });
  } catch (error) {
    console.error("[GROUP PERMANENT DELETE ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
