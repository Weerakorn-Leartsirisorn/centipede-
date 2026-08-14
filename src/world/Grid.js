import { COLS, ROWS } from '../game/constants.js';

export class Grid {
  constructor() {
    this.mushrooms = new Map();
  }

  key(col, row) {
    return `${col},${row}`;
  }

  inBounds(col, row) {
    return col >= 0 && col < COLS && row >= 0 && row < ROWS;
  }

  get(col, row) {
    return this.mushrooms.get(this.key(col, row));
  }

  set(col, row, mushroom) {
    this.mushrooms.set(this.key(col, row), mushroom);
  }

  remove(col, row) {
    this.mushrooms.delete(this.key(col, row));
  }

  blocked(col, row) {
    return !this.inBounds(col, row) || Boolean(this.get(col, row));
  }

  clear() {
    this.mushrooms.clear();
  }

  countInBand(rowStart, rowEnd) {
    let n = 0;
    for (const m of this.mushrooms.values()) {
      if (m.row >= rowStart && m.row <= rowEnd) n += 1;
    }
    return n;
  }

  occupiedCells() {
    return this.mushrooms;
  }
}
