import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: "UserId and role are required" },
        { status: 400 }
      );
    }

    // Hanya izinkan setting role 'pelamar' dari endpoint publik ini demi keamanan.
    if (role !== "pelamar") {
      return NextResponse.json(
        { error: "Unauthorized role assignment" },
        { status: 403 }
      );
    }

    const supabaseAdmin = createAdminClient();
    
    // Ambil data user saat ini untuk mempertahankan app_metadata yang sudah ada
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !user) {
      return NextResponse.json(
        { error: getUserError?.message || "User not found" },
        { status: 404 }
      );
    }

    // Gabungkan app_metadata yang lama dengan role baru
    const currentMeta = user.app_metadata || {};
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          ...currentMeta,
          app_role: role,
        },
      }
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error setting role:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
