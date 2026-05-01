const state = {
  view: 'home',
  viewHistory: ['home'],
  viewIndex: 0,
  currentTrack: null,
  queue: [],
  originalQueue: [],
  queueIndex: -1,
  isPlaying: false,
  isLoading: false,
  volume: 0.7,
  prevVolume: 0.7,
  shuffle: false,
  repeat: 'off',
  favorites: [],
  recents: [],
  browseCategory: 'bollywood',
  cache: {},
  searchResults: [],
  searchDebounce: null,
  audio: document.getElementById('audio-el')
};

const BROWSE_CATEGORIES = [
  { id: 'bollywood', label: 'Bollywood', query: 'bollywood hindi' },
  { id: 'arijit', label: 'Arijit Singh', query: 'arijit singh' },
  { id: 'arrahman', label: 'A.R. Rahman', query: 'ar rahman' },
  { id: 'romantic', label: 'Hindi Romance', query: 'hindi romantic' },
  { id: 'punjabi', label: 'Punjabi', query: 'punjabi hits' },
  { id: 'classical', label: 'Classical', query: 'indian classical' },
  { id: 'sufi', label: 'Sufi', query: 'sufi hindi' },
  { id: 'devotional', label: 'Bhajan', query: 'bhajan hindi devotional' },
  { id: 'retro', label: 'Old Hindi', query: 'kishore kumar lata mangeshkar' }
];

const HOME_SHELVES = [
  { title: 'Made for You', query: 'hindi hits', subtitle: 'Bollywood essentials, handpicked' },
  { title: 'Top Bollywood', query: 'bollywood top hits', subtitle: 'The biggest songs right now' },
  { title: 'Arijit Singh Radio', query: 'arijit singh', subtitle: 'Soulful vocals and timeless melodies' },
  { title: 'Punjabi Beats', query: 'punjabi bhangra', subtitle: 'High-energy tracks from the north' },
  { title: 'Legends of Hindi', query: 'kishore kumar mohammed rafi', subtitle: 'Golden era classics' }
];

const dataHandler = {
  onDataChanged(data) {
    state.favorites = data.filter(d => d.type === 'favorite').sort((a,b) => new Date(b.addedAt) - new Date(a.addedAt));
    state.recents = data.filter(d => d.type === 'recent').sort((a,b) => new Date(b.addedAt) - new Date(a.addedAt));
    updateFavoriteButton();
    if (state.view === 'favorites' || state.view === 'recents') render();
  }
};

const defaultConfig = {
  app_title: 'Saaz',
  app_tagline: 'Your Bollywood companion',
  home_heading: 'Good evening'
};

async function initSDKs() {
  if (window.elementSdk) {
    window.elementSdk.init({
        defaultConfig,
        onConfigChange: async (config) => {
          document.getElementById('app-title').textContent = config.app_title || defaultConfig.app_title;
          document.getElementById('app-tagline').textContent = config.app_tagline || defaultConfig.app_tagline;
          const homeHeading = document.getElementById('home-heading');
          if (homeHeading) homeHeading.textContent = config.home_heading || defaultConfig.home_heading;
        },
      mapToCapabilities: () => ({
          recolorables: [], borderables: [],
          fontEditable: undefined, fontSizeable: undefined
        }),
    mapToEditPanelValues: (config) => new Map([
        ['app_title', config.app_title || defaultConfig.app_title],
        ['app_tagline', config.app_tagline || defaultConfig.app_tagline],
        ['home_heading', config.home_heading || defaultConfig.home_heading]
      ])
});
}
if (window.dataSdk) {
  await window.dataSdk.init(dataHandler);
}
}

async function fetchTracks(query, limit = 25) {
  const cacheKey = `${query}|${limit}`;
  if (state.cache[cacheKey]) return state.cache[cacheKey];
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}&country=IN`;
    const res = await fetch(url);
    const data = await res.json();
    const tracks = (data.results || []).filter(t => t.previewUrl).map(t => ({
          trackId: String(t.trackId),
          trackName: t.trackName,
          artistName: t.artistName,
          collectionName: t.collectionName || '',
          artworkUrl: (t.artworkUrl100 || '').replace('100x100', '300x300'),
          artworkLarge: (t.artworkUrl100 || '').replace('100x100', '600x600'),
          previewUrl: t.previewUrl,
          duration: t.trackTimeMillis || 30000,
          genre: t.primaryGenreName || ''
        }));
  state.cache[cacheKey] = tracks;
  return tracks;
} catch (e) {
return [];
}
}

function groupAlbums(tracks, max = 10) {
  const seen = new Set();
  const albums = [];
  for (const t of tracks) {
    const key = t.collectionName + '|' + t.artistName;
    if (!seen.has(key) && t.collectionName) {
      seen.add(key);
      albums.push({
          name: t.collectionName,
          artist: t.artistName,
          artwork: t.artworkLarge || t.artworkUrl,
          tracks: tracks.filter(x => x.collectionName === t.collectionName && x.artistName === t.artistName)
        });
    if (albums.length >= max) break;
  }
}
return albums;
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function artworkHTML(url, size = 'w-full aspect-square', rounded = 'rounded-lg') {
  if (url) {
    return `<div class="${size} ${rounded} overflow-hidden bg-[var(--surface-2)] album-shadow">
    <img src="${url}" loading="lazy" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<div class=\\'artwork-placeholder w-full h-full\\'><svg width=\\'32\\' height=\\'32\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%236b6b75\\' stroke-width=\\'1.5\\'><path d=\\'M9 18V5l12-2v13\\'/><circle cx=\\'6\\' cy=\\'18\\' r=\\'3\\'/><circle cx=\\'18\\' cy=\\'16\\' r=\\'3\\'/></svg></div>'">
    </div>`;
  }
return `<div class="${size} ${rounded} artwork-placeholder"></div>`;
}

function trackRowHTML(track, index, contextId) {
  const isCurrent = state.currentTrack && state.currentTrack.trackId === track.trackId;
  const isFav = state.favorites.some(f => f.trackId === track.trackId);
  return `
  <div class="track-row grid grid-cols-[32px_1fr_1fr_40px_60px] md:grid-cols-[32px_2fr_1.5fr_40px_60px] items-center gap-4 px-4 py-2 rounded-lg cursor-pointer" data-track-idx="${index}" data-context="${contextId}">
  <div class="relative flex items-center justify-center text-[var(--muted)] text-sm">
  <span class="track-num ${isCurrent ? 'opacity-0' : ''}">${isCurrent && state.isPlaying ? '' : (index + 1)}</span>
  ${isCurrent && state.isPlaying ? '<div class="playing-indicator absolute"><span></span><span></span><span></span></div>' : ''}
  <svg class="play-btn absolute" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
  </div>
  <div class="flex items-center gap-3 min-w-0">
  ${artworkHTML(track.artworkUrl, 'w-10 h-10', 'rounded-md')}
  <div class="min-w-0">
  <p class="text-sm font-medium truncate ${isCurrent ? 'text-[var(--accent)]' : ''}">${escapeHtml(track.trackName)}</p>
  <p class="text-xs text-[var(--muted)] truncate">${escapeHtml(track.artistName)}</p>
  </div>
  </div>
  <p class="text-xs text-[var(--muted)] truncate hidden md:block">${escapeHtml(track.collectionName)}</p>
  <button class="fav-toggle btn-icon" style="width:28px;height:28px;" data-fav-id="${track.trackId}" aria-label="Favorite">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? 'var(--accent)' : 'none'}" stroke="${isFav ? 'var(--accent)' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
  </button>
  <p class="text-xs text-[var(--muted)] tabular-nums text-right">${formatTime(track.duration/1000)}</p>
  </div>
  `;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const contextRegistry = {};

async function render() {
  const content = document.getElementById('content');
  content.innerHTML = `<div class="flex items-center justify-center py-20"><div class="spinner"></div></div>`;

  if (state.view === 'home') await renderHome();
  else if (state.view === 'browse') await renderBrowse();
  else if (state.view === 'radio') await renderRadio();
  else if (state.view === 'recents') renderRecents();
  else if (state.view === 'favorites') renderFavorites();
  else if (state.view === 'queue') renderQueue();
  else if (state.view.startsWith('search:')) await renderSearch(state.view.slice(7));
  else if (state.view.startsWith('album:')) await renderAlbum(state.view.slice(6));
  else if (state.view.startsWith('shelf:')) await renderShelf(state.view.slice(6));

  document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === state.view);
    });

lucide.createIcons();
}

async function renderHome() {
  const content = document.getElementById('content');
  const cfg = (window.elementSdk && window.elementSdk.config) || defaultConfig;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const heading = (cfg.home_heading && cfg.home_heading.trim()) || greeting;

  const heroTracks = await fetchTracks(HOME_SHELVES[0].query, 20);

  content.innerHTML = `
  <div class="fade-in">
  <!-- Hero -->
  <div class="gradient-hero px-8 pt-10 pb-6">
  <p class="text-[13px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-2">Featured</p>
  <h1 id="home-heading" class="serif text-5xl font-bold mb-1">${escapeHtml(heading)}</h1>
  <p class="text-[var(--muted)] text-sm mb-6">Pick up where you left off, or discover something new.</p>
  ${heroTracks.length > 0 ? `
    <div class="flex items-end gap-6">
    <div class="w-48 flex-shrink-0">
    ${artworkHTML(heroTracks[0].artworkLarge || heroTracks[0].artworkUrl, 'w-full aspect-square')}
    </div>
    <div class="pb-2">
    <p class="text-xs uppercase tracking-wider text-[var(--muted)] font-semibold mb-1">Featured track</p>
    <h2 class="serif text-3xl font-bold mb-1">${escapeHtml(heroTracks[0].trackName)}</h2>
    <p class="text-[var(--muted)] mb-4">${escapeHtml(heroTracks[0].artistName)}</p>
    <button id="hero-play" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold" style="background: var(--accent); color: white;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    Play now
    </button>
    </div>
    </div>
    ` : ''}
  </div>

  <div id="shelves" class="px-8 py-6 space-y-8"></div>
  </div>
  `;

  if (heroTracks.length > 0) {
    document.getElementById('hero-play').onclick = () => {
      playFromQueue(heroTracks, 0);
    };
}

const shelvesEl = document.getElementById('shelves');
for (const shelf of HOME_SHELVES) {
  const shelfId = 'shelf-' + shelf.query.replace(/\s+/g, '-');
  shelvesEl.insertAdjacentHTML('beforeend', `
    <section>
    <div class="flex items-end justify-between mb-4">
    <div>
    <h2 class="serif text-2xl font-bold">${escapeHtml(shelf.title)}</h2>
    <p class="text-xs text-[var(--muted)] mt-0.5">${escapeHtml(shelf.subtitle)}</p>
    </div>
    <button class="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition" data-shelf-query="${escapeHtml(shelf.query)}" data-shelf-title="${escapeHtml(shelf.title)}">See all</button>
    </div>
    <div id="${shelfId}" class="flex gap-4 overflow-x-auto hide-scroll pb-2">
    <div class="spinner"></div>
    </div>
    </section>
    `);
}

HOME_SHELVES.forEach(async (shelf) => {
    const shelfId = 'shelf-' + shelf.query.replace(/\s+/g, '-');
    const tracks = await fetchTracks(shelf.query, 25);
    const albums = groupAlbums(tracks, 8);
    const el = document.getElementById(shelfId);
    if (!el) return;
    if (albums.length === 0) {
      el.innerHTML = `<p class="text-sm text-[var(--muted)] py-4">Could not load tracks. Check connection.</p>`;
      return;
    }

  const ctxId = 'ctx-shelf-' + shelf.query.replace(/\s+/g, '-');
  contextRegistry[ctxId] = tracks;

  el.innerHTML = albums.map((album, i) => {
      const albumKey = btoa(unescape(encodeURIComponent(album.name + '|' + album.artist))).replace(/=/g, '');
      contextRegistry['album-' + albumKey] = album.tracks;
      return `
      <div class="album-card flex-shrink-0 w-44" data-album="${albumKey}">
      ${artworkHTML(album.artwork, 'w-full aspect-square')}
      <p class="text-sm font-semibold mt-3 truncate">${escapeHtml(album.name)}</p>
      <p class="text-xs text-[var(--muted)] truncate">${escapeHtml(album.artist)}</p>
      </div>
      `;
    }).join('');
});
}

async function renderBrowse() {
  const content = document.getElementById('content');
  content.innerHTML = `
  <div class="fade-in px-8 py-6">
  <h1 class="serif text-4xl font-bold mb-1">Browse</h1>
  <p class="text-[var(--muted)] text-sm mb-6">Explore Indian music by mood, artist, and era.</p>

  <div class="flex gap-2 overflow-x-auto hide-scroll mb-6 pb-1">
  ${BROWSE_CATEGORIES.map(c => `
      <button class="chip ${c.id === state.browseCategory ? 'active' : ''}" data-browse="${c.id}">${escapeHtml(c.label)}</button>
      `).join('')}
  </div>

  <div id="browse-results">
  <div class="flex items-center justify-center py-12"><div class="spinner"></div></div>
  </div>
  </div>
  `;

  const cat = BROWSE_CATEGORIES.find(c => c.id === state.browseCategory);
  const tracks = await fetchTracks(cat.query, 30);
  const resultsEl = document.getElementById('browse-results');
  if (tracks.length === 0) {
    resultsEl.innerHTML = `<p class="text-[var(--muted)] py-8 text-center">No results found. Try another category.</p>`;
    return;
  }

contextRegistry['ctx-browse'] = tracks;

resultsEl.innerHTML = `
<div class="mb-8">
<h2 class="serif text-xl font-bold mb-4">Top Songs</h2>
<div class="space-y-1">
${tracks.slice(0, 10).map((t, i) => trackRowHTML(t, i, 'ctx-browse')).join('')}
</div>
</div>
<div>
<h2 class="serif text-xl font-bold mb-4">Albums</h2>
<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
${groupAlbums(tracks, 10).map(album => {
      const albumKey = btoa(unescape(encodeURIComponent(album.name + '|' + album.artist))).replace(/=/g, '');
      contextRegistry['album-' + albumKey] = album.tracks;
      return `
      <div class="album-card" data-album="${albumKey}">
      ${artworkHTML(album.artwork, 'w-full aspect-square')}
      <p class="text-sm font-semibold mt-3 truncate">${escapeHtml(album.name)}</p>
      <p class="text-xs text-[var(--muted)] truncate">${escapeHtml(album.artist)}</p>
      </div>
      `;
    }).join('')}
</div>
</div>
`;
}

async function renderRadio() {
  const content = document.getElementById('content');
  const stations = [
    { name: 'Bollywood Hits Radio', query: 'bollywood hits', color: '#fb2c5a' },
    { name: 'Chill Hindi', query: 'hindi chill acoustic', color: '#f59e0b' },
    { name: 'Party Bhangra', query: 'punjabi dance', color: '#10b981' },
    { name: 'Lofi India', query: 'lofi bollywood', color: '#8b5cf6' },
    { name: 'Arijit Only', query: 'arijit singh', color: '#ef4444' },
    { name: 'Golden Era', query: 'old hindi classic', color: '#d97706' },
    { name: 'Sufi Soul', query: 'sufi qawwali hindi', color: '#0891b2' },
    { name: 'Rahman Magic', query: 'ar rahman', color: '#e11d48' }
  ];

content.innerHTML = `
<div class="fade-in px-8 py-6">
<h1 class="serif text-4xl font-bold mb-1">Radio</h1>
<p class="text-[var(--muted)] text-sm mb-8">Endless stations curated for Indian music lovers.</p>
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
${stations.map(s => `
    <button class="radio-station text-left p-5 rounded-xl relative overflow-hidden h-32" data-query="${escapeHtml(s.query)}" style="background: linear-gradient(135deg, ${s.color}, ${s.color}88);">
    <svg class="absolute right-3 top-3 opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
    <div class="absolute bottom-4 left-5 right-5">
    <p class="text-xs uppercase tracking-wider text-white/70 font-semibold">Station</p>
    <p class="serif text-xl font-bold text-white leading-tight">${escapeHtml(s.name)}</p>
    </div>
    </button>
    `).join('')}
</div>
</div>
`;
}

function renderRecents() {
  const content = document.getElementById('content');
  if (state.recents.length === 0) {
    content.innerHTML = emptyStateHTML('clock', 'No recent plays', 'Songs you play will appear here so you can jump right back in.');
    return;
  }
contextRegistry['ctx-recents'] = state.recents.map(r => ({
      trackId: r.trackId, trackName: r.trackName, artistName: r.artistName,
      collectionName: r.collectionName, artworkUrl: r.artworkUrl,
      previewUrl: r.previewUrl, duration: 30000
    }));
content.innerHTML = `
<div class="fade-in px-8 py-6">
<h1 class="serif text-4xl font-bold mb-1">Recently Played</h1>
<p class="text-[var(--muted)] text-sm mb-6">${state.recents.length} track${state.recents.length !== 1 ? 's' : ''}</p>
<div class="space-y-1">
${contextRegistry['ctx-recents'].map((t, i) => trackRowHTML(t, i, 'ctx-recents')).join('')}
</div>
</div>
`;
}

function renderFavorites() {
  const content = document.getElementById('content');
  if (state.favorites.length === 0) {
    content.innerHTML = emptyStateHTML('heart', 'No favorites yet', 'Tap the heart on any track to save it here for later.');
    return;
  }
contextRegistry['ctx-favorites'] = state.favorites.map(f => ({
      trackId: f.trackId, trackName: f.trackName, artistName: f.artistName,
      collectionName: f.collectionName, artworkUrl: f.artworkUrl,
      previewUrl: f.previewUrl, duration: 30000
    }));
content.innerHTML = `
<div class="fade-in px-8 py-6">
<div class="flex items-end gap-6 mb-8">
<div class="w-48 h-48 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #fb2c5a, #ff7849);">
<svg width="72" height="72" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
</div>
<div class="pb-4">
<p class="text-xs uppercase tracking-wider text-[var(--muted)] font-semibold">Playlist</p>
<h1 class="serif text-4xl font-bold mb-1">Favorites</h1>
<p class="text-sm text-[var(--muted)]">${state.favorites.length} song${state.favorites.length !== 1 ? 's' : ''}</p>
</div>
</div>
<div class="space-y-1">
${contextRegistry['ctx-favorites'].map((t, i) => trackRowHTML(t, i, 'ctx-favorites')).join('')}
</div>
</div>
`;
}

function renderQueue() {
  const content = document.getElementById('content');
  if (state.queue.length === 0) {
    content.innerHTML = emptyStateHTML('list', 'Queue is empty', 'Play a song to build your listening queue.');
    return;
  }
contextRegistry['ctx-queue'] = state.queue;
content.innerHTML = `
<div class="fade-in px-8 py-6">
<h1 class="serif text-4xl font-bold mb-1">Now Playing Queue</h1>
<p class="text-[var(--muted)] text-sm mb-6">Track ${state.queueIndex + 1} of ${state.queue.length}</p>
<div class="space-y-1">
${state.queue.map((t, i) => {
      const isCurrent = i === state.queueIndex;
      return `<div class="track-row grid grid-cols-[32px_1fr_1fr_60px] items-center gap-4 px-4 py-2 rounded-lg cursor-pointer ${isCurrent ? 'bg-white/5' : ''}" data-track-idx="${i}" data-context="ctx-queue">
      <div class="text-[var(--muted)] text-sm">${isCurrent ? '▶' : (i + 1)}</div>
      <div class="flex items-center gap-3 min-w-0">
      ${artworkHTML(t.artworkUrl, 'w-10 h-10', 'rounded-md')}
      <div class="min-w-0">
      <p class="text-sm font-medium truncate ${isCurrent ? 'text-[var(--accent)]' : ''}">${escapeHtml(t.trackName)}</p>
      <p class="text-xs text-[var(--muted)] truncate">${escapeHtml(t.artistName)}</p>
      </div>
      </div>
      <p class="text-xs text-[var(--muted)] truncate">${escapeHtml(t.collectionName)}</p>
      <p class="text-xs text-[var(--muted)] tabular-nums text-right">${formatTime((t.duration||30000)/1000)}</p>
      </div>`;
    }).join('')}
</div>
</div>
`;
}

async function renderSearch(query) {
  const content = document.getElementById('content');
  if (!query.trim()) {
    content.innerHTML = `<div class="px-8 py-6"><p class="text-[var(--muted)]">Type something to search.</p></div>`;
    return;
  }

const tracks = await fetchTracks(query + ' hindi', 25);
if (tracks.length === 0) {
  content.innerHTML = `
  <div class="fade-in px-8 py-12 text-center">
  <p class="serif text-2xl font-bold mb-2">No results for "${escapeHtml(query)}"</p>
  <p class="text-[var(--muted)] text-sm">Try a different spelling or another artist name.</p>
  </div>
  `;
  return;
}
contextRegistry['ctx-search'] = tracks;
content.innerHTML = `
<div class="fade-in px-8 py-6">
<p class="text-xs uppercase tracking-wider text-[var(--muted)] font-semibold mb-1">Search results</p>
<h1 class="serif text-3xl font-bold mb-6">"${escapeHtml(query)}"</h1>
<div class="mb-8">
<h2 class="serif text-xl font-bold mb-4">Top Result</h2>
<div class="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] transition cursor-pointer" id="top-result">
${artworkHTML(tracks[0].artworkLarge || tracks[0].artworkUrl, 'w-24 h-24', 'rounded-lg')}
<div class="flex-1 min-w-0">
<p class="serif text-2xl font-bold truncate">${escapeHtml(tracks[0].trackName)}</p>
<p class="text-sm text-[var(--muted)] truncate">Song · ${escapeHtml(tracks[0].artistName)}</p>
</div>
</div>
</div>
<div>
<h2 class="serif text-xl font-bold mb-4">Songs</h2>
<div class="space-y-1">
${tracks.map((t, i) => trackRowHTML(t, i, 'ctx-search')).join('')}
</div>
</div>
</div>
`;
document.getElementById('top-result').onclick = () => playFromQueue(tracks, 0);
}

async function renderShelf(query) {
  const content = document.getElementById('content');
  const tracks = await fetchTracks(query, 30);
  contextRegistry['ctx-shelf-view'] = tracks;
  content.innerHTML = `
  <div class="fade-in px-8 py-6">
  <h1 class="serif text-4xl font-bold mb-1">${escapeHtml(query)}</h1>
  <p class="text-[var(--muted)] text-sm mb-6">${tracks.length} songs</p>
  <div class="space-y-1">
  ${tracks.map((t, i) => trackRowHTML(t, i, 'ctx-shelf-view')).join('')}
  </div>
  </div>
  `;
}

async function renderAlbum(albumKey) {
  const content = document.getElementById('content');
  const tracks = contextRegistry['album-' + albumKey];
  if (!tracks || tracks.length === 0) {
    content.innerHTML = `<div class="px-8 py-6"><p class="text-[var(--muted)]">Album not found.</p></div>`;
    return;
  }
const album = tracks[0];
content.innerHTML = `
<div class="fade-in">
<div class="gradient-hero px-8 pt-10 pb-8 flex items-end gap-6">
<div class="w-52 flex-shrink-0">
${artworkHTML(album.artworkLarge || album.artworkUrl, 'w-full aspect-square', 'rounded-xl')}
</div>
<div class="pb-2">
<p class="text-xs uppercase tracking-wider text-[var(--muted)] font-semibold">Album</p>
<h1 class="serif text-4xl font-bold mb-2">${escapeHtml(album.collectionName)}</h1>
<p class="text-[var(--muted)] mb-4">${escapeHtml(album.artistName)} · ${tracks.length} songs</p>
<button id="album-play" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold" style="background: var(--accent); color: white;">
<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
Play
</button>
</div>
</div>
<div class="px-8 py-6">
<div class="space-y-1">
${tracks.map((t, i) => trackRowHTML(t, i, 'album-' + albumKey)).join('')}
</div>
</div>
</div>
`;
document.getElementById('album-play').onclick = () => playFromQueue(tracks, 0);
}

function emptyStateHTML(icon, title, subtitle) {
  const icons = {
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    list: '<line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>'
  };
return `
<div class="fade-in h-full flex items-center justify-center px-8 py-12">
<div class="text-center max-w-sm">
<div class="w-16 h-16 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[icon]}</svg>
</div>
<h2 class="serif text-2xl font-bold mb-2">${title}</h2>
<p class="text-sm text-[var(--muted)]">${subtitle}</p>
</div>
</div>
`;
}

function playFromQueue(tracks, startIndex) {
  state.originalQueue = [...tracks];
  state.queue = state.shuffle ? shuffleKeepingFirst(tracks, startIndex) : [...tracks];
  state.queueIndex = state.shuffle ? 0 : startIndex;
  loadTrack(state.queue[state.queueIndex], true);
}

function shuffleKeepingFirst(arr, firstIndex) {
  const first = arr[firstIndex];
  const rest = arr.filter((_, i) => i !== firstIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
return [first, ...rest];
}

async function loadTrack(track, autoplay = true) {
  if (!track) return;
  state.currentTrack = track;
  state.isLoading = true;
  updatePlayButton();

  document.getElementById('np-title').textContent = track.trackName;
  document.getElementById('np-artist').textContent = track.artistName;
  const artEl = document.getElementById('np-artwork');
  if (track.artworkUrl) {
    artEl.innerHTML = `<img src="${track.artworkUrl}" class="w-full h-full object-cover" alt="">`;
  } else {
  artEl.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b6b75" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
}
updateFavoriteButton();

state.audio.src = track.previewUrl;
state.audio.volume = state.volume;

await recordRecent(track);

if (autoplay) {
  try {
    await state.audio.play();
    state.isPlaying = true;
  } catch (e) {
  state.isPlaying = false;
}
}
state.isLoading = false;
updatePlayButton();

refreshTrackLists();
}

function refreshTrackLists() {

  if (['home','browse','recents','favorites','queue'].includes(state.view) ||
    state.view.startsWith('search:') || state.view.startsWith('album:') || state.view.startsWith('shelf:')) {

    document.querySelectorAll('.track-row').forEach(row => {
        const idx = parseInt(row.dataset.trackIdx);
        const ctx = row.dataset.context;
        const list = contextRegistry[ctx];
        if (!list) return;
        const t = list[idx];
        if (!t) return;
        const isCurrent = state.currentTrack && state.currentTrack.trackId === t.trackId;
        const titleEl = row.querySelector('.text-sm.font-medium');
        if (titleEl) titleEl.classList.toggle('text-[var(--accent)]', isCurrent);
        const numCell = row.children[0];
        if (numCell) {
          numCell.innerHTML = `
          <span class="track-num ${isCurrent ? 'opacity-0' : ''}">${isCurrent && state.isPlaying ? '' : (idx + 1)}</span>
          ${isCurrent && state.isPlaying ? '<div class="playing-indicator absolute"><span></span><span></span><span></span></div>' : ''}
          <svg class="play-btn absolute" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          `;
        }
    });
}
}

async function recordRecent(track) {
  if (!window.dataSdk) return;

  const existing = state.recents.find(r => r.trackId === track.trackId);
  if (existing) {
    await window.dataSdk.delete(existing);
  }

if (state.recents.length >= 50) {
  const oldest = state.recents[state.recents.length - 1];
  await window.dataSdk.delete(oldest);
}

const total = state.recents.length + state.favorites.length;
if (total >= 995) return;
await window.dataSdk.create({
    trackId: track.trackId,
    trackName: track.trackName,
    artistName: track.artistName,
    collectionName: track.collectionName || '',
    artworkUrl: track.artworkUrl || '',
    previewUrl: track.previewUrl,
    addedAt: new Date().toISOString(),
    type: 'recent'
  });
}

async function toggleFavorite(track) {
  if (!window.dataSdk) return;
  const existing = state.favorites.find(f => f.trackId === track.trackId);
  if (existing) {
    const res = await window.dataSdk.delete(existing);
    if (res.isOk) showToast('Removed from Favorites');
  } else {
  const total = state.recents.length + state.favorites.length;
  if (total >= 990) {
    showToast('Library is near capacity. Clear some recents.');
    return;
  }
const res = await window.dataSdk.create({
    trackId: track.trackId,
    trackName: track.trackName,
    artistName: track.artistName,
    collectionName: track.collectionName || '',
    artworkUrl: track.artworkUrl || '',
    previewUrl: track.previewUrl,
    addedAt: new Date().toISOString(),
    type: 'favorite'
  });
if (res.isOk) showToast('Added to Favorites');
}
refreshTrackLists();

document.querySelectorAll('[data-fav-id]').forEach(btn => {
    const id = btn.dataset.favId;
    const isFav = state.favorites.some(f => f.trackId === id);
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? 'var(--accent)' : 'none'}" stroke="${isFav ? 'var(--accent)' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
  });
}

function updateFavoriteButton() {
  const btn = document.getElementById('np-fav');
  if (!btn) return;
  const isFav = state.currentTrack && state.favorites.some(f => f.trackId === state.currentTrack.trackId);
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'var(--accent)' : 'none'}" stroke="${isFav ? 'var(--accent)' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
}

function updatePlayButton() {
  document.getElementById('play-icon').style.display = (!state.isLoading && !state.isPlaying) ? '' : 'none';
  document.getElementById('pause-icon').style.display = (!state.isLoading && state.isPlaying) ? '' : 'none';
  document.getElementById('play-loader').style.display = state.isLoading ? '' : 'none';
}

function togglePlay() {
  if (!state.currentTrack) return;
  if (state.isPlaying) {
    state.audio.pause();
  } else {
  state.audio.play().catch(() => {});
}
}

function playNext() {
  if (state.queue.length === 0) return;
  if (state.repeat === 'one') {
    state.audio.currentTime = 0;
    state.audio.play().catch(() => {});
    return;
  }
let next = state.queueIndex + 1;
if (next >= state.queue.length) {
  if (state.repeat === 'all') next = 0;
  else {
    state.audio.pause();
    state.audio.currentTime = 0;
    return;
  }
}
state.queueIndex = next;
loadTrack(state.queue[state.queueIndex], true);
}

function playPrev() {
  if (state.queue.length === 0) return;
  if (state.audio.currentTime > 3) {
    state.audio.currentTime = 0;
    return;
  }
let prev = state.queueIndex - 1;
if (prev < 0) prev = state.repeat === 'all' ? state.queue.length - 1 : 0;
state.queueIndex = prev;
loadTrack(state.queue[state.queueIndex], true);
}

function toggleShuffle() {
  state.shuffle = !state.shuffle;
  const btn = document.getElementById('shuffle-btn');
  btn.style.color = state.shuffle ? 'var(--accent)' : '';
  if (state.currentTrack && state.originalQueue.length > 0) {
    const currentIdx = state.originalQueue.findIndex(t => t.trackId === state.currentTrack.trackId);
    if (state.shuffle) {
      state.queue = shuffleKeepingFirst(state.originalQueue, currentIdx);
      state.queueIndex = 0;
    } else {
    state.queue = [...state.originalQueue];
    state.queueIndex = currentIdx;
  }
}
showToast(state.shuffle ? 'Shuffle on' : 'Shuffle off');
}

function cycleRepeat() {
  state.repeat = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
  const btn = document.getElementById('repeat-btn');
  btn.style.color = state.repeat !== 'off' ? 'var(--accent)' : '';
  btn.innerHTML = state.repeat === 'one'
  ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="15" text-anchor="middle" font-size="8" fill="currentColor" stroke="none" font-weight="bold">1</text></svg>'
  : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
  showToast(state.repeat === 'off' ? 'Repeat off' : state.repeat === 'all' ? 'Repeat all' : 'Repeat one');
}

function setVolume(v) {
  state.volume = Math.max(0, Math.min(1, v));
  state.audio.volume = state.volume;
  document.getElementById('volume-fill').style.width = (state.volume * 100) + '%';
  updateVolumeIcon();
}

function updateVolumeIcon() {
  document.getElementById('vol-icon-high').style.display = state.volume > 0 ? '' : 'none';
  document.getElementById('vol-icon-mute').style.display = state.volume === 0 ? '' : 'none';
}

function toggleMute() {
  if (state.volume > 0) {
    state.prevVolume = state.volume;
    setVolume(0);
  } else {
  setVolume(state.prevVolume || 0.7);
}
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2000);
}

function navigate(view) {
  if (view === state.view) return;

  state.viewHistory = state.viewHistory.slice(0, state.viewIndex + 1);
  state.viewHistory.push(view);
  state.viewIndex = state.viewHistory.length - 1;
  state.view = view;
  updateNavButtons();
  render();
}

function updateNavButtons() {
  document.getElementById('nav-back').disabled = state.viewIndex <= 0;
  document.getElementById('nav-forward').disabled = state.viewIndex >= state.viewHistory.length - 1;
}

function wireEvents() {

  document.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = () => navigate(btn.dataset.view);
    });

document.getElementById('nav-back').onclick = () => {
  if (state.viewIndex > 0) {
    state.viewIndex--;
    state.view = state.viewHistory[state.viewIndex];
    updateNavButtons(); render();
  }
};
document.getElementById('nav-forward').onclick = () => {
  if (state.viewIndex < state.viewHistory.length - 1) {
    state.viewIndex++;
    state.view = state.viewHistory[state.viewIndex];
    updateNavButtons(); render();
  }
};

const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
    clearTimeout(state.searchDebounce);
    const q = e.target.value.trim();
    state.searchDebounce = setTimeout(() => {
        if (q.length === 0) {
          if (state.view.startsWith('search:')) navigate('home');
        } else {
        navigate('search:' + q);
      }
  }, 350);
});

document.getElementById('content').addEventListener('click', (e) => {

    const row = e.target.closest('.track-row');
    const favBtn = e.target.closest('[data-fav-id]');
    if (favBtn) {
      e.stopPropagation();
      const id = favBtn.dataset.favId;

      let found = null;
      for (const ctx of Object.values(contextRegistry)) {
        found = ctx.find(t => t.trackId === id);
        if (found) break;
      }
    if (!found && state.currentTrack && state.currentTrack.trackId === id) found = state.currentTrack;
    if (found) toggleFavorite(found);
    return;
  }
if (row) {
  const idx = parseInt(row.dataset.trackIdx);
  const ctx = row.dataset.context;
  const list = contextRegistry[ctx];
  if (list) playFromQueue(list, idx);
  return;
}

const albumCard = e.target.closest('[data-album]');
if (albumCard) {
  navigate('album:' + albumCard.dataset.album);
  return;
}

const chip = e.target.closest('[data-browse]');
if (chip) {
  state.browseCategory = chip.dataset.browse;
  render();
  return;
}

const shelfBtn = e.target.closest('[data-shelf-query]');
if (shelfBtn) {
  navigate('shelf:' + shelfBtn.dataset.shelfQuery);
  return;
}

const station = e.target.closest('.radio-station');
if (station) {
  showToast('Tuning in...');
  fetchTracks(station.dataset.query, 30).then(tracks => {
      if (tracks.length > 0) playFromQueue(tracks, 0);
    });
return;
}
});

document.getElementById('play-btn').onclick = togglePlay;
document.getElementById('next-btn').onclick = playNext;
document.getElementById('prev-btn').onclick = playPrev;
document.getElementById('shuffle-btn').onclick = toggleShuffle;
document.getElementById('repeat-btn').onclick = cycleRepeat;
document.getElementById('mute-btn').onclick = toggleMute;
document.getElementById('queue-toggle').onclick = () => navigate('queue');
document.getElementById('np-fav').onclick = () => {
  if (state.currentTrack) toggleFavorite(state.currentTrack);
};

const volTrack = document.getElementById('volume-track');
const setVolFromEvent = (e) => {
  const rect = volTrack.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  setVolume(pct);
};
volTrack.addEventListener('mousedown', (e) => {
    setVolFromEvent(e);
    const move = (ev) => setVolFromEvent(ev);
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
});

const progTrack = document.getElementById('progress-track');
const seekFromEvent = (e) => {
  if (!state.audio.duration) return;
  const rect = progTrack.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  state.audio.currentTime = pct * state.audio.duration;
};
progTrack.addEventListener('mousedown', (e) => {
    seekFromEvent(e);
    const move = (ev) => seekFromEvent(ev);
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
});

state.audio.addEventListener('play', () => { state.isPlaying = true; updatePlayButton(); refreshTrackLists(); });
state.audio.addEventListener('pause', () => { state.isPlaying = false; updatePlayButton(); refreshTrackLists(); });
state.audio.addEventListener('ended', playNext);
state.audio.addEventListener('timeupdate', () => {
    const cur = state.audio.currentTime || 0;
    const dur = state.audio.duration || 0;
    document.getElementById('current-time').textContent = formatTime(cur);
    document.getElementById('total-time').textContent = formatTime(dur);
    document.getElementById('progress-fill').style.width = dur ? ((cur / dur) * 100) + '%' : '0%';
  });
state.audio.addEventListener('waiting', () => { state.isLoading = true; updatePlayButton(); });
state.audio.addEventListener('canplay', () => { state.isLoading = false; updatePlayButton(); });
state.audio.addEventListener('error', () => {
    state.isLoading = false;
    updatePlayButton();
    showToast('Could not load preview. Skipping...');
    setTimeout(playNext, 800);
  });

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight' && e.shiftKey) { e.preventDefault(); playNext(); }
    else if (e.code === 'ArrowLeft' && e.shiftKey) { e.preventDefault(); playPrev(); }
  });

document.getElementById('volume-fill').style.width = (state.volume * 100) + '%';
}

(async () => {
    await initSDKs();
    wireEvents();
    render();
    lucide.createIcons();
  })();

(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9f4bde64533f97f7',t:'MTc3NzYwNzkxNi4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();