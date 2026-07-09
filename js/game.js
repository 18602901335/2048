/**
 * 2048 Game Engine
 * Pure logic: grid operations, scoring, undo, win/lose detection.
 * No DOM or UI dependencies.
 */
class GameEngine {
    /**
     * @param {number} size - Grid size (3, 4, 5, or 6)
     */
    constructor(size = 4) {
        this.size = size;
        this.grid = [];
        this.score = 0;
        this.undoStack = [];     // { grid, score } — max 10 entries
        this.won = false;        // true after first 2048 reach
        this.keepPlaying = false;
        this.moved = false;      // whether the last slide changed anything
        this.init();
    }

    /** Reset to empty grid and spawn two tiles. */
    init() {
        this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
        this.score = 0;
        this.undoStack = [];
        this.won = false;
        this.keepPlaying = false;
        this.moved = false;
        this.addRandomTile();
        this.addRandomTile();
    }

    /** Get the target number based on grid size */
    getTargetScore() {
        const targets = { 3: 256, 4: 2048, 5: 2048, 6: 4096 };
        return targets[this.size] || 2048;
    }

    /* ------------------------------------------------------------------ */
    /*  Public API                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Slide tiles in a direction.
     * @param {'up'|'down'|'left'|'right'} direction
     * @returns {{ moved: boolean, mergedPositions: [row,col][] }}
     */
    slide(direction) {
        // Deep-copy current grid for comparison
        const oldGrid = this.grid.map(r => [...r]);
        const oldScore = this.score;

        let newGrid;
        switch (direction) {
            case 'left':  newGrid = this._slideLeft(this.grid); break;
            case 'right': newGrid = this._slideRight(this.grid); break;
            case 'up':    newGrid = this._slideUp(this.grid); break;
            case 'down':  newGrid = this._slideDown(this.grid); break;
            default: return { moved: false, mergedPositions: [] };
        }

        // Nothing changed — don't count this as a move
        if (this._gridsEqual(oldGrid, newGrid)) {
            this.moved = false;
            return { moved: false, mergedPositions: [] };
        }

        // Save state BEFORE applying (undo needs previous state)
        this._pushUndo(oldGrid, oldScore);

        // Detect merged cells for animation
        const mergedPositions = this._findMerges(oldGrid, newGrid);

        this.grid = newGrid;
        this.moved = true;

        this.addRandomTile();
        return { moved: true, mergedPositions };
    }

    /**
     * Undo the last move. Returns true if undo was performed.
     */
    undo() {
        if (this.undoStack.length === 0) return false;
        const prev = this.undoStack.pop();
        this.grid = prev.grid;
        this.score = prev.score;
        this.won = false;
        this.keepPlaying = false;
        return true;
    }

    /** Can the player make any move? */
    canMove() {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) return true;
                if (c < this.size - 1 && this.grid[r][c] === this.grid[r][c + 1]) return true;
                if (r < this.size - 1 && this.grid[r][c] === this.grid[r + 1][c]) return true;
            }
        }
        return false;
    }

    /** Has the player reached the target? */
    hasWon() {
        const target = this.getTargetScore();
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] >= target) return true;
            }
        }
        return false;
    }

    /** Is the board full with no valid moves? */
    hasLost() {
        return !this.canMove();
    }

    /**
     * Change grid size and reset.
     * @param {number} newSize
     */
    setSize(newSize) {
        this.size = newSize;
        this.init();
    }

    /**
     * Spawn a random tile (2 with 90 %, 4 with 10 %) in an empty cell.
     */
    addRandomTile() {
        const empty = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) empty.push([r, c]);
            }
        }
        if (empty.length === 0) return;
        const [r, c] = empty[Math.floor(Math.random() * empty.length)];
        this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }

    /* ------------------------------------------------------------------ */
    /*  Sliding logic                                                      */
    /* ------------------------------------------------------------------ */

    /** Slide one row to the left, merging equal adjacent tiles. */
    _slideRow(row) {
        let arr = row.filter(v => v !== 0);
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2;
                this.score += arr[i];
                arr[i + 1] = 0;
            }
        }
        arr = arr.filter(v => v !== 0);
        while (arr.length < this.size) arr.push(0);
        return arr;
    }

    _slideLeft(grid) {
        return grid.map(row => this._slideRow(row));
    }

    _slideRight(grid) {
        return grid.map(row => {
            const rev = [...row].reverse();
            const slid = this._slideRow(rev);
            return slid.reverse();
        });
    }

    _slideUp(grid) {
        const transposed = this._transpose(grid);
        const slid = transposed.map(row => this._slideRow(row));
        return this._transpose(slid);
    }

    _slideDown(grid) {
        const transposed = this._transpose(grid);
        const slid = transposed.map(row => {
            const rev = [...row].reverse();
            const s = this._slideRow(rev);
            return s.reverse();
        });
        return this._transpose(slid);
    }

    _transpose(grid) {
        return grid[0].map((_, c) => grid.map(row => row[c]));
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    _gridsEqual(a, b) {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (a[r][c] !== b[r][c]) return false;
            }
        }
        return true;
    }

    /**
     * Find cells where a merge happened (value > old value and old value > 0).
     */
    _findMerges(oldGrid, newGrid) {
        const merges = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (oldGrid[r][c] > 0 && newGrid[r][c] > oldGrid[r][c]) {
                    merges.push([r, c]);
                }
            }
        }
        return merges;
    }

    /** Push current state onto undo stack, maintaining max depth. */
    _pushUndo(grid, score) {
        this.undoStack.push({
            grid: grid.map(r => [...r]),
            score
        });
        if (this.undoStack.length > 10) {
            this.undoStack.shift();
        }
    }

    /**
     * Return a flat list of tiles for rendering.
     * Each tile: { row, col, value, isNew, isMerged }
     */
    getTiles(newPositions = [], mergedPositions = []) {
        const newSet = new Set(newPositions.map(p => `${p[0]},${p[1]}`));
        const mergedSet = new Set(mergedPositions.map(p => `${p[0]},${p[1]}`));
        const tiles = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] !== 0) {
                    tiles.push({
                        row: r,
                        col: c,
                        value: this.grid[r][c],
                        isNew: newSet.has(`${r},${c}`),
                        isMerged: mergedSet.has(`${r},${c}`)
                    });
                }
            }
        }
        return tiles;
    }
    /* ---- persistence ---- */

    toSaveData() {
        return {
            grid: this.grid.map(r => [...r]),
            score: this.score,
            undoStack: this.undoStack.map(e => ({
                grid: e.grid.map(r => [...r]), score: e.score
            })),
            won: this.won,
            keepPlaying: this.keepPlaying,
            size: this.size
        };
    }

    static fromSaveData(data) {
        const engine = new GameEngine(data.size);
        engine.grid = data.grid.map(r => [...r]);
        engine.score = data.score;
        engine.undoStack = data.undoStack.map(e => ({
            grid: e.grid.map(r => [...r]), score: e.score
        }));
        engine.won = data.won;
        engine.keepPlaying = data.keepPlaying;
        return engine;
    }
}
