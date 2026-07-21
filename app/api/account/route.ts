import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase-server";

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Log in to delete your account." }, { status: 401 });
  const { error } = await getSupabaseServerClient().auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "We couldn’t delete your account." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
