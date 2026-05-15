// Stocare date în memorie extrase din data.json
let store = {
    playlists: [],
    videos: []
};

// Theme si Hamburger Logic
function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
    } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    if (sidebar.classList.contains('-translate-x-[110%]')) {
        // Deschidere sidebar
        sidebar.classList.remove('-translate-x-[110%]');
        overlay.classList.remove('hidden');
        // Mic delay pentru a declanșa animația de fade
        requestAnimationFrame(() => overlay.classList.remove('opacity-0'));
    } else {
        // Închidere sidebar
        sidebar.classList.add('-translate-x-[110%]');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300); // 300ms e durata animației în utilitarul tailwind
    }
}

// Navigare / Stare
let activePlaylistId = null;
let currentSearchQuery = '';

// Încărcare date din data.json + JSON Validator
async function initApp() {
    try {
        const response = await fetch('data.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error('Nu s-a putut încărca fișierul de date');
        
        const rawText = await response.text();
        let data;
        
        // JSON Validator Hook - Prindem excepțiile de sintaxă (virgule, ghilimele lipsă etc.)
        try {
            data = JSON.parse(rawText);
        } catch (parseError) {
            console.error("JSON Parser Error:", parseError);
            return showEmptyState(`
                <strong class="text-white text-lg">Eroare de sintaxă în data.json!</strong><br><br>
                Ai uitat probabil o virgulă, niște ghilimele, sau ai pus o virgulă în plus la ultimul clip din listă.<br>
                <div class="mt-4 bg-red-950/40 p-4 border border-red-500/30 rounded-xl text-left font-mono text-xs text-red-300 overflow-x-auto shadow-inner shadow-red-900/20">
                    Sistemul de securitate raportează:<br>
                    <span class="text-white opacity-80 mt-1 block">${parseError.message}</span>
                </div>
            `);
        }
        
        // Curățare date anterioare
        store.playlists = [];
        store.videos = [];
        
        // Mapare structură JSON în memoria aplicației
        if(data && data.playlists) {
            data.playlists.forEach((pl, i) => {
                const plId = 'pl-id-' + i;
                store.playlists.push({ id: plId, name: pl.title });
                
                if(pl.videos) {
                    pl.videos.forEach((vid, j) => {
                        const yid = parseYT(vid.url);
                        if(yid) {
                            store.videos.push({
                                id: 'vid-' + i + '-' + j,
                                playlistId: plId,
                                playlistName: pl.title, // Info pt label în Search global
                                title: vid.title,
                                url: vid.url,
                                youtubeId: yid,
                                duration: vid.duration || "",
                                thumbnail: `https://img.youtube.com/vi/${yid}/hqdefault.jpg`
                            });
                        }
                    });
                }
            });
        }
        
        renderSidebar();
        if (store.playlists.length > 0) {
            renderPlaylist(store.playlists[0].id);
        } else {
            showEmptyState("Fișierul data.json a fost citit cu succes, dar nu conține playlist-uri.");
        }
        
    } catch(err) {
        console.error("Eroare initializare:", err);
        showEmptyState("Eroare critică! Fișierul <strong>data.json</strong> lipsește sau nu poate fi accesat.");
    }
}

// Afisare mesaj eroare/gol central
function showEmptyState(msg) {
    const main = document.getElementById('app-container');
    main.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[70vh] animate-fade-in text-center max-w-xl mx-auto px-6">
            <div class="w-20 h-20 rounded-full bg-zinc-200 dark:bg-white/5 flex items-center justify-center mb-6 shadow-inner ring-1 ring-zinc-300 dark:ring-white/10 transition-colors duration-300">
                <span class="material-icons text-4xl text-zinc-500">code_off</span>
            </div>
            <p class="text-zinc-600 dark:text-zinc-400 font-medium text-sm leading-relaxed">${msg}</p>
        </div>
    `;
}

// Citire ID videoclip
function parseYT(input) {
    if (!input) return null;
    const cleanInput = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanInput)) return cleanInput;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = cleanInput.match(regex);
    return match ? match[1] : null;
}

// ----- UI CONTROLLERS -----

function renderSidebar() {
    const plDiv = document.getElementById('sidebar-playlists');
    plDiv.innerHTML = '';
    
    store.playlists.forEach(pl => {
        const btn = document.createElement('button');
        // Adăugăm un atribut data pentru manipulare dinamică (aprindere)
        btn.dataset.id = pl.id;
        btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-all group text-[18px] font-medium border border-transparent hover:border-zinc-200/50 dark:hover:border-white/5 shadow-sm hover:shadow-md";
        btn.innerHTML = `<span class="truncate">${pl.name}</span>`;
        btn.onclick = () => renderPlaylist(pl.id);
        plDiv.appendChild(btn);
    });
}

// Gestionează highlight-ul butoanelor din Sidebar (mod listă activă)
function updateSidebarHighlight(selectedId) {
    document.querySelectorAll('#sidebar-playlists button').forEach(btn => {
        if (btn.dataset.id === selectedId) {
            btn.classList.add('bg-white', 'dark:bg-white/10', 'text-orange-600', 'dark:text-orange-400', 'border-zinc-200/50', 'dark:border-white/10', 'shadow-md');
            btn.classList.remove('hover:bg-white/50', 'dark:hover:bg-white/5', 'text-zinc-600', 'dark:text-zinc-400', 'border-transparent', 'shadow-sm');
        } else {
            btn.classList.remove('bg-white', 'dark:bg-white/10', 'text-orange-600', 'dark:text-orange-400', 'border-zinc-200/50', 'dark:border-white/10', 'shadow-md');
            btn.classList.add('hover:bg-white/50', 'dark:hover:bg-white/5', 'text-zinc-600', 'dark:text-zinc-400', 'border-transparent', 'shadow-sm');
        }
    });
}

// Curățare diacritice pentru căutare impecabilă
function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Logică Live Search
function handleGlobalSearch(query) {
    currentSearchQuery = query;
    const q = removeDiacritics(query.trim().toLowerCase());
    
    if (!q) {
        // Dacă a sters cuvântul, revine la Playlistul vizionat anterior
        if (activePlaylistId) renderPlaylist(activePlaylistId);
        else if (store.playlists.length > 0) renderPlaylist(store.playlists[0].id);
        return;
    }
    
    // Anulăm "selecția" din meniul lateral (căci suntem în vizualizare Globală)
    updateSidebarHighlight(null);
    
    // Căutare combinată fără diacritice: și în titlul clipului, dar și în titlul playlistului
    const vids = store.videos.filter(v => 
        removeDiacritics(v.title.toLowerCase()).includes(q) || 
        removeDiacritics(v.playlistName.toLowerCase()).includes(q)
    );
    const main = document.getElementById('app-container');
    
    let html = `
        <div class="w-full max-w-[1400px] flex flex-col mx-auto animate-slide-up pb-16">
            <div class="flex items-end justify-between mb-8 pb-4 border-b border-zinc-200/50 dark:border-white/10 transition-colors duration-300">
                <div class="flex flex-col gap-2">
                    <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white focus:outline-none drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Căutare: "${q}"</h2>
                </div>
                <div class="px-5 py-2 rounded-full bg-white/70 dark:bg-white/10 border border-zinc-300/50 dark:border-white/20 text-orange-600 dark:text-orange-400 text-xs font-bold tracking-wide shadow-sm backdrop-blur-md transition-colors duration-300 ring-1 ring-black/5 dark:ring-white/5 uppercase">${vids.length} găsite</div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">`;
            
    if (vids.length === 0) {
        html += `<div class="col-span-full py-32 text-center text-zinc-500 font-medium text-lg">Nu a fost găsit niciun videoclip conform căutării tale.</div>`;
    } else {
        html += generateVideoGridHtml(vids);
    }
    html += `</div></div>`;
    main.innerHTML = html;
}

// Renderizare unică de Playlist
function renderPlaylist(id) {
    activePlaylistId = id;
    currentSearchQuery = '';
    
    // Golim căsuța de search dacă omul dă click din sidebar direct pe playlist
    const searchInput = document.getElementById('global-search');
    if (searchInput && searchInput.value) searchInput.value = '';

    updateSidebarHighlight(id);
    
    const pl = store.playlists.find(p => p.id === id);
    if(!pl) return;
    
    const vids = store.videos.filter(v => v.playlistId === id);
    const main = document.getElementById('app-container');
    
    let html = `
        <div class="w-full max-w-[1400px] flex flex-col mx-auto animate-slide-up pb-16">
            <div class="flex items-end justify-between mb-8 pb-4 border-b border-zinc-200/50 dark:border-white/10 transition-colors duration-300">
                <div class="flex flex-col gap-2">
                    <h2 class="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white transition-colors duration-300 drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">${pl.name}</h2>
                </div>
                <div class="px-5 py-2 rounded-full bg-white/70 dark:bg-white/10 border border-zinc-300/50 dark:border-white/20 text-orange-600 dark:text-orange-400 text-xs font-bold tracking-wide shadow-sm backdrop-blur-md transition-colors duration-300 ring-1 ring-black/5 dark:ring-white/5 uppercase">${vids.length} clipuri</div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">`;
    
    if(vids.length === 0) {
        html += `<div class="col-span-full py-32 flex flex-col items-center justify-center text-center border border-dashed border-zinc-300 dark:border-white/20 rounded-[2rem] bg-white/30 dark:bg-white/[0.02] backdrop-blur-sm transition-all duration-300">
                    <div class="w-20 h-20 rounded-full bg-white dark:bg-white/5 flex items-center justify-center mb-6 shadow-xl ring-1 ring-zinc-200 dark:ring-white/10 transition-colors duration-300">
                        <span class="material-icons text-4xl text-orange-500">video_library</span>
                    </div>
                    <h3 class="text-xl font-bold text-zinc-900 dark:text-white mb-2 transition-colors duration-300">Acest playlist este gol</h3>
                    <p class="text-zinc-500 dark:text-zinc-400 font-medium max-w-sm text-sm transition-colors duration-300">Adaugă videoclipuri în fișierul <strong>data.json</strong> pentru a popula această colecție.</p>
                 </div>`;
    } else {
        html += generateVideoGridHtml(vids);
    }
    
    html += `</div></div>`;
    main.innerHTML = html;
}

// Generator modular de interfață pentru carduri (Folosit combinat la Search + Liste)
function generateVideoGridHtml(vids) {
    let html = '';
    vids.forEach(v => {
        // Dacă e afișaj global (cautare), arata prin tag în stânga-sus la ce playlist apartine clipul 
        const badgeHtml = currentSearchQuery 
            ? `<span class="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg z-10">${v.playlistName}</span>` 
            : '';

        const durationHtml = v.duration ? `<span class="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-white/90 border border-white/10 shadow-sm z-10">${v.duration}</span>` : '';

        html += `
        <div class="bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/60 dark:border-white/10 flex flex-col rounded-[1.5rem] overflow-hidden group cursor-pointer hover:border-orange-500/50 hover:bg-white/80 dark:hover:bg-white/5 transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:-translate-y-1 hover:shadow-orange-500/10" onclick="playVideo('${v.youtubeId}')">
            <div class="aspect-video relative w-full overflow-hidden p-2 pb-0">
                <div class="w-full h-full relative rounded-t-[1.1rem] overflow-hidden bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse-slow">
                    <img src="${v.thumbnail}" loading="lazy" onload="this.parentElement.classList.remove('animate-pulse-slow'); this.classList.remove('opacity-0'); this.classList.add('opacity-100');" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out opacity-0" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300"></div>
                    ${badgeHtml}
                    ${durationHtml}
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                        <div class="w-14 h-14 rounded-full bg-orange-600/80 flex items-center justify-center backdrop-blur-md border border-orange-400/50 transform scale-75 group-hover:scale-100 transition-all duration-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]">
                             <span class="material-icons text-white text-[28px] translate-x-[2px]">play_arrow</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="p-5 flex flex-1 flex-col justify-start items-start gap-3 relative">
                <h3 class="font-semibold text-sm lg:text-base text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 transition-colors duration-300 group-hover:text-orange-600 dark:group-hover:text-orange-400">${v.title}</h3>
            </div>
        </div>`;
    });
    return html;
}

function playVideo(ytId) {
     const main = document.getElementById('app-container');
     main.innerHTML = `
        <div class="w-full max-w-[1400px] flex flex-col mx-auto h-[85vh] min-h-[500px] animate-slide-up relative z-10 pb-8">
             <button onclick="goBack()" class="self-start flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-6 transition-all px-4 py-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/10 shadow-sm hover:shadow-md text-sm font-semibold border border-transparent hover:border-zinc-300 dark:hover:border-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                 <span class="material-icons text-[18px]">arrow_back</span> Înapoi
             </button>
             <div class="w-full h-full bg-black/80 backdrop-blur-2xl rounded-[2rem] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.6)] border border-white/20 dark:border-white/10 ring-1 ring-white/10 relative group transition-all duration-500 hover:shadow-[0_32px_64px_rgba(249,115,22,0.15)]">
                 <div class="absolute inset-0 flex items-center justify-center bg-black/50 -z-10 animate-pulse">
                     <span class="material-icons text-orange-500/30 text-6xl">smart_display</span>
                 </div>
                 <iframe class="w-full h-full relative z-10" id="yt-player"
                         src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0" 
                         title="YouTube video player" 
                         frameborder="0" 
                         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                         referrerpolicy="strict-origin-when-cross-origin" 
                         allowfullscreen>
                 </iframe>
             </div>
        </div>
     `;
}

// Traseu intors - bulletproof
function goBack() {
     if (currentSearchQuery) {
         handleGlobalSearch(currentSearchQuery);
     } else if (activePlaylistId) {
         renderPlaylist(activePlaylistId);
     } else {
         if (store.playlists.length > 0) renderPlaylist(store.playlists[0].id);
     }
}

// ---- README POPUP ----
function openReadmePopup() {
    const modal = document.getElementById('readme-modal');
    const content = document.getElementById('readme-content');
    const innerModal = document.getElementById('readme-modal-inner');
    
    modal.classList.remove('hidden');
    // Mic tratament pt animatie fluida UI
    requestAnimationFrame(() => {
        innerModal.classList.remove('scale-95', 'opacity-0');
        innerModal.classList.add('scale-100', 'opacity-100');
    });
    
    marked.setOptions({ breaks: true });
    
    fetch('README.md')
        .then(response => response.text())
        .then(text => {
            content.innerHTML = marked.parse(text);
        })
        .catch(err => {
            content.innerHTML = '<p class="text-red-400 text-sm font-medium">Nu se poate încărca fișierul README.md</p>';
        });
}

function closeReadmePopup() {
    const innerModal = document.getElementById('readme-modal-inner');
    const modal = document.getElementById('readme-modal');
    
    innerModal.classList.remove('scale-100', 'opacity-100');
    innerModal.classList.add('scale-95', 'opacity-0');
    
    // Asteapta terminarea tranzitiei (300ms)
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Pornire Aplicație
initApp();
