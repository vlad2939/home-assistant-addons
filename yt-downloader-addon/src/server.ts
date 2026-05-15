import express from 'express';
import { join } from 'node:path';
import youtubedl from 'youtube-dl-exec';
import cors from 'cors';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const app = express();
app.use(cors());
app.use(express.json());

// Setăm un folder temporar pe NUC (un container Docker mapat) pentru preluarea formatelor
const tempDir = join(process.cwd(), 'temp_downloads');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Curățare fișiere orfane o dată la 10 minute (ex: dacă procesul se întrerupe sau utilizatorul închide tab-ul)
setInterval(() => {
    fs.readdir(tempDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        files.forEach(f => {
            const filePath = join(tempDir, f);
            fs.stat(filePath, (e, stats) => {
                if (!e && (now - stats.mtimeMs > 3600000)) { // 1 oră
                    fs.unlink(filePath, () => {});
                }
            });
        });
    });
}, 600000);

app.get('/api/info', async (req, res) => {
  const url = req.query['url'] as string;
  if (!url) {
    res.status(400).json({ error: 'Invalid or missing YouTube URL' });
    return;
  }
  
  try {
    const info: any = await youtubedl(url, { dumpJson: true, noWarnings: true });
    
    // Obținem DOAR înălțimile video disponibile pentru selecție clară (ex: 1080, 2160)
    const heights = new Set<number>();
    info.formats?.forEach((f: any) => {
        if (f.height && f.height > 480) heights.add(f.height);
    });
    // Sortate descrescător
    const resolutions = Array.from(heights).sort((a, b) => b - a);

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration_string || info.duration,
      resolutions: resolutions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stocăm task-urile de descărcare
const activeJobs = new Map<string, { status: string, error?: string, filename?: string }>();

// Ruta care inițiază descărcarea și muxarea pe server
app.get('/api/prepare', (req, res) => {
  const url = req.query['url'] as string;
  const height = req.query['height'] as string || '1080';
  const type = req.query['type'] as string || 'video_audio';
  
  if (!url) {
    res.status(400).send({ error: 'Invalid or missing YouTube URL' });
    return;
  }

  const fileId = randomUUID();
  activeJobs.set(fileId, { status: 'processing' });
  
  const processDownload = async () => {
    try {
      const info: any = await youtubedl(url, { dumpJson: true, noWarnings: true });
      const title = (info.title || 'video').replace(/[^\w\s-]/gi, '_');
      
      let filename = '';
      let options: any = { noWarnings: true };

      if (type === 'audio_only') {
          filename = `${title}_audio.mp3`;
          options.extractAudio = true;
          options.audioFormat = 'mp3';
          options.output = join(tempDir, `${fileId}.%(ext)s`);
      } else if (type === 'video_only') {
          filename = `${title}_${height}p_video.mp4`;
          options.format = `bestvideo[height<=${height}]/bestvideo/best`;
          options.remuxVideo = 'mp4';
          options.output = join(tempDir, `${fileId}.%(ext)s`);
      } else {
          filename = `${title}_${height}p.mp4`;
          options.format = `bestvideo[height<=${height}]+bestaudio/best`;
          options.mergeOutputFormat = 'mp4';
          options.output = join(tempDir, `${fileId}.mp4`);
      }

      await youtubedl(url, options);

      activeJobs.set(fileId, { status: 'done', filename });
    } catch (error: any) {
      console.error("BACKGROUND JOB ERROR:", error);
      activeJobs.set(fileId, { status: 'error', error: error.message || String(error) });
    }
  };

  // Pornește în background
  processDownload();

  res.json({ id: fileId });
});

// Ruta pentru a verifica statusul
app.get('/api/status', (req, res) => {
  const id = req.query['id'] as string;
  const job = activeJobs.get(id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Ruta de transmitere a fișierului rezultat
app.get('/api/file', (req, res) => {
    const id = req.query['id'] as string;
    let filename = req.query['filename'] as string || 'video.mp4';
    if (!id) return res.status(400).send('Missing file id');

    let filePath = join(tempDir, `${id}.mp4`);
    if (filename.endsWith('.mp3')) {
        filePath = join(tempDir, `${id}.mp3`);
    } else {
        if (!filename.endsWith('.mp4')) filename += '.mp4';
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Fișierul nu există sau descărcarea a expirat.');
    }

    res.download(filePath, filename, (err) => {
        // Ștergem fișierul temporar de pe SSD după ce utilizatorul l-a transferat complet (sau dacă se anulează transferul)
        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) {}
        }
    });
});

/**
 * Serve static files from /public for the classic HTML structure
 */
const publicFolder = join(process.cwd(), 'public');
app.use(express.static(publicFolder));

app.get('/README.md', (req, res) => {
    res.sendFile(join(process.cwd(), 'README.md'));
});

/**
 * Start the server
 */
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
});
