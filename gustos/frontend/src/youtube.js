// Playerul YouTube prin interfața oficială (IFrame Player API), încărcată o singură dată, la primul clip.
// Spre deosebire de un simplu iframe, aflăm când YouTube refuză redarea și putem explica de ce.
// Exemplu real: pe tabletă (Android), clipurile cu promovare plătită ale unor autori dau codul 150 –
// autorul nu permite redarea în afara YouTube pe dispozitive mobile; pe PC același clip merge.

let loading = null;

export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("YouTube nu răspunde."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Mesajul pentru codurile de eroare ale playerului YouTube. */
export function youtubeErrorMessage(code) {
  if (code === 100) return "Clipul nu mai există pe YouTube.";
  if (code === 101 || code === 150)
    return "Autorul clipului nu permite redarea lui în afara YouTube pe acest dispozitiv. Pe PC și laptop clipul merge în Gustos.";
  if (code === "load") return "Playerul YouTube nu s-a putut încărca. Verifică legătura la internet.";
  return "YouTube nu a putut reda clipul aici.";
}
