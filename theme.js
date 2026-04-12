// theme.js - Persistent Dark Mode with immediate apply
function initTheme() {
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply saved theme immediately
  if (savedTheme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // Create toggle button (only once)
  let toggle = document.querySelector('.theme-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.textContent = savedTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    document.body.appendChild(toggle);

    toggle.addEventListener('click', () => {
      const isDark = html.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      toggle.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    });
  }
}

// Run immediately when script loads
initTheme();