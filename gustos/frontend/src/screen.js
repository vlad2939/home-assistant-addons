// Ecran complet (inclusiv pornirea direct în ecran complet) și ecranul mereu aprins.

const START_KEY = "gustos-fullscreen-start";

export const fullscreenSupported = () => Boolean(document.documentElement.requestFullscreen);

export function enterFullscreen() {
  if (document.fullscreenElement || !fullscreenSupported()) return Promise.resolve(false);
  return document.documentElement.requestFullscreen().then(
    () => true,
    () => false,
  );
}

export function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

// Setarea „Pornește în ecran complet” ține de dispozitiv (pe tabletă da, pe PC poate nu),
// deci se păstrează în browser, nu pe server.
export function getFullscreenAtStart() {
  try {
    return localStorage.getItem(START_KEY) === "1";
  } catch {
    return false;
  }
}

export function setFullscreenAtStart(on) {
  try {
    if (on) localStorage.setItem(START_KEY, "1");
    else localStorage.removeItem(START_KEY);
  } catch {
    // fără stocare locală setarea nu se poate păstra
  }
}

/**
 * Browserele permit ecranul complet doar după o acțiune a utilizatorului,
 * așa că aplicația intră în ecran complet la prima atingere, click sau tastă.
 * Returnează funcția de anulare.
 */
export function armFullscreenAtStart() {
  if (!getFullscreenAtStart() || !fullscreenSupported()) return () => {};
  const go = (e) => {
    if (e.type === "keydown" && (e.key === "Escape" || ["Control", "Alt", "Shift", "Meta", "F11"].includes(e.key))) return;
    cleanup();
    enterFullscreen();
  };
  const cleanup = () => {
    document.removeEventListener("click", go, true);
    document.removeEventListener("keydown", go, true);
  };
  document.addEventListener("click", go, true);
  document.addEventListener("keydown", go, true);
  return cleanup;
}

// Ecran mereu aprins: Wake Lock API unde browserul îl permite (HTTPS / localhost);
// altfel (de ex. pe http://hass:8099) tehnica „NoSleep”: un clip video mut, negru, care rulează
// în buclă într-un colț al paginii. Cât timp pagina redă un clip, telefonul / tableta nu stinge ecranul.
// Clipurile din public/ (2 KB) sunt făcute cu ffmpeg: 64×64 negru, 4 s, fără sunet.
let lock = null;
let video = null;
let wanted = false;

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return false;
  try {
    const granted = await navigator.wakeLock.request("screen");
    // între timp modul a fost închis sau există deja o cerere activă
    if (!wanted || (lock && !lock.released)) granted.release().catch(() => {});
    else lock = granted;
    return true;
  } catch {
    return false; // ex. permisiune refuzată
  }
}

function playKeepAwakeVideo() {
  if (!video) {
    video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.style.cssText = "position:fixed;right:0;bottom:0;width:32px;height:32px;opacity:0.01;pointer-events:none;z-index:60";
    for (const [src, type] of [
      ["/keep-awake.webm", "video/webm"],
      ["/keep-awake.mp4", "video/mp4"],
    ]) {
      const source = document.createElement("source");
      source.src = src;
      source.type = type;
      video.appendChild(source);
    }
  }
  if (!video.isConnected) document.body.appendChild(video);
  return video.play().then(
    () => true,
    () => false,
  );
}

async function acquire() {
  return (await requestWakeLock()) || (await playKeepAwakeVideo());
}

function onVisibility() {
  // ecranul se „eliberează” când tab-ul e ascuns; la revenire se cere din nou
  if (!wanted || document.visibilityState !== "visible") return;
  if (video?.isConnected) video.play().catch(() => {});
  else if (!lock || lock.released) acquire();
}

/** De apelat imediat după o atingere / un click. Returnează true dacă ecranul rămâne aprins. */
export async function keepScreenOn() {
  wanted = true;
  document.addEventListener("visibilitychange", onVisibility);
  return acquire();
}

export function releaseScreen() {
  wanted = false;
  document.removeEventListener("visibilitychange", onVisibility);
  lock?.release().catch(() => {});
  lock = null;
  if (video) {
    video.pause();
    video.remove();
  }
}
