import express from 'express';
import { join } from 'node:path';
import cors from 'cors';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { promisify } from 'node:util';

const app = express();
app.use(cors());
app.use(express.json());

const execFileAsync = promisify(execFile);
const ytDlpBinary = join(
  process.cwd(),
  'node_modules',
  'youtube-dl-exec',
  'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
);

let ytDlpUpdate: Promise<void> | undefined;

type YtDlpOptions = {
  audioFormat?: string;
  dumpJson?: boolean;
  extractAudio?: boolean;
  format?: string;
  mergeOutputFormat?: string;
  output?: string;
  remuxVideo?: string;
};

type JobStatus = 'processing' | 'done' | 'error' | 'cancelled';
type DownloadJob = {
  status: JobStatus;
  error?: string;
  filename?: string;
  progress?: number;
  speed?: string;
  stage?: string;
  process?: ChildProcessWithoutNullStreams;
  cancelled?: boolean;
};

function createYtDlpArguments(url: string, options: YtDlpOptions = {}): string[] {
  const args = [url, '--no-warnings'];
  if (options.dumpJson) args.push('--dump-json');
  if (options.format) args.push('--format', options.format);
  if (options.extractAudio) args.push('--extract-audio');
  if (options.audioFormat) args.push('--audio-format', options.audioFormat);
  if (options.remuxVideo) args.push('--remux-video', options.remuxVideo);
  if (options.mergeOutputFormat) args.push('--merge-output-format', options.mergeOutputFormat);
  if (options.output) args.push('--output', options.output);
  return args;
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/video is unavailable|private video/i.test(message)) return 'Videoclipul este indisponibil sau privat.';
  if (/sign in to confirm your age|age-restricted/i.test(message)) return 'Videoclipul necesită autentificare din cauza restricției de vârstă.';
  if (/HTTP Error 403/i.test(message)) return 'YouTube a refuzat temporar descărcarea. Reîncearcă peste câteva momente.';
  if (/ffmpeg/i.test(message)) return 'Nu s-a putut combina audio și video. Verifică instalarea FFmpeg.';
  if (/ENOSPC|no space left/i.test(message)) return 'NUC-ul nu mai are spațiu suficient pentru descărcare.';
  if (/network|connection|timed out|ENET/i.test(message)) return 'Nu s-a putut contacta YouTube. Verifică conexiunea la internet și reîncearcă.';
  return 'Descărcarea nu a putut fi finalizată. Verifică jurnalul addonului pentru detalii.';
}

async function runYtDlp(url: string, options: YtDlpOptions = {}): Promise<string> {
  const { stdout } = await execFileAsync(ytDlpBinary, createYtDlpArguments(url, options), {
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  return stdout;
}

function updateProgress(job: DownloadJob, output: string): void {
  const percent = output.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
  if (percent) job.progress = Math.min(100, Number(percent[1]));
  const speed = output.match(/\bat\s+(.+?)\s+ETA\b/);
  if (speed && !/Unknown/i.test(speed[1])) job.speed = speed[1].trim();
  if (/Merger|Merging formats|Extracting audio/i.test(output)) job.stage = 'Se combină audio și video…';
  else if (percent) job.stage = 'Se descarcă…';
}

function runDownload(url: string, options: YtDlpOptions, job: DownloadJob): Promise<void> {
  const args = [...createYtDlpArguments(url, options), '--newline'];
  job.stage = 'Se pregătește descărcarea…';

  return new Promise((resolve, reject) => {
    if (job.cancelled) return reject(new Error('Download cancelled'));
    const child = spawn(ytDlpBinary, args, { detached: process.platform !== 'win32' });
    job.process = child;
    let output = '';
    const capture = (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      updateProgress(job, text);
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.once('error', reject);
    child.once('close', (code) => {
      job.process = undefined;
      if (job.cancelled) return reject(new Error('Download cancelled'));
      if (code === 0) return resolve();
      reject(new Error(output || `yt-dlp exited with code ${code}`));
    });
  });
}

async function terminateDownloadProcess(child: ChildProcessWithoutNullStreams | undefined): Promise<void> {
  if (!child?.pid) return;
  try {
    // The detached process has its own group, which includes its FFmpeg child.
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    try { child.kill('SIGTERM'); } catch { /* Process already stopped. */ }
  }
}

async function updateYtDlp(): Promise<void> {
  if (!fs.existsSync(ytDlpBinary)) return;

  try {
    const { stdout } = await execFileAsync(ytDlpBinary, ['-U'], {
      timeout: 120_000,
      windowsHide: true,
    });
    console.log(`yt-dlp update check: ${stdout.trim()}`);
  } catch (error) {
    // The add-on remains available even if GitHub cannot be reached at startup.
    console.warn('yt-dlp update check skipped:', error instanceof Error ? error.message : error);
  }
}

function updateYtDlpOnce(): Promise<void> {
  ytDlpUpdate ??= updateYtDlp();
  return ytDlpUpdate;
}

async function downloadWithRecovery(url: string, options: YtDlpOptions, job: DownloadJob): Promise<void> {
  try {
    await runDownload(url, options, job);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (job.cancelled || !message.includes('HTTP Error 403')) throw error;

    // YouTube changes its delivery API regularly. Update the extractor once,
    // then retry the original request before exposing an error to the user.
    await updateYtDlpOnce();
    job.stage = 'Actualizare yt-dlp și reîncercare…';
    await runDownload(url, options, job);
  }
}

void updateYtDlpOnce();

// Setăm un folder temporar pe NUC (un container Docker mapat) pentru preluarea formatelor
const tempDir = join(process.cwd(), 'temp_downloads');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

function removeJobFiles(fileId: string): void {
  for (const file of fs.readdirSync(tempDir)) {
    if (file === `${fileId}.mp4` || file === `${fileId}.mp3` || file.startsWith(`${fileId}.`)) {
      try { fs.unlinkSync(join(tempDir, file)); } catch { /* best-effort cleanup */ }
    }
  }
}

function cleanupTempFiles(): void {
  const now = Date.now();
  for (const file of fs.readdirSync(tempDir)) {
    try {
      const filePath = join(tempDir, file);
      const age = now - fs.statSync(filePath).mtimeMs;
      const maxAge = file.endsWith('.part') ? 15 * 60_000 : 60 * 60_000;
      if (age > maxAge) fs.unlinkSync(filePath);
    } catch { /* A simultaneous download may remove a file first. */ }
  }
}

cleanupTempFiles();
setInterval(cleanupTempFiles, 10 * 60_000);

app.get('/api/info', async (req, res) => {
  const url = req.query['url'] as string;
  if (!url) {
    res.status(400).json({ error: 'Invalid or missing YouTube URL' });
    return;
  }
  
  try {
    const info: any = JSON.parse(await runYtDlp(url, { dumpJson: true }));
    
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
    res.status(500).json({ error: friendlyError(error) });
  }
});

// Stocăm task-urile de descărcare
const activeJobs = new Map<string, DownloadJob>();

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
  const job: DownloadJob = { status: 'processing', progress: 0, stage: 'În așteptare…' };
  activeJobs.set(fileId, job);
  
  const processDownload = async () => {
    try {
      const info: any = JSON.parse(await runYtDlp(url, { dumpJson: true }));
      const title = (info.title || 'video').replace(/[^\w\s-]/gi, '_');
      if (job.cancelled) {
        job.status = 'cancelled';
        job.stage = 'Descărcare anulată.';
        removeJobFiles(fileId);
        return;
      }
      
      let filename = '';
      let options: YtDlpOptions = {};

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

      await downloadWithRecovery(url, options, job);

      if (job.cancelled) {
        job.status = 'cancelled';
        job.stage = 'Descărcare anulată.';
        removeJobFiles(fileId);
        return;
      }

      job.status = 'done';
      job.filename = filename;
      job.progress = 100;
      job.stage = 'Gata pentru transfer.';
    } catch (error: any) {
      console.error("BACKGROUND JOB ERROR:", error);
      removeJobFiles(fileId);
      if (job.cancelled) {
        job.status = 'cancelled';
        job.stage = 'Descărcare anulată.';
      } else {
        job.status = 'error';
        job.error = friendlyError(error);
      }
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
  const { process: _process, cancelled: _cancelled, ...publicJob } = job;
  res.json(publicJob);
});

app.post('/api/cancel', async (req, res) => {
  const id = req.query['id'] as string;
  const job = activeJobs.get(id);
  if (!job) return res.status(404).json({ error: 'Descărcarea nu a fost găsită.' });
  if (job.status !== 'processing') return res.status(409).json({ error: 'Descărcarea nu mai poate fi anulată.' });

  job.cancelled = true;
  job.stage = 'Se anulează descărcarea…';
  await terminateDownloadProcess(job.process);
  removeJobFiles(id);
  job.status = 'cancelled';
  job.stage = 'Descărcare anulată.';
  res.json({ ok: true });
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
