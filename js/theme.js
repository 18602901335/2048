/**
 * Theme Manager
 * Applies CSS custom properties to switch color schemes.
 * Three built-in themes: classic, dark, macaron.
 */
const ThemeManager = {
    themes: {
        classic: {
            '--bg': '#fafbf5',
            '--board-bg': '#72777a',
            '--cell-bg': 'rgba(114,119,122,0.45)',
            '--text': '#2b3439',
            '--text-light': '#fefef2',
            '--text-dark': '#fefef2',
            '--btn-bg': '#4a5c5c',
            '--btn-text': '#fefef2',
            '--modal-bg': '#ffffff',
            '--overlay-bg': 'rgba(250,251,245,0.88)',
            '--tile-2': '#f8f2d8',
            '--tile-4': '#d4cdb8',
            '--tile-8': '#cddce1',
            '--tile-16': '#a8bec5',
            '--tile-32': '#7794a6',
            '--tile-64': '#698495',
            '--tile-128': '#526671',
            '--tile-256': '#495f74',
            '--tile-512': '#455c6e',
            '--tile-1024': '#4a5c5c',
            '--tile-2048': '#374545',
            '--tile-super': '#2b3439',
        },
        dark: {
            '--bg': '#1a1a2e',
            '--board-bg': '#16213e',
            '--cell-bg': 'rgba(255,255,255,0.06)',
            '--text': '#e0e0e0',
            '--text-light': '#ffffff',
            '--text-dark': '#e0e0e0',
            '--btn-bg': '#0f3460',
            '--btn-text': '#e0e0e0',
            '--modal-bg': '#222244',
            '--overlay-bg': 'rgba(26,26,46,0.9)',
            '--tile-2': '#2d2d44',
            '--tile-4': '#3d3d5c',
            '--tile-8': '#4a6fa5',
            '--tile-16': '#5b8cbf',
            '--tile-32': '#6da6d9',
            '--tile-64': '#4ecdc4',
            '--tile-128': '#a78bfa',
            '--tile-256': '#e056a0',
            '--tile-512': '#f39c12',
            '--tile-1024': '#e67e22',
            '--tile-2048': '#e74c3c',
            '--tile-super': '#c0392b',
        },
        macaron: {
            '--bg': '#f7f0f5',
            '--board-bg': '#e8d5e0',
            '--cell-bg': 'rgba(255,255,255,0.4)',
            '--text': '#5a4a5a',
            '--text-light': '#ffffff',
            '--text-dark': '#ffffff',
            '--btn-bg': '#b09ab0',
            '--btn-text': '#ffffff',
            '--modal-bg': '#fff5fa',
            '--overlay-bg': 'rgba(247,240,245,0.88)',
            '--tile-2': '#ffd4e5',
            '--tile-4': '#d4e5ff',
            '--tile-8': '#ffe5cc',
            '--tile-16': '#d4ffe5',
            '--tile-32': '#e8d4ff',
            '--tile-64': '#fff9cc',
            '--tile-128': '#ffcccc',
            '--tile-256': '#ccf0ff',
            '--tile-512': '#f0ccff',
            '--tile-1024': '#ccfff0',
            '--tile-2048': '#ffe0cc',
            '--tile-super': '#b0a0b0',
        }
    },

    current: 'classic',

    /** Apply a theme by name. Falls back to classic if name unknown. */
    apply(name) {
        const vars = this.themes[name] || this.themes.classic;
        this.current = name;
        const root = document.documentElement;
        Object.entries(vars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
        // Update theme-color meta for browser chrome
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = vars['--bg'];
    },

    /** Get list of available theme keys. */
    getList() {
        return Object.keys(this.themes);
    }
};
