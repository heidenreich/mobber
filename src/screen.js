// The page's canvas and buttons, and where the picture sits on screen.
import { W, H, isTouch } from "./config.js";

export const cv = document.getElementById("c");
export const ctx = cv.getContext("2d");
export const fireBtn = document.getElementById("fire");
export const swapBtn = document.getElementById("swap");

// film: where the 3D picture is drawn. cardRect: where title cards go.
// hudRect: the area the health/ammo bar is laid out in.
export const view = {
  vw: 0, vh: 0, dpr: 1, portrait: false,
  film: { x: 0, y: 0, w: 0, h: 0, s: 1 },
  cardRect: { x: 0, y: 0, w: 0, h: 0, s: 1 },
  hudRect: { x: 0, y: 0, w: 0, h: 0, s: 1 },
};

export function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.vw = window.innerWidth; view.vh = window.innerHeight;
  const { vw, vh } = view;
  cv.width = vw * view.dpr; cv.height = vh * view.dpr;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  // Letterboxed 16:9 frame, like a projected reel
  const fit = Math.min(vw / W, vh / H);
  view.cardRect = { w: W * fit, h: H * fit, x: (vw - W * fit) / 2, y: (vh - H * fit) / 2, s: fit };
  view.portrait = isTouch && vh > vw;
  if (view.portrait) {
    // Held upright: a bigger picture across the top (sides cropped), HUD under it, thumbs below
    const s = Math.min(vh * 0.42 / H, vw * 1.7 / W);
    view.film = { w: W * s, h: H * s, x: (vw - W * s) / 2, y: Math.max(10, vh * 0.05), s };
    // The picture is small here, so the bar under it is laid out at full size to stay readable
    const hs = Math.max(s, 1);
    view.hudRect = { x: 0, y: view.film.y, w: vw, h: view.film.h + 40 * hs, s: hs };
  } else {
    view.film = view.cardRect; view.hudRect = view.film;
  }
  // Phone buttons sit just above the health/ammo bar so they never cover it
  const lift = view.portrait ? 26 : Math.round(vh - (view.film.y + view.film.h) + 40 * view.film.s + 8);
  fireBtn.style.bottom = lift + "px";
  swapBtn.style.bottom = lift + 4 + "px";
}

export function watchScreen() {
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => { resize(); setTimeout(resize, 250); setTimeout(resize, 800); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);
  resize();
}

// Some phones report a new size late after rotating; the frame loop calls this every frame.
export function resizeIfChanged() {
  if (window.innerWidth !== view.vw || window.innerHeight !== view.vh) resize();
}
