import { useEffect, useState } from "react";
import { ExternalLink, Play, Video } from "lucide-react";
import { embedUrl, parseVideo, siteLabel, thumbnailUrl } from "../video.js";

/**
 * Clipul rețetei. Playerul YouTube / Vimeo se încarcă abia la apăsare, ca pagina să se deschidă
 * repede; până atunci se vede doar imaginea clipului. Celelalte site-uri au doar link.
 */
export default function RecipeVideo({ url, title }) {
  const video = parseVideo(url);
  const [playing, setPlaying] = useState(false);
  useEffect(() => setPlaying(false), [url]);
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
          Deschide pe {site} <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>

      {embed ? (
        <div className="relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-2xl bg-black">
          {playing ? (
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
