document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtns = document.querySelectorAll('.theme-toggle');
    
    // Function to apply the theme
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-bs-theme', 'dark'); // For Bootstrap pages
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-bs-theme', 'light');
        }

        // Update icon in all toggle buttons
        themeToggleBtns.forEach(btn => {
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
            }
        });
    };

    // Determine initial theme
    // 1. Check local storage first
    let currentTheme = localStorage.getItem('theme');
    
    if (!currentTheme) {
        // 2. Fall back to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            currentTheme = 'dark';
        } else {
            // Default to dark for this specific project based on how it was built
            currentTheme = 'dark';
        }
    }

    applyTheme(currentTheme);

    // Toggle theme on button click
    themeToggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default if it's a link or form button
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', currentTheme);
            applyTheme(currentTheme);
        });
    });
});
