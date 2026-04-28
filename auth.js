// auth.js - Final version with group support + all exports
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://woplbevwhogyiqpsnnct.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_N6tb1BKQ7XDuJJSg-tIs4g_r13llovy';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserGroupId() {
  const user = await getCurrentUser();
  if (!user) {
    console.error("❌ No authenticated user found");
    return null;
  }

  console.log("🔍 Getting group for user:", user.email, "UID:", user.id);

  try {
    // Check if user already has groups
    const { data: existing, error: checkError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .limit(1);

    if (checkError) {
      console.error("❌ Error checking existing groups:", checkError);
      return null;
    }

    if (existing && existing.length > 0) {
      console.log("✅ Found existing group:", existing[0].group_id);
      return existing[0].group_id;
    }

    console.log("🆕 No group found — creating new personal group...");

    // Create group (this version avoids the SELECT RLS conflict during insert)
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert([{ name: `${user.email.split('@')[0]}'s Group` }])
      .select('id')
      .single();

    if (groupError) {
      console.error("❌ Failed to create group:", groupError);
      return null;
    }

    console.log("✅ Group created:", newGroup.id);

    // Add user to group
    const { error: memberError } = await supabase
      .from('group_members')
      .insert([{
        group_id: newGroup.id,
        user_id: user.id
      }]);

    if (memberError) {
      console.error("❌ Failed to add user to group:", memberError);
      return null;
    }

    console.log("✅ User successfully added to new group");
    return newGroup.id;

  } catch (err) {
    console.error("💥 Unexpected error in getUserGroupId():", err);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

// ✅ Make sure logout is exported
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

function getRedirectURL(path = '/index.html') {
  return window.location.origin + path;
}
export { getRedirectURL };

// Auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = 'login.html';
  }
});