/**
 * 2048 App Controller
 * Wires GameEngine, ThemeManager, SoundManager to the DOM.
 * Handles touch / keyboard input, rendering, and settings UI.
 */
(function () {
    'use strict';

    /* ==================================================================
       State
       ================================================================== */
    // Restore saved game or start fresh
    let engine;
    try {
        const saved = localStorage.getItem('my2048_save');
        if (saved) {
            engine = GameEngine.fromSaveData(JSON.parse(saved));
        }
    } catch (_) {}
    if (!engine) engine = new GameEngine(4);

    const sound = new SoundManager();

    // Track previous state for animation detection
    let prevGrid = null;
    let mergedPositions = [];

    // Settings
    let currentTheme = localStorage.getItem('my2048_theme') || 'classic';
    let currentSound = localStorage.getItem('my2048_sound') || 'crisp';

    // Best scores per grid size
    const bestScores = {};
    [3, 4, 5, 6].forEach(s => {
        bestScores[s] = parseInt(localStorage.getItem('my2048_best_' + s)) || 0;
    });

    // Auto-save helpers
    function saveGame() {
        try { localStorage.setItem('my2048_save', JSON.stringify(engine.toSaveData())); } catch (_) {}
    }
    function clearSave() {
        try { localStorage.removeItem('my2048_save'); } catch (_) {}
    }

    // Score display updated by updateBestScore() below during init

    /* ==================================================================
       DOM refs
       ================================================================== */
    const $board         = document.getElementById('game-board');
    const $score         = document.getElementById('score');
    const $bestScore     = document.getElementById('best-score');
    const $overlay       = document.getElementById('game-overlay');
    const $overlayText   = document.getElementById('overlay-text');
    const $btnOverlayAct = document.getElementById('btn-overlay-action');
    const $btnOverlayCont = document.getElementById('btn-overlay-continue');
    const $settingsOverlay = document.getElementById('settings-overlay');

    /* ==================================================================
       Initialization
       ================================================================== */
    ThemeManager.apply(currentTheme);
    sound.setSoundSet(currentSound);

    // Highlight active size button
    document.querySelectorAll('.size-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.size) === engine.size);
    });

    // Highlight active theme / sound buttons
    document.querySelector(`[data-theme="${currentTheme}"]`)?.classList.add('active');
    document.querySelector(`[data-sound="${currentSound}"]`)?.classList.add('active');

    updateBestScore();
    render();

    /* ==================================================================
       Input: Keyboard
       ================================================================== */
    document.addEventListener('keydown', e => {
        const map = {
            ArrowUp: 'up', ArrowDown: 'down',
            ArrowLeft: 'left', ArrowRight: 'right',
            w: 'up', s: 'down', a: 'left', d: 'right',
            W: 'up', S: 'down', A: 'left', D: 'right',
        };
        const dir = map[e.key];
        if (dir) {
            e.preventDefault();
            doMove(dir);
        }
        // Z = undo
        if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            doUndo();
        }
    });

    /* ==================================================================
       Input: Touch
       ================================================================== */
    let touchStartX = 0, touchStartY = 0;

    $board.addEventListener('touchstart', e => {
        sound.init(); // unlock audio on first touch
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    $board.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const threshold = 30;

        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            doMove(dx > 0 ? 'right' : 'left');
        } else {
            doMove(dy > 0 ? 'down' : 'up');
        }
    });

    // Prevent scrolling on the game board
    $board.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    /* ==================================================================
       Input: Buttons
       ================================================================== */
    document.getElementById('btn-undo').addEventListener('click', () => {
        sound.init();
        doUndo();
    });

    document.getElementById('btn-new-game').addEventListener('click', () => {
        sound.init();
        newGame();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        sound.init();
        openSettings();
    });

    document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
    $settingsOverlay.addEventListener('click', e => {
        if (e.target === $settingsOverlay) closeSettings();
    });

    // Theme options
    document.getElementById('theme-options').addEventListener('click', e => {
        const btn = e.target.closest('[data-theme]');
        if (!btn) return;
        sound.init();
        currentTheme = btn.dataset.theme;
        ThemeManager.apply(currentTheme);
        localStorage.setItem('my2048_theme', currentTheme);
        // Update active state
        document.querySelectorAll('#theme-options .opt-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.theme === currentTheme));
        render();
    });

    // Sound options
    document.getElementById('sound-options').addEventListener('click', e => {
        const btn = e.target.closest('[data-sound]');
        if (!btn) return;
        sound.init();
        currentSound = btn.dataset.sound;
        sound.setSoundSet(currentSound);
        localStorage.setItem('my2048_sound', currentSound);
        document.querySelectorAll('#sound-options .opt-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.sound === currentSound));
        // Play a sample sound so user can hear it immediately
        sound.play('move');
    });

    // Size buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sound.init();
            const newSize = parseInt(btn.dataset.size);
            if (newSize === engine.size) return;
            engine.setSize(newSize);
            clearSave();
            prevGrid = null;
            mergedPositions = [];
            document.querySelectorAll('.size-btn').forEach(b =>
                b.classList.toggle('active', parseInt(b.dataset.size) === newSize));
            updateBestScore();
            render();
            $overlay.style.display = 'none';
        });
    });

    // Game over / win overlay
    $btnOverlayAct.addEventListener('click', () => {
        sound.init();
        newGame();
        $overlay.style.display = 'none';
    });

    $btnOverlayCont.addEventListener('click', () => {
        sound.init();
        engine.keepPlaying = true;
        $overlay.style.display = 'none';
    });

    /* ==================================================================
       Game Actions
       ================================================================== */

    function doMove(direction) {
        // Save grid before move for animation detection
        prevGrid = engine.grid.map(r => [...r]);

        const result = engine.slide(direction);

        if (!result.moved) return; // nothing happened

        mergedPositions = result.mergedPositions;

        // Sound
        if (mergedPositions.length > 0) {
            sound.play('merge');
        } else {
            sound.play('move');
        }

        // Update best score
        const bestKey = 'my2048_best_' + engine.size;
        if (engine.score > bestScores[engine.size]) {
            bestScores[engine.size] = engine.score;
            localStorage.setItem(bestKey, engine.score);
        }

        render();
        updateBestScore();
        animateScore();

        // Check win / lose after render
        if (engine.hasWon() && !engine.won && !engine.keepPlaying) {
            engine.won = true;
            showOverlay('你赢了！', true);
        } else if (engine.hasLost()) {
            showOverlay('游戏结束', false);
        }
        saveGame();
    }

    function doUndo() {
        if (!engine.undo()) return;
        prevGrid = null;
        mergedPositions = [];
        render();
        updateBestScore();
        animateScore();
        saveGame();
    }

    function newGame() {
        engine.init();
        prevGrid = null;
        mergedPositions = [];
        render();
        updateBestScore();
        animateScore();
        clearSave();
    }

    /* ==================================================================
       Rendering
       ================================================================== */

    function render() {
        const size = engine.size;
        const gap = 8;

        // Set grid CSS variable
        $board.style.setProperty('--grid-size', size);
        $board.style.setProperty('--cell-gap', gap + 'px');

        // Compute tile dimensions based on board width
        const boardW = $board.clientWidth;
        const tileW = (boardW - gap * (size + 1)) / size;

        // Build HTML
        let html = '';

        // Background cells
        for (let i = 0; i < size * size; i++) {
            html += '<div class="cell-bg"></div>';
        }

        // Tiles
        // Detect new tiles (in current grid but not in prevGrid)
        const newSet = new Set();
        if (prevGrid) {
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (engine.grid[r][c] !== 0 && (!prevGrid[r] || prevGrid[r][c] === 0)) {
                        newSet.add(`${r},${c}`);
                    }
                }
            }
        }

        const mergedSet = new Set(mergedPositions.map(p => `${p[0]},${p[1]}`));

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const val = engine.grid[r][c];
                if (val === 0) continue;

                const x = gap + c * (tileW + gap);
                const y = gap + r * (tileW + gap);
                const fontSize = val < 100 ? tileW * 0.42 :
                                 val < 1000 ? tileW * 0.34 :
                                 val < 10000 ? tileW * 0.27 : tileW * 0.22;
                const cls = getTileClass(val);
                const isNew = newSet.has(`${r},${c}`);
                const isMerged = mergedSet.has(`${r},${c}`);
                const animCls = isNew ? ' is-new' : (isMerged ? ' is-merged' : '');

                html += `<div class="tile ${cls}${animCls}"
                    style="
                        width:${tileW.toFixed(1)}px; height:${tileW.toFixed(1)}px;
                        left:${x.toFixed(1)}px; top:${y.toFixed(1)}px;
                        font-size:${fontSize.toFixed(1)}px;
                    ">${val}</div>`;
            }
        }

        $board.innerHTML = html;
        $score.textContent = engine.score;

        // Clear merged positions after render (they last one frame)
        mergedPositions = [];
        prevGrid = engine.grid.map(r => [...r]);
    }

    function getTileClass(val) {
        if (val <= 2048) return 'tile-' + val;
        return 'tile-super';
    }

    function updateBestScore() {
        const best = bestScores[engine.size] || 0;
        $bestScore.textContent = best;
    }

    function animateScore() {
        $score.classList.remove('pop');
        void $score.offsetWidth; // force reflow
        $score.classList.add('pop');
    }

    /* ==================================================================
       Overlay
       ================================================================== */

    function showOverlay(text, isWin) {
        $overlayText.textContent = text;
        $btnOverlayAct.textContent = '再来一局';
        $btnOverlayCont.style.display = isWin ? 'block' : 'none';
        if (isWin) {
            $btnOverlayCont.textContent = '继续游戏';
        }
        $overlay.style.display = 'flex';
    }

    /* ==================================================================
       Settings
       ================================================================== */

    function openSettings() {
        // Sync UI with current state
        document.querySelectorAll('#theme-options .opt-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.theme === currentTheme));
        document.querySelectorAll('#sound-options .opt-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.sound === currentSound));
        $settingsOverlay.style.display = 'flex';
    }

    function closeSettings() {
        $settingsOverlay.style.display = 'none';
    }

    /* ==================================================================
       Resize handler — re-render when board size changes
       ================================================================== */
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 100);
    });

    // Orientation change on mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(render, 200);
    });
})();
