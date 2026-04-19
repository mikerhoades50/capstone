// theme.js - Fixed Dark Mode Toggle (works on all pages)

function initTheme() {
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply saved theme immediately
  if (savedTheme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // Find the existing icon button in the navbar (it already exists in your HTML)
  const toggleBtn = document.getElementById('themeToggle');

  if (!toggleBtn) {
    console.warn('Theme toggle button not found in navbar');
    return;
  }

  // Set correct initial icon
  toggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  // Add click handler
  toggleBtn.addEventListener('click', () => {
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    toggleBtn.textContent = isDark ? '☀️' : '🌙';
  });
}

// Run as soon as the script loads
initTheme();