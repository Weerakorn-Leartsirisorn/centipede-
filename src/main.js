import { Game } from './game/Game.js';

const canvas = document.getElementById('c');
const game = new Game(canvas);
window.game = game;
