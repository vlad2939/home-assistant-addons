const DB_KEY = 'mytube_vanilla_db';

// Baza de date inițială (LocalStorage)
let store = {
    playlists: [{id: 'gen-1', name: 'General'}],
    videos: []
};

// Încărcare date
function loadData() {
    try {
        const saved = localStorage.getItem(DB_KEY);
        if(saved) {
            store = JSON.parse(saved);
        }
    } catch(e) {
        console.error("Eroare parsare LocalStorage", e);
    }
}

// Salvare date
function save() {
    localStorage.setItem(DB_KEY, JSON.stringify(store));
    renderSidebar();
}

// Generare ID Unic
function genId() {
    return Math.random().toString(36).substr(2, 9);
}

// Citire ID videoclip din orice format (URL, iframe, sau doar id-ul)
function parseYT(input) {
    if (!input) return null;
    const cleanInput = input.trim();
    // Dacă a introdus exact cele 11 caractere ale ID-ului
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanInput)) return cleanInput;
    // Extras din orice tip de URL sau iFrame (embed, watch, youtu.be, etc)
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
        btn.className = "w-full flex items-center gap-3 p-2 rounded text-zinc-400 hover:bg-zinc-800 hover:text-white transition group text-sm font-medium";
        btn.innerHTML = `<span class="material-icons text-[18px]">folder_special</span> <span class="truncate">${pl.name}</span>`;
        btn.onclick = () => renderPlaylist(pl.id);
        plDiv.appendChild(btn);
    });
}

function renderHome() {
    renderSettings();
}

function renderPlaylist(id) {
    const pl = store.playlists.find(p => p.id === id);
    if(!pl) return;
    
    const vids = store.videos.filter(v => v.playlistId === id);
    const main = document.getElementById('app-content');
    
    let html = `
        <div class="w-full max-w-[1400px] flex flex-col">
            <div class="flex items-center justify-between mb-8">
                <h2 class="text-3xl font-bold tracking-tight">${pl.name}</h2>
                <span class="text-zinc-500 text-sm font-medium">${vids.length} videoclipuri</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">`;
    
    if(vids.length === 0) {
        html += `<div class="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                    <p class="text-zinc-500 mb-4">Acest playlist este gol.</p>
                    <button onclick="renderSettings()" class="text-red-500 hover:text-red-400 font-medium">Adaugă Videoclip</button>
                 </div>`;
    } else {
        vids.forEach(v => {
            html += `
            <div class="bg-zinc-900 border border-zinc-800 flex flex-col rounded-xl overflow-hidden group cursor-pointer hover:border-zinc-500 transition shadow-sm" onclick="playVideo('${v.youtubeId}', '${pl.id}')">
                <div class="aspect-video relative bg-black w-full">
                    <img src="${v.thumbnail}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div class="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition duration-300 flex items-center justify-center">
                        <span class="material-icons text-white text-5xl opacity-0 group-hover:opacity-100 transition duration-300 drop-shadow-lg">play_circle_filled</span>
                    </div>
                </div>
                <div class="p-4 flex flex-1 flex-col justify-between items-start gap-2">
                    <h3 class="font-semibold text-sm text-zinc-100 leading-snug line-clamp-2">${v.title}</h3>
                    <button onclick="deleteVideo(event, '${v.id}')" class="text-xs text-zinc-500 hover:text-red-500 transition mt-1"><span class="material-icons text-[16px] align-middle">delete</span> Elimină</button>
                </div>
            </div>`;
        });
    }
    
    html += `</div></div>`;
    main.innerHTML = html;
}

function playVideo(ytId, plId) {
     const main = document.getElementById('app-content');
     main.innerHTML = `
        <div class="w-full max-w-[1200px] flex flex-col mx-auto mt-4 h-[80vh] min-h-[500px]">
             <button onclick="renderPlaylist('${plId}')" class="self-start flex items-center justify-center gap-2 text-zinc-400 hover:text-white mb-6 transition px-2 py-1 rounded hover:bg-zinc-800">
                 <span class="material-icons text-lg">arrow_back</span> Înapoi
             </button>
             <div class="w-full h-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
                 <iframe class="w-full h-full" 
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

function renderSettings() {
    const main = document.getElementById('app-content');
    
    // Generare optiuni playlist (Fara innerHTML din Array for loop ca sa evitam erori)
    let plOptions = '';
    store.playlists.forEach(p => { plOptions += `<option value="${p.id}">${p.name}</option>`});

    // Construire listă playlist-uri active
    let plActives = '';
    store.playlists.forEach(p => { 
        plActives += `<div class="flex justify-between items-center p-2 hover:bg-zinc-800 rounded">
            <span class="text-sm font-medium text-zinc-300">${p.name}</span>
            <button onclick="deletePlaylist('${p.id}')" class="text-zinc-600 hover:text-red-500"><span class="material-icons text-sm">close</span></button>
        </div>`;
    });

    main.innerHTML = `
        <div class="w-full max-w-3xl mx-auto flex flex-col mt-4">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Coloana 1: Adauga Playlist -->
                <div class="space-y-8">
                    <div class="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80 shadow-sm">
                        <h3 class="font-bold mb-4 text-white flex items-center gap-2"><span class="material-icons text-zinc-400">create_new_folder</span> Creare Colecție (Playlist)</h3>
                        <div class="flex flex-col gap-3">
                            <input type="text" id="new-pl-name" placeholder="Nume, ex: Podcasturi" class="w-full bg-[#0a0a0a] border border-zinc-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-red-500 transition shadow-inner text-sm">
                            <button onclick="addPlaylist()" class="bg-white hover:bg-zinc-200 text-black font-semibold py-2.5 rounded-lg transition text-sm">Adaugă Secțiune</button>
                        </div>
                    </div>

                    <div class="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80 shadow-sm">
                        <h3 class="font-bold mb-4 text-white">Playlisturile Tale</h3>
                        <div class="space-y-1">
                            ${plActives}
                        </div>
                    </div>
                </div>

                <!-- Coloana 2: Adauga Video -->
                <div class="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/80 shadow-sm h-fit">
                    <h3 class="font-bold mb-4 text-white flex items-center gap-2"><span class="material-icons text-red-500">video_call</span> Salvează Videoclip</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Trimite-l în</label>
                            <select id="vid-pl" class="w-full bg-[#0a0a0a] border border-zinc-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-red-500 text-sm">
                                ${plOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Link Youtube</label>
                            <input type="text" id="vid-url" placeholder="https://youtube.com/watch?v=..." oninput="autoLink()" class="w-full bg-[#0a0a0a] border border-zinc-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-red-500 text-sm">
                            <div class="hidden mt-3 text-center" id="vid-thumb-preview"></div>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Titlu</label>
                            <input type="text" id="vid-title" placeholder="Ex: Melodia perfectă" class="w-full bg-[#0a0a0a] border border-zinc-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-red-500 text-sm">
                        </div>
                        <button onclick="addVideo()" class="w-full bg-red-600 hover:bg-red-700 font-semibold py-3 rounded-lg transition text-white mt-4 shadow-lg shadow-red-900/20">Salvează</button>
                    </div>
                </div>
            </div>
            
            <div class="mt-12 text-center pt-8 border-t border-zinc-800">
                <div onclick="openReadmePopup()" class="text-xs text-zinc-500 hover:text-zinc-400 cursor-pointer select-none">@ concept și realizare vlad 39</div>
            </div>
        </div>
    `;
}

function openReadmePopup() {
    const modal = document.getElementById('readme-modal');
    const content = document.getElementById('readme-content');
    modal.classList.remove('hidden');
    
    fetch('README.md')
        .then(response => response.text())
        .then(text => {
            content.innerHTML = marked.parse(text);
        })
        .catch(err => {
            content.innerHTML = '<p class="text-red-500">Nu se poste încărca fisierul README.md</p>';
        });
}

function closeReadmePopup() {
    document.getElementById('readme-modal').classList.add('hidden');
}

// ----- ACȚIUNI DIN USER INPUT -----

function addPlaylist() {
    const input = document.getElementById('new-pl-name');
    const name = input.value.trim();
    if(name) {
        store.playlists.push({id: genId(), name: name});
        input.value = '';
        save();
        renderSettings();
    }
}

function deletePlaylist(plId) {
    if(confirm('Ștergi acest playlist și TOATE videoclipurile din el?')) {
        store.playlists = store.playlists.filter(p => p.id !== plId);
        store.videos = store.videos.filter(v => v.playlistId !== plId);
        save();
        renderSettings();
    }
}

function deleteVideo(e, vidId) {
    e.stopPropagation(); // Opreste declansarea "playVideo" pe rand
    if(confirm('Elimini videoclipul?')) {
        const vid = store.videos.find(v => v.id === vidId);
        store.videos = store.videos.filter(v => v.id !== vidId);
        save();
        if(vid) renderPlaylist(vid.playlistId); // Refresh zona
    }
}

function autoLink() {
    const val = document.getElementById('vid-url').value;
    const yid = parseYT(val);
    const box = document.getElementById('vid-thumb-preview');
    if(yid) {
         box.innerHTML = `<img src="https://img.youtube.com/vi/${yid}/hqdefault.jpg" class="w-full h-auto object-cover rounded-lg border border-zinc-700 shadow-md">`;
         box.classList.remove('hidden');
    } else {
         box.classList.add('hidden');
    }
}

function addVideo() {
    const plId = document.getElementById('vid-pl').value;
    const url = document.getElementById('vid-url').value;
    const title = document.getElementById('vid-title').value.trim() || 'Videoclip General';
    const yid = parseYT(url);
    
    if(!yid) return alert('Introdu un link de Youtube valid!');
    if(!plId) return alert('Creează și selectează mai întâi un playlist!');

    store.videos.push({
        id: genId(),
        playlistId: plId,
        title: title,
        url: url,
        youtubeId: yid,
        thumbnail: `https://img.youtube.com/vi/${yid}/hqdefault.jpg`
    });
    
    save();
    renderPlaylist(plId); // Du-mă direct la el
}

// ----- INITIALIZARE -----
loadData();
renderSidebar();
if (store.playlists && store.playlists.length > 0) {
    renderPlaylist(store.playlists[0].id);
} else {
    renderSettings();
}
