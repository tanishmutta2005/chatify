import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

// GET /api/users?search=john
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawSearch = (searchParams.get("search") || "").trim().replace(/^@+/, "");

    // ── Guard: limit search length & escape special regex chars (ReDoS prevention)
    if (rawSearch.length > 50) {
      return NextResponse.json({ error: "Search query too long" }, { status: 400 });
    }
    const safeSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    await connectDB();

    // Query condition: exclude current user
    const queryCondition: any = {
      _id: { $ne: session.user.id }
    };

    if (safeSearch) {
      queryCondition.$or = [
        { username: { $regex: safeSearch, $options: "i" } },
        { name:     { $regex: safeSearch, $options: "i" } },
      ];
    }

    const users = await User.find(queryCondition)
      .select("-password")
      .limit(10);

    return NextResponse.json(users);
  } catch (error) {
    console.error("[USERS GET ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
