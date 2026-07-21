import type { User } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "./supabase-server";

export function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim() || null;
}

export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const { data, error } = await getSupabaseServerClient().auth.getUser(token);
  if (error) return null;
  return data.user;
}
