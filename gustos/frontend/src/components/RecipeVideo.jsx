import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play, Video } from "lucide-react";
import { embedUrl, parseVideo, siteLabel, thumbnailUrl } from "../video.js";
import { loadYouTubeApi, youtubeErrorMessage } from "../youtube.js";

/** Playerul YouTube oficial; anunță prin onError dacă YouTube refuză redarea (coduri 101 / 150 / 153 …). */
function YouTubePlayer({ id, onError }) {
  const box = useRef(null);
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    let player = null;
    let cancelled = false;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !box.current) return;
        player = new YT.Player(box.current, {
          videoId: id,
          host: "https://www.youtube.com",
          playerVars: { autoplay: 1, rel: 0, playsinline: 1, origin: window.location.origin },
          events: { onError: (e) => errorRef.current(e.data) },
        });
      })
      .catch(() => !cancelled && errorRef.current("load"));
    return () => {
      cancelled = true;
      player?.destroy?.();
    };
  }, [id]);

  // YouTube înlocuiește acest div cu iframe-ul său
  return (
    <div className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full">
      <div ref={box} />
    </div>
  );
}

/**
 * Clipul rețetei. Playerul se încarcă abia la apăsare, ca pagina să se deschidă repede;
 * până atunci se vede doar imaginea clipului. Dacă YouTube nu permite redarea aici
 * (se întâmplă pe tabletă la unele clipuri), se afișează motivul și codul primit de la YouTube.
 */
export default function RecipeVideo({ url, title }) {
  const video = parseVideo(url);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(null);
  useEffect(() => {
    setPlaying(false);
    setFailed(null);
  }, [url]);
  if (!video) return null;

  const embed = embedUrl(video);
  const thumb = thumbnailUrl(video);
  const site = siteLabel(video);
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Video size={22} className="text-accent" aria-hidden="true" /> Video
        </h2>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          Deschide în {site} <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>

      {embed ? (
        <div className="relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-2xl bg-black">
          {failed !== null ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              {thumb && <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
              <p className="relative max-w-md font-medium text-white">{youtubeErrorMessage(failed)}</p>
              <p className="relative text-sm text-white/70">Cod YouTube {String(failed)}</p>
            </div>
          ) : playing && video.kind === "youtube" ? (
            <YouTubePlayer id={video.id} onError={setFailed} />
          ) : playing ? (
            <iframe
              src={embed}
              title={`Video: ${title}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label="Pornește clipul">
              {thumb && <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover opacity-90" />}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-on-accent shadow-card transition-transform group-hover:scale-110">
                  <Play size={36} fill="currentColor" className="ml-1" aria-hidden="true" />
                </span>
              </span>
            </button>
          )}
        </div>
      ) : (
        <p className="text-muted">Clipul este pe {site} și se deschide într-o filă nouă.</p>
      )}
    </section>
  );
}
