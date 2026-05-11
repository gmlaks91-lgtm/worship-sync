"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { loginIdToSupabaseEmail } from "@/features/auth/login-id-email";

export async function signInWithIdAction(input: { loginId: string; password: string }) {
  const supabase = await createClient();

  const email = loginIdToSupabaseEmail(input.loginId);
  console.log("로그인 시도 이메일:", email);
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function signUpWithIdAction(input: {
  loginId: string;
  password: string;
  username: string;
  rolePriority1: string;
  rolePriority2?: string;
  rolePriority3?: string;
}) {
  const supabase = await createClient();
  const email = loginIdToSupabaseEmail(input.loginId);

  const { error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username: input.username.trim(),
        role_priority_1: input.rolePriority1,
        role_priority_2: input.rolePriority2 || null,
        role_priority_3: input.rolePriority3 || null,
      },
    },
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
