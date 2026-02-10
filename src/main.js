import './styles/main.css';
import { App } from './modules/App.js';

// Expose APP to window for debugging or legacy callbacks (if any)
window.APP = new App();

window.onload = () => {
    window.APP.init();
};
