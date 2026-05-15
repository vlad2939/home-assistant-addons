document.addEventListener('DOMContentLoaded', () => {
  // Theme logic
  const htmlEl = document.documentElement;
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  
  const updateThemeIcon = () => {
    if (htmlEl.classList.contains('dark')) {
      themeIcon.textContent = 'light_mode';
    } else {
      themeIcon.textContent = 'dark_mode';
    }
  };

  themeToggleBtn.addEventListener('click', () => {
    htmlEl.classList.toggle('dark');
    updateThemeIcon();
  });
  updateThemeIcon(); // init

  // Element Refs
  const urlInput = document.getElementById('urlInput');
  const searchBtn = document.getElementById('searchBtn');
  const searchBtnText = document.getElementById('searchBtnText');
  const searchBtnIcon = document.getElementById('searchBtnIcon');
  
  const errorContainer = document.getElementById('errorContainer');
  const errorText = document.getElementById('errorText');
  
  const videoInfoContainer = document.getElementById('videoInfoContainer');
  const videoThumb = document.getElementById('videoThumb');
  const videoTitle = document.getElementById('videoTitle');
  const formatsGrid = document.getElementById('formatsGrid');

  let isLoading = false;
  let currentUrl = '';

  const setLoading = (loading) => {
    isLoading = loading;
    if (loading) {
      searchBtn.disabled = true;
      urlInput.disabled = true;
      searchBtnText.textContent = 'Procesare...';
      searchBtnIcon.classList.remove('hidden');
    } else {
      searchBtn.disabled = false;
      urlInput.disabled = false;
      searchBtnText.textContent = 'Caută';
      searchBtnIcon.classList.add('hidden');
    }
  };

  const showError = (msg) => {
    errorContainer.classList.remove('hidden');
    errorContainer.classList.add('flex');
    errorText.textContent = msg;
    videoInfoContainer.classList.add('hidden');
    videoInfoContainer.classList.remove('grid');
  };

  const hideError = () => {
    errorContainer.classList.add('hidden');
    errorContainer.classList.remove('flex');
  };

  const fetchInfo = async () => {
    const url = urlInput.value.trim();
    if (!url) {
      showError('Te rog introdu un link de YouTube valid.');
      return;
    }

    currentUrl = url;
    setLoading(true);
    hideError();
    videoInfoContainer.classList.add('hidden');
    videoInfoContainer.classList.remove('grid');

    try {
      const response = await fetch(`./api/info?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nu am putut prelua informațiile videoclipului.');
      }

      renderVideoInfo(data);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Eroare la conectarea cu serverul.');
    } finally {
      setLoading(false);
    }
  };

  const renderVideoInfo = (info) => {
    videoThumb.src = info.thumbnail;
    videoTitle.textContent = info.title;
    
    const videoDuration = document.getElementById('videoDuration');
    if (info.duration) {
      let durationText = info.duration;
      // If it's a number (seconds), format it
      if (!isNaN(durationText)) {
        const totalSeconds = parseInt(durationText, 10);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
          durationText = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
          durationText = `${m}:${s.toString().padStart(2, '0')}`;
        }
      }
      videoDuration.textContent = durationText;
      videoDuration.parentElement.classList.remove('hidden');
      videoDuration.parentElement.classList.add('flex');
    } else {
      videoDuration.parentElement.classList.add('hidden');
      videoDuration.parentElement.classList.remove('flex');
    }

    const resolutions = info.resolutions || [];
    formatsGrid.innerHTML = '';

    const audioBtn = document.createElement('button');
    audioBtn.className = 'col-span-full p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 group shadow-sm transition-all text-left w-full mb-1';
    audioBtn.onclick = () => downloadMuxed('1080', 'audio_only');
    audioBtn.innerHTML = `
        <div class="flex flex-col items-start gap-1">
          <div class="flex items-center gap-2">
            <span class="text-slate-800 dark:text-slate-200 font-bold transition-colors text-base">Extrage Doar Audio</span>
            <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 uppercase tracking-widest">MP3</span>
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-1">
             <span class="material-icons text-[14px]">music_note</span>
             Fișier Audio (.mp3)
          </div>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all flex-shrink-0 shadow-sm border border-slate-200 dark:border-slate-700">
          <span class="material-icons text-[20px]">download</span>
        </div>
    `;
    formatsGrid.appendChild(audioBtn);

    resolutions.forEach(res => {
      const isHighRes = res >= 1440;
      const resContainer = document.createElement('div');
      resContainer.className = 'p-5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col gap-4 shadow-sm text-left w-full transition-all hover:border-slate-300 dark:hover:border-slate-600 border-t-[3px] ' + (isHighRes ? 'border-t-orange-500 dark:border-t-orange-500' : 'border-t-blue-500 dark:border-t-blue-500');

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between mb-1';
      header.innerHTML = `
            <span class="text-slate-800 dark:text-slate-200 font-extrabold text-[1.35rem] tracking-tight">${res}p</span>
            ${isHighRes ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 uppercase tracking-widest">4K/MAX</span>` : ''}
      `;
      resContainer.appendChild(header);

      const btnGrid = document.createElement('div');
      btnGrid.className = 'grid grid-cols-2 gap-2 mt-auto';

      const btnVA = document.createElement('button');
      btnVA.className = 'flex items-center justify-center gap-1 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-[11px] sm:text-xs font-bold transition-all shadow-sm';
      btnVA.innerHTML = `<span class="material-icons text-[14px]">stars</span> Vid+Aud`;
      btnVA.onclick = () => downloadMuxed(res, 'video_audio');

      const btnV = document.createElement('button');
      btnV.className = 'flex items-center justify-center gap-1 p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-950 text-[11px] sm:text-xs font-bold transition-all shadow-sm';
      btnV.innerHTML = `<span class="material-icons text-[14px]">videocam</span> Video`;
      btnV.onclick = () => downloadMuxed(res, 'video_only');

      btnGrid.appendChild(btnVA);
      btnGrid.appendChild(btnV);
      resContainer.appendChild(btnGrid);

      formatsGrid.appendChild(resContainer);
    });

    videoInfoContainer.classList.remove('hidden');
    videoInfoContainer.classList.add('grid');
  };

  const downloadMuxed = async (height, type = 'video_audio') => {
    setLoading(true);

    let typeText = 'Procesare...';
    if (type === 'audio_only') typeText = 'Pregătire MP3...';
    else if (type === 'video_only') typeText = `Pregătire Video ${height}p...`;
    else typeText = `Video+Audio ${height}p...`;

    searchBtnText.textContent = typeText;
    
    try {
      const response = await fetch(`./api/prepare?url=${encodeURIComponent(currentUrl)}&height=${height}&type=${type}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Eroare la inițierea descărcării.');
      }
      
      const fileId = data.id;
      
      const checkStatus = async () => {
          try {
              const statusRes = await fetch(`./api/status?id=${fileId}`);
              const statusData = await statusRes.json();
              
              if (statusData.status === 'processing') {
                  searchBtnText.textContent = `Procesare... (${type === 'audio_only' ? 'MP3' : height + 'p'})`;
                  setTimeout(checkStatus, 3000); // Polling la 3 secunde
              } else if (statusData.status === 'done') {
                  searchBtnText.textContent = 'Transfer browser...';
                  window.location.href = `./api/file?id=${fileId}&filename=${encodeURIComponent(statusData.filename)}`;
                  
                  setTimeout(() => {
                      setLoading(false);
                      searchBtnText.textContent = 'Caută';
                  }, 3000);
              } else if (statusData.status === 'error') {
                  throw new Error(statusData.error || 'Eroare la procesarea internă.');
              }
          } catch (err) {
              console.error(err);
              showError(err.message);
              setLoading(false);
              searchBtnText.textContent = 'Caută';
          }
      };
      
      // Pornim polling-ul
      setTimeout(checkStatus, 3000);
      
    } catch (err) {
      console.error(err);
      showError(err.message);
      setLoading(false);
      searchBtnText.textContent = 'Caută';
    }
  };

  searchBtn.addEventListener('click', fetchInfo);
  urlInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      fetchInfo();
    }
  });

  // Readme Popup Logic
  const readmeBtn = document.getElementById('readmeBtn');
  const readmeModal = document.getElementById('readmeModal');
  const closeReadmeBtn = document.getElementById('closeReadmeBtn');
  const readmeBackdrop = document.getElementById('readmeBackdrop');
  const readmeMarkdownContent = document.getElementById('readmeMarkdownContent');

  const openReadme = async () => {
    readmeModal.classList.remove('hidden');
    readmeModal.classList.add('flex');
    // Enable pointer events
    readmeModal.classList.remove('pointer-events-none');
    
    // Slight delay for animation
    setTimeout(() => {
      readmeModal.classList.remove('opacity-0');
      document.getElementById('readmeContentPanel').classList.remove('scale-95');
      document.getElementById('readmeContentPanel').classList.add('scale-100');
    }, 10);

    // Load README.md
    try {
      const res = await fetch('./README.md');
      if (!res.ok) throw new Error('Nu am putut prelua fisierul README.md');
      const text = await res.text();
      // Parse with marked
      readmeMarkdownContent.innerHTML = marked.parse(text);
    } catch(err) {
      readmeMarkdownContent.innerHTML = '<p class="text-rose-500 font-semibold text-center mt-4">Eroare la încărcarea README.md</p>';
    }
  };

  const closeReadme = () => {
    readmeModal.classList.add('opacity-0');
    document.getElementById('readmeContentPanel').classList.add('scale-95');
    document.getElementById('readmeContentPanel').classList.remove('scale-100');
    readmeModal.classList.add('pointer-events-none');
    setTimeout(() => {
      readmeModal.classList.add('hidden');
      readmeModal.classList.remove('flex');
    }, 300);
  };

  readmeBtn.addEventListener('click', openReadme);
  closeReadmeBtn.addEventListener('click', closeReadme);
  readmeBackdrop.addEventListener('click', closeReadme);
});
