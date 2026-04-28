import { supabase, requireAuth, logout } from './auth.js';

const userAvatar = document.getElementById('userAvatar');
const userNameEl = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

async function initAuth() {
  const user = await requireAuth();
  if (!user) return;

  userNameEl.textContent = user.email.split('@')[0];
  
  userAvatar.src = user.user_metadata?.avatar_url || 
                   `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=3b82f6&color=fff&size=128`;

  console.log('✅ Resources page - Logged in as:', user.email);
}

logoutBtn.addEventListener('click', logout);

document.addEventListener('DOMContentLoaded', initAuth);

