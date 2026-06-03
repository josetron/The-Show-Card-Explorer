// MLB The Show 26 Card Explorer & Ranker

// App State
let players = [];
let filteredPlayers = [];
let comparedPlayers = [];
let activeType = 'hitter'; // 'hitter' | 'pitcher'
let viewMode = 'grid'; // 'grid' | 'list'
let sortAscending = false;
let activePriorityMode = 'primary'; // 'primary' | 'secondary'
let renderLimit = 60;
const renderIncrement = 40;

function loadInventoryData() {
  try {
    const savedInventory = typeof localStorage !== 'undefined' ? localStorage.getItem('mlbInventoryData') : null;
    if (savedInventory) {
      return JSON.parse(savedInventory);
    }
  } catch (error) {
    console.warn('Unable to load saved inventory:', error);
  }

  return window.MLB_INVENTORY_DATA || { cards: [] };
}

let currentInventoryData = loadInventoryData();
let ownedCardUuids = new Set((currentInventoryData.cards || []).map(card => card.uuid));
let inventoryQuantities = new Map();
let inventorySellable = new Map();

function updateInventoryState() {
  ownedCardUuids = new Set(
    (currentInventoryData.cards || [])
      .filter(card => (card.quantity !== undefined ? card.quantity : 1) > 0)
      .map(card => card.uuid)
  );
  inventoryQuantities.clear();
  inventorySellable.clear();
  
  const dbPlayers = window.MLB_PLAYERS_DATA || [];
  const dbPlayersMap = new Map(dbPlayers.map(p => [p.uuid, p]));

  (currentInventoryData.cards || []).forEach(card => {
    const qty = card.quantity !== undefined ? card.quantity : 1;
    inventoryQuantities.set(card.uuid, qty);
    
    // A card is sellable if its card type can be listed on the Community Market (based on locations)
    const dbPlayer = dbPlayersMap.get(card.uuid);
    const isSellable = dbPlayer ? (dbPlayer.locations && dbPlayer.locations.includes('COMMUNITY MARKET')) : true;
    inventorySellable.set(card.uuid, isSellable);
  });
  
  // Update header counter
  const ownedCountEl = document.getElementById('owned-card-count');
  if (ownedCountEl) {
    ownedCountEl.textContent = ownedCardUuids.size.toLocaleString();
  }
}
updateInventoryState();

let liveStatsMap = new Map();

function normalizePlayerName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, '') // remove suffixes
    .replace(/[^a-z0-9]/g, '') // remove non-alphanumeric
    .trim();
}

function matchPlayerNameFuzzy(playerName, query) {
  const normQuery = normalizePlayerName(query);
  if (!normQuery) return false;

  // Exact substring check on full name first
  const normFull = normalizePlayerName(playerName);
  if (normFull.includes(normQuery)) return true;

  const playerWords = playerName.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/);

  const noVowels = (str) => str.replace(/[aeiouy]/g, '');
  const queryNoVowels = noVowels(normQuery);

  for (const word of playerWords) {
    const normWord = normalizePlayerName(word);
    if (normWord.includes(normQuery)) {
      return true;
    }
    // Vowel-less fuzzy comparison for words of length >= 3
    if (normWord.length >= 3 && normQuery.length >= 3) {
      const wordNoVowels = noVowels(normWord);
      if (wordNoVowels === queryNoVowels && normWord[0] === normQuery[0]) {
        return true;
      }
    }
  }

  return false;
}

async function loadLiveStats() {
  try {
    const [
      hitting26, pitching26,
      hitting25, pitching25,
      hitting24, pitching24
    ] = await Promise.all([
      fetch('https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&sportId=1&season=2026&limit=2000&playerPool=all').then(r => r.json()),
      fetch('https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&sportId=1&season=2026&limit=2000&playerPool=all').then(r => r.json()),
      fetch('https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&sportId=1&season=2025&limit=2000&playerPool=all').then(r => r.json()),
      fetch('https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&sportId=1&season=2025&limit=2000&playerPool=all').then(r => r.json()),
      fetch('https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&sportId=1&season=2024&limit=2000&playerPool=all').then(r => r.json()),
      fetch('https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&sportId=1&season=2024&limit=2000&playerPool=all').then(r => r.json())
    ]);

    const apiPlayersMap = new Map();
    const addPlayer = (p, stat, year, isHitter) => {
      const norm = normalizePlayerName(p.fullName);
      const key = norm + (isHitter ? '_hitter' : '_pitcher');
      if (!apiPlayersMap.has(key) || parseInt(year) > parseInt(apiPlayersMap.get(key).year)) {
        const slug = p.fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const url = `https://www.mlb.com/player/${slug}-${p.id}`;
        apiPlayersMap.set(key, {
          fullName: p.fullName,
          id: p.id,
          avg: stat.avg || '.000',
          era: stat.era || '0.00',
          url: url,
          year: year,
          isHitter: isHitter
        });
      }
    };

    // Load 2024 first
    if (hitting24.stats && hitting24.stats[0] && hitting24.stats[0].splits) {
      hitting24.stats[0].splits.forEach(s => addPlayer(s.player, s.stat, '2024', true));
    }
    if (pitching24.stats && pitching24.stats[0] && pitching24.stats[0].splits) {
      pitching24.stats[0].splits.forEach(s => addPlayer(s.player, s.stat, '2024', false));
    }

    // Overwrite with 2025
    if (hitting25.stats && hitting25.stats[0] && hitting25.stats[0].splits) {
      hitting25.stats[0].splits.forEach(s => addPlayer(s.player, s.stat, '2025', true));
    }
    if (pitching25.stats && pitching25.stats[0] && pitching25.stats[0].splits) {
      pitching25.stats[0].splits.forEach(s => addPlayer(s.player, s.stat, '2025', false));
    }

    // Overwrite with 2026
    if (hitting26.stats && hitting26.stats[0] && hitting26.stats[0].splits) {
      hitting26.stats[0].splits.forEach(s => addPlayer(s.player, s.stat, '2026', true));
    }
    if (pitching26.stats && pitching26.stats[0] && pitching26.stats[0].splits) {
      pitching26.stats[0].splits.forEach(s => addPlayer(s.player, s.stat, '2026', false));
    }

    liveStatsMap = apiPlayersMap;
    console.log(`Loaded ${liveStatsMap.size} live player stats from MLB API.`);
    
    // Re-render cards to show live averages
    runFiltersAndSort();
  } catch (error) {
    console.warn('Failed to load live statistics from MLB API:', error);
  }
}

let favoritedCardUuids = new Set();
function loadFavoritesData() {
  try {
    const savedFavs = typeof localStorage !== 'undefined' ? localStorage.getItem('mlbFavoritedCards') : null;
    if (savedFavs) {
      return new Set(JSON.parse(savedFavs));
    }
  } catch (error) {
    console.warn('Unable to load saved favorites:', error);
  }
  return new Set();
}
favoritedCardUuids = loadFavoritesData();

function toggleFavorite(event, uuid) {
  if (event) event.stopPropagation();
  
  if (favoritedCardUuids.has(uuid)) {
    favoritedCardUuids.delete(uuid);
  } else {
    favoritedCardUuids.add(uuid);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mlbFavoritedCards', JSON.stringify(Array.from(favoritedCardUuids)));
    }
  } catch (error) {
    console.warn('Unable to save favorites locally:', error);
  }

  // Update DOM hearts for this card
  const cards = document.querySelectorAll(`[data-uuid="${uuid}"]`);
  cards.forEach(card => {
    const btn = card.querySelector('.favorite-heart-btn');
    if (btn) {
      const isFav = favoritedCardUuids.has(uuid);
      btn.classList.toggle('favorited', isFav);
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isFav ? '#ff4b4b' : 'none');
        svg.setAttribute('stroke', isFav ? '#ff4b4b' : '#fff');
      }
    }
  });

  // Update detail modal heart button if it is open and shows this player
  const detailBtn = document.getElementById('detail-favorite-btn');
  if (detailBtn && window.activeDetailPlayer && window.activeDetailPlayer.uuid === uuid) {
    const isFav = favoritedCardUuids.has(uuid);
    detailBtn.classList.toggle('favorited', isFav);
    const svg = detailBtn.querySelector('svg');
    if (svg) {
      svg.setAttribute('fill', isFav ? '#ff4b4b' : 'none');
      svg.setAttribute('stroke', isFav ? '#ff4b4b' : '#fff');
    }
  }

  // Re-run filter if we are viewing favorites only
  if (inventorySelect.value === 'favorites') {
    runFiltersAndSort();
  }
}
window.toggleFavorite = toggleFavorite;

// Element Selectors
const cardsGrid = document.getElementById('cards-grid');
const totalCardCount = document.getElementById('total-card-count');
const filteredCardCount = document.getElementById('filtered-card-count');
const resultsNum = document.getElementById('card-results-num');
const teamSelect = document.getElementById('team-select');
const seriesSelect = document.getElementById('series-select');
const positionSelect = document.getElementById('position-select');
const handSelect = document.getElementById('hand-select');
const specialSelect = document.getElementById('special-select');
const inventorySelect = document.getElementById('inventory-select');
const syncInventoryBtn = document.getElementById('sync-inventory-btn');
const inventorySyncStatus = document.getElementById('inventory-sync-status');
const searchInput = document.getElementById('search-input');
const ovrMinInput = document.getElementById('ovr-min');
const ovrMaxInput = document.getElementById('ovr-max');
const ovrMinVal = document.getElementById('ovr-min-val');
const ovrMaxVal = document.getElementById('ovr-max-val');
const enableCustomFormula = document.getElementById('enable-custom-formula');
const sortBySelect = document.getElementById('sort-by');
const sentinel = document.getElementById('sentinel');
const noResults = document.getElementById('no-results');

// Pitch Filters Selectors
const pitchTypeSelect = document.getElementById('pitch-type-select');
const pitchAttrSliders = document.getElementById('pitch-attr-sliders');
const filterPitchSpeed = document.getElementById('filter-pitch-speed');
const filterPitchSpeedMax = document.getElementById('filter-pitch-speed-max');
const filterPitchControl = document.getElementById('filter-pitch-control');
const filterPitchBreak = document.getElementById('filter-pitch-break');
const filterPitchUsage = document.getElementById('filter-pitch-usage');

// Rarity Checkboxes
const rarityCheckboxes = {
  Diamond: document.getElementById('rarity-diamond'),
  Gold: document.getElementById('rarity-gold'),
  Silver: document.getElementById('rarity-silver'),
  Bronze: document.getElementById('rarity-bronze'),
  Common: document.getElementById('rarity-common'),
};

// Position Lists
const hitterPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'OF', 'IF'];
const pitcherPositions = ['SP', 'RP', 'CP'];

// Attribute Lists for Combined Search/Sort dropdowns
const hitterAttributes = {
  'contact_left': 'Contact vs L',
  'contact_right': 'Contact vs R',
  'power_left': 'Power vs L',
  'power_right': 'Power vs R',
  'plate_vision': 'Plate Vision',
  'plate_discipline': 'Discipline',
  'batting_clutch': 'Batting Clutch',
  'bunting_ability': 'Bunting',
  'drag_bunting_ability': 'Drag Bunting',
  'fielding_ability': 'Fielding',
  'arm_strength': 'Arm Strength',
  'arm_accuracy': 'Arm Accuracy',
  'reaction_left': 'Reaction',
  'speed': 'Speed',
  'base_stealing': 'Base Stealing',
  'baserunning_ability': 'Baserunning'
};
const pitcherAttributes = {
  'stamina': 'Stamina',
  'hits_per_bf_left': 'H/9 vs Left',
  'hits_per_bf_right': 'H/9 vs Right',
  'k_per_bf_left': 'K/9 vs Left',
  'k_per_bf_right': 'K/9 vs Right',
  'bb_per_bf': 'BB/9 (Control)',
  'hr_per_bf': 'HR/9',
  'pitching_clutch': 'Pitching Clutch',
  'pitch_velocity': 'Velocity',
  'pitch_control': 'Control',
  'pitch_movement': 'Movement',
  'fielding_ability': 'Fielding',
  'arm_strength': 'Arm Strength',
  'arm_accuracy': 'Arm Accuracy',
  'reaction_left': 'Reaction'
};

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadDatabase();
  renderLethalCombinations();
  loadLiveStats();
});

// Setup event listeners for sidebar filters
function setupEventListeners() {
  // Dual Range Sliders for OVR
  ovrMinInput.addEventListener('input', () => {
    let val = parseInt(ovrMinInput.value);
    let maxVal = parseInt(ovrMaxInput.value);
    if (val > maxVal) {
      ovrMinInput.value = maxVal;
      val = maxVal;
    }
    ovrMinVal.textContent = val;
    runFiltersAndSort();
  });

  ovrMaxInput.addEventListener('input', () => {
    let val = parseInt(ovrMaxInput.value);
    let minVal = parseInt(ovrMinInput.value);
    if (val < minVal) {
      ovrMaxInput.value = minVal;
      val = minVal;
    }
    ovrMaxVal.textContent = val;
    runFiltersAndSort();
  });

  // Search input with debounce
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    const clearBtn = document.getElementById('clear-search-name-btn');
    if (clearBtn) {
      clearBtn.style.display = searchInput.value ? 'block' : 'none';
    }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      runFiltersAndSort();
    }, 150);
  });

  // Select dropdowns
  teamSelect.addEventListener('change', runFiltersAndSort);
  seriesSelect.addEventListener('change', runFiltersAndSort);
  positionSelect.addEventListener('change', runFiltersAndSort);
  handSelect.addEventListener('change', runFiltersAndSort);
  specialSelect.addEventListener('change', runFiltersAndSort);
  inventorySelect.addEventListener('change', runFiltersAndSort);
  if (syncInventoryBtn) {
    syncInventoryBtn.addEventListener('click', syncInventoryFromExtension);
  }

  const select1 = document.getElementById('attr-select-1');
  const select2 = document.getElementById('attr-select-2');
  if (select1 && select2) {
    select1.addEventListener('change', onAttributeSelectChange);
    select2.addEventListener('change', onAttributeSelectChange);
  }

  // Rarity checkboxes
  Object.values(rarityCheckboxes).forEach(cb => {
    cb.addEventListener('change', runFiltersAndSort);
  });

  // Attribute thresholds range sliders
  const attributesToListen = [
    'filter-contact', 'filter-power', 'filter-speed', 'filter-fielding', 'filter-vision', 'filter-clutch',
    'filter-stamina', 'filter-h9', 'filter-k9', 'filter-bb9', 'filter-pclutch', 'filter-velocity'
  ];
  attributesToListen.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        const valSpan = document.getElementById(id.replace('filter', 'attr') + '-val');
        if (valSpan) valSpan.textContent = e.target.value;
        runFiltersAndSort();
      });
    }
  });

  // Weights sliders listener
  const weightSliders = document.querySelectorAll('.weight-slider');
  weightSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const displaySpan = document.getElementById(e.target.id.replace('w-', 'wi-'));
      if (displaySpan) displaySpan.textContent = e.target.value;
      if (enableCustomFormula.checked) {
        runFiltersAndSort();
      }
    });
  });

  // Enable custom formula checkbox
  enableCustomFormula.addEventListener('change', () => {
    // If enabling formula, force sort-by option to "custom"
    if (enableCustomFormula.checked) {
      sortBySelect.value = 'custom';
    } else if (sortBySelect.value === 'custom') {
      sortBySelect.value = 'ovr';
    }
    runFiltersAndSort();
  });

  // Pitch type select event listener
  if (pitchTypeSelect) {
    pitchTypeSelect.addEventListener('change', () => {
      const isAll = pitchTypeSelect.value === 'All';
      pitchAttrSliders.classList.toggle('hidden', isAll);
      runFiltersAndSort();
    });
  }

  // Pitch specific attribute sliders
  const pitchSliders = [
    { el: filterPitchSpeed, valSpanId: 'pitch-speed-val', suffix: ' MPH' },
    { el: filterPitchSpeedMax, valSpanId: 'pitch-speed-max-val', suffix: ' MPH' },
    { el: filterPitchControl, valSpanId: 'pitch-control-val', suffix: '' },
    { el: filterPitchBreak, valSpanId: 'pitch-break-val', suffix: '' },
    { el: filterPitchUsage, valSpanId: 'pitch-usage-val', suffix: '%' }
  ];

  pitchSliders.forEach(sliderInfo => {
    if (sliderInfo.el) {
      sliderInfo.el.addEventListener('input', (e) => {
        const valSpan = document.getElementById(sliderInfo.valSpanId);
        if (valSpan) {
          valSpan.textContent = e.target.value + sliderInfo.suffix;
        }
        runFiltersAndSort();
      });
    }
  });

  // Setup infinite scroll observer
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && filteredPlayers.length > renderLimit) {
      loadMoreCards();
    }
  }, { threshold: 0.1 });
  
  observer.observe(sentinel);

  // Enter key inside NLP prompt input
  const nlpInput = document.getElementById('nlp-prompt-input');
  if (nlpInput) {
    nlpInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applyNaturalLanguagePrompt();
      }
    });
  }
}

function setInventorySyncStatus(message) {
  if (inventorySyncStatus) {
    inventorySyncStatus.innerHTML = message;
  }
}

function updateInventorySyncStatusLabel() {
  const duplicateCardsCount = (currentInventoryData.cards || []).filter(c => (c.quantity || 1) >= 2).length;
  const savedUpdateTime = typeof localStorage !== 'undefined' ? localStorage.getItem('mlbInventoryUpdatedAt') : null;
  let statusHTML = `Loaded <strong>${ownedCardUuids.size.toLocaleString()}</strong> owned cards. (${duplicateCardsCount} duplicates)`;
  if (savedUpdateTime) {
    statusHTML += `<br><span style="opacity: 0.7; font-size: 0.65rem;">Updated: ${savedUpdateTime}</span>`;
  }
  setInventorySyncStatus(statusHTML);
}

function applyInventoryData(inventory, updateTime = null) {
  currentInventoryData = inventory || { cards: [] };
  updateInventoryState();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mlbInventoryData', JSON.stringify(currentInventoryData));
      if (updateTime) {
        localStorage.setItem('mlbInventoryUpdatedAt', updateTime);
      }
      if (inventory && inventory.exportedAt) {
        localStorage.setItem('mlbInventoryExportedAt', inventory.exportedAt);
      }
    }
  } catch (error) {
    console.warn('Unable to save inventory locally:', error);
  }

  updateInventorySyncStatusLabel();
  runFiltersAndSort();
}



function syncInventoryFromExtension() {
  if (!syncInventoryBtn) return;

  syncInventoryBtn.disabled = true;
  setInventorySyncStatus('Fetching LatestMLBInventoryLoad.json from data/ folder...');

  fetch('data/LatestMLBInventoryLoad.json?v=' + Date.now())
    .then(res => {
      if (!res.ok) {
        throw new Error('LatestMLBInventoryLoad.json not found in data/ directory.');
      }
      return res.json();
    })
    .then(data => {
      if (!data.cards) {
        throw new Error('File is not in raw inventory JSON format.');
      }
      setInventorySyncStatus(`Found LatestMLBInventoryLoad.json. Parsing...`);
      
      const fileDate = new Date(data.exportedAt || Date.now());
      const timeStr = fileDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' ' + fileDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      applyInventoryData(data, timeStr);
      syncInventoryBtn.disabled = false;
    })
    .catch(error => {
      console.warn('Auto-scan failed, opening manual file picker:', error);
      setInventorySyncStatus('Local scan unavailable. Please select your downloaded raw JSON file...');
      
      let fileInput = document.getElementById('manual-inventory-file-input');
      if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'manual-inventory-file-input';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) {
            syncInventoryBtn.disabled = false;
            updateInventorySyncStatusLabel();
            return;
          }
          
          setInventorySyncStatus(`Reading ${file.name}...`);
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const inventory = JSON.parse(event.target.result);
              if (!inventory.cards) {
                throw new Error('Selected file is not in raw inventory JSON format.');
              }
              const fileDate = new Date(inventory.exportedAt || Date.now());
              const timeStr = fileDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }) + ' ' + fileDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              });
              
              applyInventoryData(inventory, timeStr);
            } catch (err) {
              setInventorySyncStatus(`<span style="color: #ff5252;">Error: ${err.message}</span>`);
            }
            syncInventoryBtn.disabled = false;
          };
          reader.onerror = () => {
            setInventorySyncStatus('<span style="color: #ff5252;">Error reading file</span>');
            syncInventoryBtn.disabled = false;
          };
          reader.readAsText(file);
        });
      }
      
      fileInput.click();
    });
}


// Fetch database
function loadDatabase() {
  try {
    if (!window.MLB_PLAYERS_DATA) {
      throw new Error("window.MLB_PLAYERS_DATA is not defined. Make sure data/players.js is loaded.");
    }
    players = window.MLB_PLAYERS_DATA;
    totalCardCount.textContent = players.length.toLocaleString();
    
    // Re-evaluate inventory state now that the player database is loaded
    updateInventoryState();
    
    // Render last updated metadata if present
    const updatedEl = document.getElementById('logo-last-updated');
    if (updatedEl && window.MLB_PLAYERS_METADATA && window.MLB_PLAYERS_METADATA.lastUpdated) {
      updatedEl.textContent = `Last Updated: ${window.MLB_PLAYERS_METADATA.lastUpdated}`;
    }
    
    // Populate Team and Series filters
    populateDropdowns();
    
    // Switch positions select based on default hitter tab
    updatePositionsDropdown();
    
    // Switch attributes select dropdowns based on default hitter tab
    updateAttributesDropdowns();
    
    // Run initial search
    updateInventorySyncStatusLabel();
    runFiltersAndSort();
  } catch (error) {
    console.error('Error loading cards database:', error);
    cardsGrid.innerHTML = `
      <div class="no-results">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff5252" stroke-width="1.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <p>Failed to load player database. Make sure data/players.js is loaded.</p>
      </div>
    `;
  }
}

// Populate Teams and Series filter options dynamically
function populateDropdowns() {
  const teams = new Set();
  const seriesList = new Set();
  
  players.forEach(p => {
    if (p.team) teams.add(p.team);
    if (p.series) seriesList.add(p.series);
  });
  
  // Sort and add teams
  Array.from(teams).sort().forEach(team => {
    const opt = document.createElement('option');
    opt.value = team;
    opt.textContent = team;
    teamSelect.appendChild(opt);
  });

  // Sort and add series
  Array.from(seriesList).sort().forEach(series => {
    const opt = document.createElement('option');
    opt.value = series;
    opt.textContent = series;
    seriesSelect.appendChild(opt);
  });
}

// Toggle positions options on type switch
function updatePositionsDropdown() {
  const label = document.getElementById('position-select-label');
  if (label) {
    label.textContent = activeType === 'hitter' ? 'Position' : 'Pitcher Type';
  }

  positionSelect.innerHTML = activeType === 'hitter' 
    ? '<option value="All">All Positions</option>' 
    : '<option value="All">All Pitcher Types</option>';
    
  const list = activeType === 'hitter' ? hitterPositions : pitcherPositions;
  
  const positionNames = {
    'C': 'C (Catcher)',
    '1B': '1B (First Base)',
    '2B': '2B (Second Base)',
    '3B': '3B (Third Base)',
    'SS': 'SS (Shortstop)',
    'LF': 'LF (Left Field)',
    'CF': 'CF (Center Field)',
    'RF': 'RF (Right Field)',
    'DH': 'DH (Designated Hitter)',
    'OF': 'OF (Outfielders)',
    'IF': 'IF (Infielders)',
    'SP': 'SP (Starting Pitcher)',
    'RP': 'RP (Relief Pitcher)',
    'CP': 'CP (Closing Pitcher)'
  };
  
  list.forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos;
    opt.textContent = positionNames[pos] || pos;
    positionSelect.appendChild(opt);
  });
}

// Populate Attributes filter options dynamically
function updateAttributesDropdowns() {
  const select1 = document.getElementById('attr-select-1');
  const select2 = document.getElementById('attr-select-2');
  if (!select1 || !select2) return;
  
  const val1 = select1.value || 'none';
  const val2 = select2.value || 'none';
  
  select1.innerHTML = '<option value="none">-- Attribute 1 --</option>';
  select2.innerHTML = '<option value="none">-- Attribute 2 --</option>';
  
  const attrs = activeType === 'hitter' ? hitterAttributes : pitcherAttributes;
  
  Object.entries(attrs).forEach(([key, name]) => {
    const opt1 = document.createElement('option');
    opt1.value = key;
    opt1.textContent = name;
    select1.appendChild(opt1);
    
    const opt2 = document.createElement('option');
    opt2.value = key;
    opt2.textContent = name;
    select2.appendChild(opt2);
  });
  
  // Restore previous values if still valid, otherwise default to none
  if (attrs[val1]) select1.value = val1;
  if (attrs[val2]) select2.value = val2;
}
window.updateAttributesDropdowns = updateAttributesDropdowns;

// Handle attribute dropdown changes
function onAttributeSelectChange() {
  const attr1 = document.getElementById('attr-select-1').value;
  const attr2 = document.getElementById('attr-select-2').value;
  
  if (attr1 !== 'none' || attr2 !== 'none') {
    sortBySelect.value = 'combined';
  } else {
    if (sortBySelect.value === 'combined') {
      sortBySelect.value = 'ovr';
    }
  }
  
  runFiltersAndSort();
}
window.onAttributeSelectChange = onAttributeSelectChange;

// Switch between Hitters and Pitchers tabs
function switchPlayerType(type) {
  if (activeType === type) return;
  activeType = type;
  
  // Update Tabs style
  document.getElementById('tab-hitter').classList.toggle('active', type === 'hitter');
  document.getElementById('tab-pitcher').classList.toggle('active', type === 'pitcher');
  
  // Toggle Attribute Filter panels
  document.getElementById('hitter-attribute-filters').classList.toggle('hidden', type !== 'hitter');
  document.getElementById('pitcher-attribute-filters').classList.toggle('hidden', type !== 'pitcher');
  
  // Toggle Pitch specific filter section
  const pitchFiltersSect = document.getElementById('pitch-filters-section');
  if (pitchFiltersSect) {
    pitchFiltersSect.classList.toggle('hidden', type !== 'pitcher');
  }
  
  // Toggle Custom Formula Weights panels
  document.getElementById('hitter-weights').classList.toggle('hidden', type !== 'hitter');
  document.getElementById('pitcher-weights').classList.toggle('hidden', type !== 'pitcher');
  
  // Update position dropdown
  updatePositionsDropdown();

  // Update attributes dropdowns
  updateAttributesDropdowns();
  
  // Update sorting options
  const pitcherOpts = document.querySelectorAll('.pitcher-only');
  pitcherOpts.forEach(opt => {
    if (type === 'pitcher') {
      opt.classList.remove('hidden');
      opt.disabled = false;
    } else {
      opt.classList.add('hidden');
      opt.disabled = true;
    }
  });

  // Reset sorting if it is mismatched for the selected player type
  const currentSort = sortBySelect.value;
  if (type === 'hitter') {
    if (currentSort === 'stamina' || currentSort === 'velocity' || currentSort === 'velocity_differential') {
      sortBySelect.value = 'ovr';
    }
  } else if (type === 'pitcher') {
    if (currentSort === 'speed' || currentSort === 'contact' || currentSort === 'power') {
      sortBySelect.value = 'ovr';
    }
  }

  // Reset Filters
  resetSpecificTypeFilters();
  runFiltersAndSort();
}

// Reset specific thresholds when switching tabs
function resetSpecificTypeFilters() {
  positionSelect.value = 'All';
  handSelect.value = 'All';
  
  const hitterAttrs = ['filter-contact', 'filter-power', 'filter-speed', 'filter-fielding', 'filter-vision', 'filter-clutch'];
  const pitcherAttrs = ['filter-stamina', 'filter-h9', 'filter-k9', 'filter-bb9', 'filter-pclutch', 'filter-velocity'];
  
  const toReset = activeType === 'hitter' ? pitcherAttrs : hitterAttrs;
  toReset.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 0;
    const valSpan = document.getElementById(id.replace('filter', 'attr') + '-val');
    if (valSpan) valSpan.textContent = 0;
  });

  // Reset Pitch Specific filters when switching tabs
  if (activeType === 'hitter') {
    if (pitchTypeSelect) pitchTypeSelect.value = 'All';
    if (pitchAttrSliders) pitchAttrSliders.classList.add('hidden');
    if (filterPitchSpeed) filterPitchSpeed.value = 60;
    if (filterPitchSpeedMax) filterPitchSpeedMax.value = 105;
    if (filterPitchControl) filterPitchControl.value = 0;
    if (filterPitchBreak) filterPitchBreak.value = 0;
    if (filterPitchUsage) filterPitchUsage.value = 0;
    
    const speedSpan = document.getElementById('pitch-speed-val');
    if (speedSpan) speedSpan.textContent = '60 MPH';
    const speedMaxSpan = document.getElementById('pitch-speed-max-val');
    if (speedMaxSpan) speedMaxSpan.textContent = '105 MPH';
    const ctrlSpan = document.getElementById('pitch-control-val');
    if (ctrlSpan) ctrlSpan.textContent = '0';
    const breakSpan = document.getElementById('pitch-break-val');
    if (breakSpan) breakSpan.textContent = '0';
    const usageSpan = document.getElementById('pitch-usage-val');
    if (usageSpan) usageSpan.textContent = '0%';
  }
}

// Global reset all filters back to default
function resetFilters() {
  searchInput.value = '';
  const clearBtn = document.getElementById('clear-search-name-btn');
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }

  const nlpInput = document.getElementById('nlp-prompt-input');
  if (nlpInput) {
    nlpInput.value = '';
  }
  const nlpFeedback = document.getElementById('nlp-feedback');
  if (nlpFeedback) {
    nlpFeedback.classList.add('hidden');
    nlpFeedback.textContent = '';
  }

  ovrMinInput.value = 50;
  ovrMaxInput.value = 99;
  ovrMinVal.textContent = 50;
  ovrMaxVal.textContent = 99;
  teamSelect.value = 'All';
  seriesSelect.value = 'All';
  positionSelect.value = 'All';
  handSelect.value = 'All';
  specialSelect.value = 'All';
  inventorySelect.value = 'All';
  enableCustomFormula.checked = false;
  sortBySelect.value = 'ovr';

  // Reset attribute combined selectors
  const select1 = document.getElementById('attr-select-1');
  const select2 = document.getElementById('attr-select-2');
  if (select1) select1.value = 'none';
  if (select2) select2.value = 'none';
  
  // Reset checklist checkboxes
  Object.values(rarityCheckboxes).forEach(cb => {
    cb.checked = true;
  });

  // Reset all sliders
  const allRangeSliders = document.querySelectorAll('.filter-section input[type="range"]');
  allRangeSliders.forEach(slider => {
    if (slider.id !== 'ovr-min' && slider.id !== 'ovr-max') {
      slider.value = 0;
    }
  });

  // Reset indicator texts
  const valIndicators = document.querySelectorAll('.slider-header span:last-child');
  valIndicators.forEach(span => {
    span.textContent = '0';
  });

  // Reset weight values
  const defaultWeights = {
    // hitters
    'w-contact-l': 5, 'w-contact-r': 5, 'w-power-l': 5, 'w-power-r': 5, 'w-vision': 3, 'w-clutch': 4, 'w-fielding': 4, 'w-speed': 4, 'w-stealing': 2,
    // pitchers
    'w-stamina': 5, 'w-h9-l': 5, 'w-h9-r': 5, 'w-k9-l': 5, 'w-k9-r': 5, 'w-bb9': 4, 'w-pclutch': 4, 'w-velocity': 3, 'w-movement': 3
  };
  Object.entries(defaultWeights).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const wi = document.getElementById(id.replace('w-', 'wi-'));
    if (wi) wi.textContent = val;
  });

  // Reset Pitch Specific Filters
  if (pitchTypeSelect) {
    pitchTypeSelect.value = 'All';
  }
  if (pitchAttrSliders) {
    pitchAttrSliders.classList.add('hidden');
  }
  if (filterPitchSpeed) {
    filterPitchSpeed.value = 60;
    const speedVal = document.getElementById('pitch-speed-val');
    if (speedVal) speedVal.textContent = '60 MPH';
  }
  if (filterPitchSpeedMax) {
    filterPitchSpeedMax.value = 105;
    const speedMaxVal = document.getElementById('pitch-speed-max-val');
    if (speedMaxVal) speedMaxVal.textContent = '105 MPH';
  }
  if (filterPitchControl) {
    filterPitchControl.value = 0;
    const ctrlVal = document.getElementById('pitch-control-val');
    if (ctrlVal) ctrlVal.textContent = '0';
  }
  if (filterPitchBreak) {
    filterPitchBreak.value = 0;
    const breakVal = document.getElementById('pitch-break-val');
    if (breakVal) breakVal.textContent = '0';
  }
  if (filterPitchUsage) {
    filterPitchUsage.value = 0;
    const usageVal = document.getElementById('pitch-usage-val');
    if (usageVal) usageVal.textContent = '0%';
  }

  runFiltersAndSort();
}

// Apply formula weights preset
function applyPreset(presetType) {
  enableCustomFormula.checked = true;
  sortBySelect.value = 'custom';
  
  const presets = {
    'contact_speed': {
      'hitter': {'w-contact-l': 10, 'w-contact-r': 10, 'w-power-l': 2, 'w-power-r': 2, 'w-vision': 8, 'w-clutch': 6, 'w-fielding': 5, 'w-speed': 10, 'w-stealing': 7}
    },
    'power_clutch': {
      'hitter': {'w-contact-l': 4, 'w-contact-r': 4, 'w-power-l': 10, 'w-power-r': 10, 'w-vision': 3, 'w-clutch': 8, 'w-fielding': 3, 'w-speed': 2, 'w-stealing': 1}
    },
    'defensive_speed': {
      'hitter': {'w-contact-l': 3, 'w-contact-r': 3, 'w-power-l': 1, 'w-power-r': 1, 'w-vision': 5, 'w-clutch': 4, 'w-fielding': 10, 'w-speed': 9, 'w-stealing': 5}
    },
    'ace_starter': {
      'pitcher': {'w-stamina': 9, 'w-h9-l': 8, 'w-h9-r': 8, 'w-k9-l': 7, 'w-k9-r': 7, 'w-bb9': 8, 'w-pclutch': 8, 'w-velocity': 6, 'w-movement': 8}
    },
    'strikeout_king': {
      'pitcher': {'w-stamina': 4, 'w-h9-l': 6, 'w-h9-r': 6, 'w-k9-l': 10, 'w-k9-r': 10, 'w-bb9': 4, 'w-pclutch': 7, 'w-velocity': 9, 'w-movement': 9}
    }
  };

  const currentPreset = presets[presetType];
  if (!currentPreset) return;

  // Make sure we are on correct tab
  const typeNeeded = currentPreset.hitter ? 'hitter' : 'pitcher';
  if (activeType !== typeNeeded) {
    switchPlayerType(typeNeeded);
  }

  const values = currentPreset[typeNeeded];
  Object.entries(values).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const wi = document.getElementById(id.replace('w-', 'wi-'));
    if (wi) wi.textContent = val;
  });

  runFiltersAndSort();
}

// Update Sort Direction UI icon to match the state
function updateSortDirectionIcon() {
  const icon = document.getElementById('sort-dir-icon');
  if (icon && typeof icon.setAttribute === 'function') {
    if (sortAscending) {
      // Ascending icon path
      icon.setAttribute('d', 'M3 8l4-4 4 4M7 4v16M21 16l-4 4-4-4M17 20V4');
    } else {
      // Descending icon path
      icon.setAttribute('d', 'M3 16l4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16');
    }
  }
}

// Toggle Sort Direction
function toggleSortDirection() {
  sortAscending = !sortAscending;
  updateSortDirectionIcon();
  runFiltersAndSort();
}

// Switch between grid and list layouts
function switchView(mode) {
  if (viewMode === mode) return;
  viewMode = mode;
  document.getElementById('view-grid').classList.toggle('active', mode === 'grid');
  document.getElementById('view-list').classList.toggle('active', mode === 'list');
  
  cardsGrid.className = `cards-grid layout-${mode}`;
  
  // Re-render
  renderLimit = 60;
  renderCards(true);
}

// Set active position priority mode ('primary' or 'secondary')
function setPriorityMode(mode) {
  if (activePriorityMode === mode) return;
  activePriorityMode = mode;
  
  const btnPrimary = document.getElementById('btn-priority-primary');
  const btnSecondary = document.getElementById('btn-priority-secondary');
  if (btnPrimary && btnSecondary) {
    btnPrimary.classList.toggle('active', mode === 'primary');
    btnSecondary.classList.toggle('active', mode === 'secondary');
  }
  
  runFiltersAndSort();
}
window.setPriorityMode = setPriorityMode;

function matchesSpecialCompetition(player, selectedSpecial) {
  if (selectedSpecial === 'All') return true;

  const locations = (player.locations || []).map(loc => String(loc).toLowerCase());

  if (selectedSpecial === 'events') {
    const hasEventEligibilityData = players.some(p => typeof p.event === 'boolean');
    if (hasEventEligibilityData) {
      return player.event === true || locations.some(loc => loc.includes('event'));
    }
    return locations.includes('multiplayer') || locations.some(loc => loc.includes('event'));
  }

  if (selectedSpecial === 'battle-royal') {
    return true;
  }

  return true;
}

function getVelocityDifferential(p) {
  const pitchList = p.pitches && p.pitches.pitches ? p.pitches.pitches : [];
  if (pitchList.length < 2) return 0;
  let maxSpeed = -Infinity;
  let minSpeed = Infinity;
  pitchList.forEach(pt => {
    const speed = pt.speed || pt.velocity || 0;
    if (speed > 0) {
      if (speed > maxSpeed) maxSpeed = speed;
      if (speed < minSpeed) minSpeed = speed;
    }
  });
  return (maxSpeed > -Infinity && minSpeed < Infinity) ? (maxSpeed - minSpeed) : 0;
}

// Main filter & sorting process
function runFiltersAndSort() {
  const query = searchInput.value.toLowerCase().trim();
  const minOvr = parseInt(ovrMinInput.value);
  const maxOvr = parseInt(ovrMaxInput.value);
  const selectedTeam = teamSelect.value;
  const selectedSeries = seriesSelect.value;
  const selectedPos = positionSelect.value;
  const handValue = handSelect.value;
  const selectedSpecial = specialSelect.value;
  const selectedInventory = inventorySelect.value;
  
  // Rarities filter
  const activeRarities = Object.entries(rarityCheckboxes)
    .filter(([_, cb]) => cb.checked)
    .map(([r, _]) => r);
    
  // Threshold values
  const threshContact = parseInt(document.getElementById('filter-contact')?.value || 0);
  const threshPower = parseInt(document.getElementById('filter-power')?.value || 0);
  const threshSpeed = parseInt(document.getElementById('filter-speed')?.value || 0);
  const threshFielding = parseInt(document.getElementById('filter-fielding')?.value || 0);
  const threshVision = parseInt(document.getElementById('filter-vision')?.value || 0);
  const threshClutch = parseInt(document.getElementById('filter-clutch')?.value || 0);
  
  const threshStamina = parseInt(document.getElementById('filter-stamina')?.value || 0);
  const threshH9 = parseInt(document.getElementById('filter-h9')?.value || 0);
  const threshK9 = parseInt(document.getElementById('filter-k9')?.value || 0);
  const threshBB9 = parseInt(document.getElementById('filter-bb9')?.value || 0);
  const threshPClutch = parseInt(document.getElementById('filter-pclutch')?.value || 0);
  const threshVelocity = parseInt(document.getElementById('filter-velocity')?.value || 0);

  // Pitch specific thresholds
  const selectedPitchType = pitchTypeSelect ? pitchTypeSelect.value : 'All';
  const threshPitchSpeed = parseInt(filterPitchSpeed?.value || 60);
  const threshPitchSpeedMax = parseInt(filterPitchSpeedMax?.value || 105);
  const threshPitchControl = parseInt(filterPitchControl?.value || 0);
  const threshPitchBreak = parseInt(filterPitchBreak?.value || 0);
  const threshPitchUsage = parseInt(filterPitchUsage?.value || 0);

  // Read Weights
  const weights = getFormulaWeights();

  // 1. FILTERING
  filteredPlayers = players.filter(p => {
    // Filter by Hitter vs Pitcher
    const isHitter = p.is_hitter;
    if (activeType === 'hitter' && !isHitter) return false;
    if (activeType === 'pitcher' && isHitter) return false;
    
    // Search query match across multiple text fields (name, team, series, born, position)
    if (query) {
      const matchName = p.name && matchPlayerNameFuzzy(p.name, query);
      const matchTeam = p.team && p.team.toLowerCase().includes(query);
      const matchSeries = p.series && p.series.toLowerCase().includes(query);
      const matchBorn = p.born && p.born.toLowerCase().includes(query);
      const matchPosition = p.display_position && p.display_position.toLowerCase().includes(query);
      const matchSecondaryPosition = p.display_secondary_positions && p.display_secondary_positions.toLowerCase().includes(query);
      
      if (!matchName && !matchTeam && !matchSeries && !matchBorn && !matchPosition && !matchSecondaryPosition) {
        return false;
      }
    }
    
    // Overall Range
    if (p.ovr < minOvr || p.ovr > maxOvr) return false;
    
    // Rarity
    const cardRarity = p.rarity === 'Red Diamond' ? 'Diamond' : p.rarity;
    if (!activeRarities.includes(cardRarity)) return false;
    
    // Team
    if (selectedTeam !== 'All' && p.team !== selectedTeam) return false;
    
    // Series
    if (selectedSeries !== 'All' && p.series !== selectedSeries) return false;

    // Special competition availability
    if (!matchesSpecialCompetition(p, selectedSpecial)) return false;

    // Inventory ownership
    if (selectedInventory !== 'All') {
      const isOwned = ownedCardUuids.has(p.uuid);
      const quantity = inventoryQuantities.get(p.uuid) || 0;
      if (selectedInventory === 'owned' && !isOwned) return false;
      if (selectedInventory === 'duplicates' && quantity < 2) return false;
      if (selectedInventory === 'not-owned' && isOwned) return false;
      if (selectedInventory === 'favorites' && !favoritedCardUuids.has(p.uuid)) return false;
      if (selectedInventory === 'sellable' && (!isOwned || inventorySellable.get(p.uuid) === false)) return false;
      if (selectedInventory === 'no-sell' && (!isOwned || inventorySellable.get(p.uuid) !== false)) return false;
    }
    
    // Position (Matches primary display position or secondary lists)
    if (selectedPos !== 'All') {
      let isMatch = false;
      if (selectedPos === 'OF') {
        const ofPositions = ['LF', 'CF', 'RF'];
        const pPos = p.display_position;
        const sPos = p.display_secondary_positions ? p.display_secondary_positions.split(', ') : [];
        isMatch = ofPositions.includes(pPos) || sPos.some(pos => ofPositions.includes(pos));
      } else if (selectedPos === 'IF') {
        const ifPositions = ['1B', '2B', '3B', 'SS'];
        const pPos = p.display_position;
        const sPos = p.display_secondary_positions ? p.display_secondary_positions.split(', ') : [];
        isMatch = ifPositions.includes(pPos) || sPos.some(pos => ifPositions.includes(pos));
      } else {
        const matchPrimary = p.display_position === selectedPos;
        const matchSecondary = p.display_secondary_positions && p.display_secondary_positions.split(', ').includes(selectedPos);
        isMatch = matchPrimary || matchSecondary;
      }
      if (!isMatch) return false;
    }

    // Throw/Bat Hands
    if (handValue !== 'All') {
      if (activeType === 'hitter') {
        if (p.bat_hand !== handValue) return false;
      } else {
        if (p.throw_hand !== handValue) return false;
      }
    }

    // Specific Hitter Thresholds
    if (activeType === 'hitter') {
      if (threshContact > 0 && Math.max(p.contact_left || 0, p.contact_right || 0) < threshContact) return false;
      if (threshPower > 0 && Math.max(p.power_left || 0, p.power_right || 0) < threshPower) return false;
      if (threshSpeed > 0 && (p.speed || 0) < threshSpeed) return false;
      if (threshFielding > 0 && (p.fielding_ability || 0) < threshFielding) return false;
      if (threshVision > 0 && (p.plate_vision || 0) < threshVision) return false;
      if (threshClutch > 0 && (p.batting_clutch || 0) < threshClutch) return false;
    }

    // Specific Pitcher Thresholds
    if (activeType === 'pitcher') {
      if (threshStamina > 0 && (p.stamina || 0) < threshStamina) return false;
      if (threshH9 > 0 && Math.max(p.hits_per_bf_left || 0, p.hits_per_bf_right || 0) < threshH9) return false;
      if (threshK9 > 0 && Math.max(p.k_per_bf_left || 0, p.k_per_bf_right || 0) < threshK9) return false;
      if (threshBB9 > 0 && (p.bb_per_bf || 0) < threshBB9) return false;
      if (threshPClutch > 0 && (p.pitching_clutch || 0) < threshPClutch) return false;
      if (threshVelocity > 0 && (p.pitch_velocity || 0) < threshVelocity) return false;
      if (threshSpeed > 0 && (p.speed || 0) < threshSpeed) return false;
      if (threshFielding > 0 && (p.fielding_ability || 0) < threshFielding) return false;

      // Specific Pitch Type & Attributes Check
      if (selectedPitchType !== 'All') {
        const pitchList = p.pitches && p.pitches.pitches ? p.pitches.pitches : [];
        const matchingPitch = pitchList.find(pt => pt.name === selectedPitchType);
        
        if (!matchingPitch) return false;
        
        // Speed/velocity (mph)
        const pitchSpeed = matchingPitch.speed || matchingPitch.velocity || 0;
        if (pitchSpeed < threshPitchSpeed || pitchSpeed > threshPitchSpeedMax) return false;
        
        // Control
        const pitchCtrl = matchingPitch.control || 0;
        if (pitchCtrl < threshPitchControl) return false;
        
        // Break/movement
        const pitchBreak = matchingPitch.movement || 0;
        if (pitchBreak < threshPitchBreak) return false;
        
        // Usage percentage
        const pitchUsage = matchingPitch.usage || 0;
        if (pitchUsage < threshPitchUsage) return false;
      }
    }

    return true;
  });

  // Calculate dynamic custom and combined scores for matched players
  const attr1 = document.getElementById('attr-select-1')?.value || 'none';
  const attr2 = document.getElementById('attr-select-2')?.value || 'none';

  filteredPlayers.forEach(p => {
    p.customScore = calculateCustomScore(p, weights);
    
    // Combined score calculation (average of selected attributes, or defaults to OVR)
    let scoreSum = 0;
    let count = 0;
    if (attr1 !== 'none') {
      scoreSum += p[attr1] || 0;
      count++;
    }
    if (attr2 !== 'none') {
      scoreSum += p[attr2] || 0;
      count++;
    }
    p.combinedScore = count > 0 ? Math.round(scoreSum / count) : p.ovr;
  });

  // 2. SORTING
  const sortBy = sortBySelect.value;
  
  filteredPlayers.sort((a, b) => {
    // 1. Position priority sorting (only runs if a position filter is active)
    if (selectedPos !== 'All') {
      let isPrimaryA = false;
      let isPrimaryB = false;
      
      if (selectedPos === 'OF') {
        const ofPositions = ['LF', 'CF', 'RF'];
        isPrimaryA = ofPositions.includes(a.display_position);
        isPrimaryB = ofPositions.includes(b.display_position);
      } else if (selectedPos === 'IF') {
        const ifPositions = ['1B', '2B', '3B', 'SS'];
        isPrimaryA = ifPositions.includes(a.display_position);
        isPrimaryB = ifPositions.includes(b.display_position);
      } else {
        isPrimaryA = a.display_position === selectedPos;
        isPrimaryB = b.display_position === selectedPos;
      }
      
      if (isPrimaryA !== isPrimaryB) {
        return activePriorityMode === 'primary'
          ? (isPrimaryB ? 1 : 0) - (isPrimaryA ? 1 : 0)
          : (isPrimaryA ? 1 : 0) - (isPrimaryB ? 1 : 0);
      }
    }

    let fieldA = 0;
    let fieldB = 0;
    
    if (sortBy === 'ovr') {
      fieldA = a.ovr || 0;
      fieldB = b.ovr || 0;
    } else if (sortBy === 'custom') {
      fieldA = a.customScore || 0;
      fieldB = b.customScore || 0;
    } else if (sortBy === 'combined') {
      fieldA = a.combinedScore || 0;
      fieldB = b.combinedScore || 0;
    } else if (sortBy === 'name') {
      // String sorting logic
      return sortAscending 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    } else if (sortBy === 'price') {
      const priceA = a.best_sell_price || a.best_buy_price || 0;
      const priceB = b.best_sell_price || b.best_buy_price || 0;
      if (priceA === 0 && priceB > 0) return 1;
      if (priceB === 0 && priceA > 0) return -1;
      if (priceA !== priceB) {
        return sortAscending ? priceA - priceB : priceB - priceA;
      }
    } else if (sortBy === 'live_average') {
      const keyA = normalizePlayerName(a.name) + (a.is_hitter ? '_hitter' : '_pitcher');
      const keyB = normalizePlayerName(b.name) + (b.is_hitter ? '_hitter' : '_pitcher');
      const statsA = (a.series === 'Live' && typeof liveStatsMap !== 'undefined')
        ? liveStatsMap.get(keyA)
        : null;
      const statsB = (b.series === 'Live' && typeof liveStatsMap !== 'undefined')
        ? liveStatsMap.get(keyB)
        : null;

      if (activeType === 'hitter') {
        let valA = 0;
        let valB = 0;
        if (statsA) valA = parseFloat(statsA.avg) || 0;
        if (statsB) valB = parseFloat(statsB.avg) || 0;
        fieldA = valA;
        fieldB = valB;
      } else {
        // Pitchers: sort by ERA (lower is better, so use negative for descending sort)
        let valA = 99.0;
        let valB = 99.0;
        if (statsA && statsA.era !== undefined) valA = parseFloat(statsA.era) ?? 99.0;
        if (statsB && statsB.era !== undefined) valB = parseFloat(statsB.era) ?? 99.0;
        fieldA = -valA;
        fieldB = -valB;
      }
    } else if (sortBy === 'speed') {
      fieldA = a.speed || 0;
      fieldB = b.speed || 0;
    } else if (sortBy === 'contact') {
      fieldA = Math.max(a.contact_left || 0, a.contact_right || 0);
      fieldB = Math.max(b.contact_left || 0, b.contact_right || 0);
    } else if (sortBy === 'power') {
      fieldA = Math.max(a.power_left || 0, a.power_right || 0);
      fieldB = Math.max(b.power_left || 0, b.power_right || 0);
    } else if (sortBy === 'stamina') {
      fieldA = a.stamina || 0;
      fieldB = b.stamina || 0;
    } else if (sortBy === 'velocity') {
      if (selectedPitchType !== 'All') {
        const pitchListA = a.pitches && a.pitches.pitches ? a.pitches.pitches : [];
        const pitchA = pitchListA.find(pt => pt.name === selectedPitchType);
        const pitchListB = b.pitches && b.pitches.pitches ? b.pitches.pitches : [];
        const pitchB = pitchListB.find(pt => pt.name === selectedPitchType);
        fieldA = pitchA ? (pitchA.speed || pitchA.velocity || 0) : 0;
        fieldB = pitchB ? (pitchB.speed || pitchB.velocity || 0) : 0;
      } else {
        fieldA = a.pitch_velocity || 0;
        fieldB = b.pitch_velocity || 0;
      }
    } else if (sortBy === 'velocity_differential') {
      fieldA = getVelocityDifferential(a);
      fieldB = getVelocityDifferential(b);
    }

    if (fieldA !== fieldB) {
      return sortAscending ? fieldA - fieldB : fieldB - fieldA;
    }
    // tie-breaker by overall rating
    return b.ovr - a.ovr;
  });

  // Update counts
  filteredCardCount.textContent = filteredPlayers.length.toLocaleString();
  resultsNum.textContent = filteredPlayers.length.toLocaleString();

  // Reset pagination limit
  renderLimit = 60;
  
  // Render cards
  renderCards(true);
}

// Get the current slider weights from side builder
function getFormulaWeights() {
  if (activeType === 'hitter') {
    return {
      contact_l: parseInt(document.getElementById('w-contact-l').value),
      contact_r: parseInt(document.getElementById('w-contact-r').value),
      power_l: parseInt(document.getElementById('w-power-l').value),
      power_r: parseInt(document.getElementById('w-power-r').value),
      vision: parseInt(document.getElementById('w-vision').value),
      clutch: parseInt(document.getElementById('w-clutch').value),
      fielding: parseInt(document.getElementById('w-fielding').value),
      speed: parseInt(document.getElementById('w-speed').value),
      stealing: parseInt(document.getElementById('w-stealing').value),
    };
  } else {
    return {
      stamina: parseInt(document.getElementById('w-stamina').value),
      h9_l: parseInt(document.getElementById('w-h9-l').value),
      h9_r: parseInt(document.getElementById('w-h9-r').value),
      k9_l: parseInt(document.getElementById('w-k9-l').value),
      k9_r: parseInt(document.getElementById('w-k9-r').value),
      bb9: parseInt(document.getElementById('w-bb9').value),
      pclutch: parseInt(document.getElementById('w-pclutch').value),
      velocity: parseInt(document.getElementById('w-velocity').value),
      movement: parseInt(document.getElementById('w-movement').value),
    };
  }
}

// Compute custom score for player
function calculateCustomScore(p, weights) {
  let scoreSum = 0;
  let weightSum = 0;
  
  if (activeType === 'hitter') {
    const mappings = [
      { val: p.contact_left, w: weights.contact_l },
      { val: p.contact_right, w: weights.contact_r },
      { val: p.power_left, w: weights.power_l },
      { val: p.power_right, w: weights.power_r },
      { val: p.plate_vision, w: weights.vision },
      { val: p.batting_clutch, w: weights.clutch },
      { val: p.fielding_ability, w: weights.fielding },
      { val: p.speed, w: weights.speed },
      { val: p.base_stealing, w: weights.stealing },
    ];
    
    mappings.forEach(m => {
      if (m.w > 0) {
        scoreSum += (m.val || 0) * m.w;
        weightSum += m.w;
      }
    });
  } else {
    const mappings = [
      { val: p.stamina, w: weights.stamina },
      { val: p.hits_per_bf_left, w: weights.h9_l },
      { val: p.hits_per_bf_right, w: weights.h9_r },
      { val: p.k_per_bf_left, w: weights.k9_l },
      { val: p.k_per_bf_right, w: weights.k9_r },
      { val: p.bb_per_bf, w: weights.bb9 },
      { val: p.pitching_clutch, w: weights.pclutch },
      { val: p.pitch_velocity, w: weights.velocity },
      { val: p.pitch_movement, w: weights.movement },
    ];

    mappings.forEach(m => {
      if (m.w > 0) {
        scoreSum += (m.val || 0) * m.w;
        weightSum += m.w;
      }
    });
  }
  
  return weightSum > 0 ? Math.round(scoreSum / weightSum) : 0;
}

// Format market values compactly (e.g. 202.5K)
function formatMarketPrice(val) {
  if (val === null || val === undefined || val === 0) return '';
  if (val >= 1000000) {
    return (val / 1000000).toFixed(1) + 'M';
  }
  if (val >= 1000) {
    const kVal = val / 1000;
    if (Number.isInteger(kVal)) {
      return kVal + 'K';
    }
    return kVal.toFixed(1) + 'K';
  }
  return val.toString();
}

// Render dynamic players cards into the grid
function renderCards(clearExisting = true) {
  if (clearExisting) {
    cardsGrid.innerHTML = '';
  }
  
  if (filteredPlayers.length === 0) {
    if (searchInput.value.trim()) {
      const otherType = activeType === 'hitter' ? 'pitcher' : 'hitter';
      const query = searchInput.value.toLowerCase().trim();
      const matchesInOtherTab = players.filter(p => {
        if (otherType === 'hitter' && !p.is_hitter) return false;
        if (otherType === 'pitcher' && p.is_hitter) return false;
        return p.name && matchPlayerNameFuzzy(p.name, query);
      });
      
      if (matchesInOtherTab.length > 0) {
        noResults.innerHTML = `
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          <p>No ${activeType === 'hitter' ? 'hitters' : 'pitchers'} match "${searchInput.value.trim()}" in the active tab.</p>
          <p style="font-size: 0.95rem; margin-top: 5px; color: #00f2fe;">Found <strong>${matchesInOtherTab.length}</strong> matching ${otherType === 'hitter' ? 'hitter' : 'pitcher'}${matchesInOtherTab.length > 1 ? 's' : ''} in the <strong>${otherType === 'hitter' ? 'Hitters' : 'Pitchers'}</strong> tab!</p>
          <button class="btn" style="margin-top: 12px; font-size: 0.85rem; padding: 6px 12px;" onclick="switchPlayerType('${otherType}')">Switch to ${otherType === 'hitter' ? 'Hitters' : 'Pitchers'}</button>
        `;
      } else {
        noResults.innerHTML = `
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          <p>No players match your active filters. Try loosening your thresholds!</p>
        `;
      }
    } else {
      noResults.innerHTML = `
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        <p>No players match your active filters. Try loosening your thresholds!</p>
      `;
    }
    noResults.classList.remove('hidden');
    sentinel.classList.add('hidden');
    return;
  }
  
  noResults.classList.add('hidden');
  sentinel.classList.remove('hidden');

  const showCustomRating = enableCustomFormula.checked;
  const showCombinedRating = sortBySelect.value === 'combined';
  const showDiffRating = sortBySelect.value === 'velocity_differential';
  const cardsToRender = filteredPlayers.slice(
    clearExisting ? 0 : cardsGrid.querySelectorAll('.player-card').length, 
    renderLimit
  );

  cardsToRender.forEach(p => {
    const isCompared = comparedPlayers.some(c => c.uuid === p.uuid);
    const quantity = inventoryQuantities.get(p.uuid) || 0;
    const isOwned = quantity > 0;
    const isSellable = inventorySellable.get(p.uuid) !== false;
    const ownedBadge = isOwned ? `<span class="owned-card-badge">${quantity >= 2 ? `Owned: ${quantity}` : 'Owned'}</span>` : '';
    const noSellBadge = (isOwned && !isSellable) ? `<span class="no-sell-card-badge">No Sell</span>` : '';
    const cardEl = document.createElement('div');
    cardEl.className = `player-card ${p.rarity.toLowerCase().replace(/ /g, '-')}`;
    cardEl.setAttribute('data-uuid', p.uuid);
    
    // Set card visual image - fallback to baked or normal
    const cardImage = p.baked_img || p.img || '';

    // Create cards structures based on Grid vs List layouts
    const isFavorite = favoritedCardUuids.has(p.uuid);

    // Generate series text (incorporating live stats and link if available)
    let seriesHTML = `<span class="card-series">${p.series}</span>`;
    if (p.series === 'Live' && typeof liveStatsMap !== 'undefined') {
      const statsKey = normalizePlayerName(p.name) + (p.is_hitter ? '_hitter' : '_pitcher');
      const stats = liveStatsMap.get(statsKey);
      if (stats) {
        const displayStat = p.is_hitter ? stats.avg : `${stats.era} ERA`;
        seriesHTML = `<span class="card-series">Live <a href="${stats.url}" target="_blank" class="live-avg-link" title="Open MLB official profile (Season: ${stats.year})" onclick="event.stopPropagation();">(${displayStat})</a></span>`;
      }
    }

    if (viewMode === 'grid') {
      cardEl.innerHTML = `
        <div class="card-visual-wrapper" onclick="openDetailsModal('${p.uuid}')">
          <div class="card-badges-left">
            <span class="card-pos-badge">${p.display_position}</span>
            ${ownedBadge}
            ${noSellBadge}
            <button class="compare-checkbox-btn ${isCompared ? 'selected' : ''}" onclick="toggleCompare(event, '${p.uuid}')">
              ${isCompared ? 'Added' : 'Compare'}
            </button>
          </div>
          <button class="favorite-heart-btn ${isFavorite ? 'favorited' : ''}" onclick="toggleFavorite(event, '${p.uuid}')" title="Toggle Favorite">
            <svg viewBox="0 0 24 24" fill="${isFavorite ? '#ff4b4b' : 'none'}" stroke="${isFavorite ? '#ff4b4b' : '#fff'}" stroke-width="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
          ${showCustomRating ? `<span class="card-custom-badge">FIT: ${p.customScore}</span>` : ''}
          ${showCombinedRating ? `<span class="card-custom-badge" style="background: var(--accent-cyan); color: #0b0f19; border-color: var(--accent-cyan);">COMB: ${p.combinedScore}</span>` : ''}
          ${showDiffRating ? `<span class="card-custom-badge" style="background: #e91e63; color: #fff; border-color: #e91e63;">DIFF: ${getVelocityDifferential(p)} MPH</span>` : ''}
          <img class="card-art-img" src="${cardImage}" alt="${p.name}" loading="lazy">
        </div>
        <div class="card-info" onclick="openDetailsModal('${p.uuid}')">
          <div class="card-name" title="${p.name}">
            <span class="player-name-text">${p.name}</span>
            ${(p.best_buy_price || p.best_sell_price) ? `
              <span class="card-market-price">(B: ${formatMarketPrice(p.best_buy_price)} / S: ${formatMarketPrice(p.best_sell_price)})</span>
            ` : `
              <span class="card-market-price">(Not in Market)</span>
            `}
          </div>
          <div class="card-subtext">
            ${seriesHTML}
            <span class="card-team">${p.team_short_name || p.team || ''}</span>
          </div>
        </div>
        <div class="card-stats-preview" onclick="openDetailsModal('${p.uuid}')">
          ${getQuickStatsHTML(p)}
        </div>
      `;
    } else {
      // List Mode Layout
      cardEl.innerHTML = `
        <span class="card-ovr-badge">${p.ovr}</span>
        <div class="card-visual-wrapper" onclick="openDetailsModal('${p.uuid}')">
          <img class="card-art-img" src="${cardImage}" alt="${p.name}" loading="lazy">
        </div>
        <div class="card-info" onclick="openDetailsModal('${p.uuid}')">
          <div class="card-name" title="${p.name}">
            <span class="player-name-text">${p.name}</span>
            ${(p.best_buy_price || p.best_sell_price) ? `
              <span class="card-market-price">(B: ${formatMarketPrice(p.best_buy_price)} / S: ${formatMarketPrice(p.best_sell_price)})</span>
            ` : `
              <span class="card-market-price">(Not in Market)</span>
            `}
          </div>
          <div class="card-subtext">
            ${seriesHTML}
            <span class="card-team">${p.team_short_name || p.team || ''}</span>
          </div>
        </div>
        <div class="card-pos-owned-group">
          <span class="card-pos-badge">${p.display_position}</span>
          ${isOwned ? `<span class="list-owned-label">${quantity >= 2 ? `Owned: ${quantity}` : 'Owned'}${noSellBadge ? ` <span class="no-sell-list-badge">No Sell</span>` : ''}</span>` : ''}
        </div>
        <div class="card-stats-preview" onclick="openDetailsModal('${p.uuid}')">
          ${getQuickStatsHTML(p)}
        </div>
        ${showCustomRating ? `<span class="card-custom-badge">FIT: ${p.customScore}</span>` : ''}
        ${showCombinedRating ? `<span class="card-custom-badge" style="background: var(--accent-cyan); color: #0b0f19; border-color: var(--accent-cyan);">COMB: ${p.combinedScore}</span>` : ''}
        ${showDiffRating ? `<span class="card-custom-badge" style="background: #e91e63; color: #fff; border-color: #e91e63;">DIFF: ${getVelocityDifferential(p)} MPH</span>` : ''}
        <button class="favorite-heart-btn list-mode ${isFavorite ? 'favorited' : ''}" onclick="toggleFavorite(event, '${p.uuid}')" title="Toggle Favorite">
          <svg viewBox="0 0 24 24" fill="${isFavorite ? '#ff4b4b' : 'none'}" stroke="${isFavorite ? '#ff4b4b' : '#fff'}" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
        <button class="compare-checkbox-btn ${isCompared ? 'selected' : ''}" onclick="toggleCompare(event, '${p.uuid}')">
          ${isCompared ? 'Added' : 'Compare'}
        </button>
      `;
    }

    cardsGrid.appendChild(cardEl);
  });

  // Hide loading helper if loaded everything
  const renderedCardsCount = cardsGrid.querySelectorAll('.player-card').length;
  if (renderedCardsCount >= filteredPlayers.length) {
    sentinel.classList.add('hidden');
  } else {
    sentinel.classList.remove('hidden');
    cardsGrid.appendChild(sentinel);
  }
}

// Generate small stats block preview for cards
function getQuickStatsHTML(p) {
  if (p.is_hitter) {
    return `
      <div class="stat-item">
        <span class="stat-item-label">CON</span>
        <span class="stat-item-val">${Math.round((p.contact_left + p.contact_right) / 2)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">POW</span>
        <span class="stat-item-val">${Math.round((p.power_left + p.power_right) / 2)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">SPD</span>
        <span class="stat-item-val">${p.speed || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">FLD</span>
        <span class="stat-item-val">${p.fielding_ability || 0}</span>
      </div>
    `;
  } else {
    return `
      <div class="stat-item">
        <span class="stat-item-label">STA</span>
        <span class="stat-item-val">${p.stamina || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">VEL</span>
        <span class="stat-item-val">${p.pitch_velocity || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">H/9</span>
        <span class="stat-item-val">${Math.round(((p.hits_per_bf_left || 0) + (p.hits_per_bf_right || 0)) / 2)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">K/9</span>
        <span class="stat-item-val">${Math.round(((p.k_per_bf_left || 0) + (p.k_per_bf_right || 0)) / 2)}</span>
      </div>
    `;
  }
}

// Incremental lazy loader
function loadMoreCards() {
  renderLimit += renderIncrement;
  renderCards(false);
}

// Toggle players comparison status
function toggleCompare(event, uuid) {
  event.stopPropagation();
  const player = players.find(p => p.uuid === uuid);
  if (!player) return;

  const index = comparedPlayers.findIndex(c => c.uuid === uuid);
  
  if (index > -1) {
    // Remove
    comparedPlayers.splice(index, 1);
  } else {
    // Add (limit to 4)
    if (comparedPlayers.length >= 4) {
      alert("You can compare up to 4 players at a time.");
      return;
    }
    comparedPlayers.push(player);
  }

  // Update card buttons states
  const cards = document.querySelectorAll(`[data-uuid="${uuid}"]`);
  cards.forEach(c => {
    const btn = c.querySelector('.compare-checkbox-btn');
    if (btn) {
      btn.classList.toggle('selected', index === -1);
      btn.textContent = index === -1 ? 'Added' : 'Compare';
    }
  });

  updateCompareDrawer();
}

// Update bottom Compare drawer view
function updateCompareDrawer() {
  const drawer = document.getElementById('comparison-drawer');
  const countSpan = document.getElementById('compare-count');
  const slotsContainer = document.getElementById('compare-slots-container');
  
  countSpan.textContent = comparedPlayers.length;

  // Manage drawer display status (Show if has selections)
  if (comparedPlayers.length > 0) {
    drawer.classList.remove('hidden');
  } else {
    drawer.classList.add('hidden');
    drawer.classList.add('collapsed');
  }

  // Render Slots
  slotsContainer.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    slot.className = 'compare-slot';
    
    if (i < comparedPlayers.length) {
      const p = comparedPlayers[i];
      slot.className = 'compare-slot filled';
      slot.innerHTML = `
        <img class="slot-img" src="${p.baked_img || p.img || ''}" alt="${p.name}">
        <div class="slot-info">
          <a href="https://mlb26.theshow.com/items/${p.uuid}" target="_blank" class="slot-name" title="Open on MLB The Show website">${p.name}</a>
          <div class="slot-ovr-pos">OVR ${p.ovr} &bull; ${p.display_position}</div>
        </div>
        <button class="remove-slot-btn" onclick="toggleCompare(event, '${p.uuid}')">&times;</button>
      `;
    } else {
      slot.innerHTML = `<span>Empty Slot</span>`;
    }
    
    slotsContainer.appendChild(slot);
  }
}

// Toggle drawer collapsed status
function toggleDrawer() {
  const drawer = document.getElementById('comparison-drawer');
  drawer.classList.toggle('collapsed');
}

// Clear all compared selections
function clearComparison(event) {
  event.stopPropagation();
  comparedPlayers = [];
  
  // Reset all buttons
  const buttons = document.querySelectorAll('.compare-checkbox-btn');
  buttons.forEach(btn => {
    btn.classList.remove('selected');
    btn.textContent = 'Compare';
  });

  updateCompareDrawer();
}

// Open modal side by side comparison grid
function openComparisonModal(event) {
  event.stopPropagation();
  if (comparedPlayers.length === 0) return;

  const modal = document.getElementById('compare-modal');
  const table = document.getElementById('compare-table');
  modal.classList.add('active');

  // Build Table
  let html = '';
  
  // Headers with cards images
  html += `<thead><tr><th>Attribute</th>`;
  comparedPlayers.forEach(p => {
    html += `
      <th>
        <div class="compare-player-header">
          <img class="compare-card-thumbnail" src="${p.baked_img || p.img || ''}" alt="${p.name}">
          <a href="https://mlb26.theshow.com/items/${p.uuid}" target="_blank" class="compare-player-name" title="Open on MLB The Show website">${p.name}</a>
          <span class="card-rarity-pill ${p.rarity.toLowerCase().replace(/ /g, '-')}" style="font-size:0.6rem; padding:1px 5px">${p.rarity}</span>
        </div>
      </th>
    `;
  });
  html += `</tr></thead><tbody>`;

  // Row definition: OVR
  html += `<tr><td><strong>Overall (OVR)</strong></td>`;
  const maxOvr = Math.max(...comparedPlayers.map(p => p.ovr || 0));
  comparedPlayers.forEach(p => {
    html += `<td class="${p.ovr === maxOvr ? 'compare-val-best' : ''}">${p.ovr}</td>`;
  });
  html += `</tr>`;

  // Define attributes row list based on type
  let rows = [];
  if (activeType === 'hitter') {
    rows = [
      { label: 'Contact Left', key: 'contact_left' },
      { label: 'Contact Right', key: 'contact_right' },
      { label: 'Power Left', key: 'power_left' },
      { label: 'Power Right', key: 'power_right' },
      { label: 'Plate Vision', key: 'plate_vision' },
      { label: 'Plate Discipline', key: 'plate_discipline' },
      { label: 'Batting Clutch', key: 'batting_clutch' },
      { label: 'Bunting Ability', key: 'bunting_ability' },
      { label: 'Drag Bunting', key: 'drag_bunting_ability' },
      { label: 'Fielding Ability', key: 'fielding_ability' },
      { label: 'Arm Strength', key: 'arm_strength' },
      { label: 'Arm Accuracy', key: 'arm_accuracy' },
      { label: 'Speed', key: 'speed' },
      { label: 'Base Stealing', key: 'base_stealing' },
      { label: 'Reaction', key: 'reaction_left' },
    ];
  } else {
    rows = [
      { label: 'Stamina', key: 'stamina' },
      { label: 'H/9 vs Left', key: 'hits_per_bf_left' },
      { label: 'H/9 vs Right', key: 'hits_per_bf_right' },
      { label: 'K/9 vs Left', key: 'k_per_bf_left' },
      { label: 'K/9 vs Right', key: 'k_per_bf_right' },
      { label: 'BB/9 (Control)', key: 'bb_per_bf' },
      { label: 'HR/9', key: 'hr_per_bf' },
      { label: 'Pitching Clutch', key: 'pitching_clutch' },
      { label: 'Pitch Velocity', key: 'pitch_velocity' },
      { label: 'Pitch Control', key: 'pitch_control' },
      { label: 'Pitch Movement', key: 'pitch_movement' },
    ];
  }

  // Generate Table body rows
  rows.forEach(r => {
    html += `<tr><td>${r.label}</td>`;
    const maxVal = Math.max(...comparedPlayers.map(p => p[r.key] || 0));
    comparedPlayers.forEach(p => {
      const val = p[r.key] || 0;
      const isBest = val === maxVal && maxVal > 0;
      html += `<td class="${isBest ? 'compare-val-best' : ''}">${val}</td>`;
    });
    html += `</tr>`;
  });

  // Bio values row helper
  const bioRows = [
    { label: 'Age', key: 'age' },
    { label: 'Bats', key: 'bat_hand' },
    { label: 'Throws', key: 'throw_hand' },
    { label: 'Height', key: 'height' },
    { label: 'Weight', key: 'weight' },
    { label: 'Born', key: 'born' },
  ];
  
  bioRows.forEach(r => {
    html += `<tr style="opacity: 0.75"><td>${r.label}</td>`;
    comparedPlayers.forEach(p => {
      html += `<td>${p[r.key] || 'N/A'}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody>`;
  table.innerHTML = html;
}

// Open detail view modal for individual card
function openDetailsModal(uuid) {
  const p = players.find(x => x.uuid === uuid);
  if (!p) return;

  window.activeDetailPlayer = p;
  const whereToFindText = document.getElementById('where-to-find-text');
  if (whereToFindText) {
    whereToFindText.innerHTML = getCardAcquisitionMethod(p);
  }

  // Reset Captain Level and render eligible Captains
  window.activeCaptainLevel = 3;
  const levelBtns = document.querySelectorAll('.captain-level-selector .level-btn');
  levelBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.textContent) === 3);
  });
  if (typeof renderEligibleCaptains === 'function') {
    renderEligibleCaptains();
  }

  const modal = document.getElementById('detail-modal');
  modal.classList.add('active');

  // Card Image Visual
  document.getElementById('detail-card-img').src = p.baked_img_lg || p.baked_img || p.img || '';

  // Set card overlay status (Owned / No Sell)
  const overlayEl = document.getElementById('detail-card-overlay');
  if (overlayEl) {
    const qty = inventoryQuantities.get(p.uuid) || 0;
    const isOwned = qty > 0;
    const isSellable = inventorySellable.get(p.uuid) !== false;
    
    if (isOwned) {
      overlayEl.style.display = 'block';
      if (!isSellable) {
        overlayEl.innerHTML = `No Sell`;
        overlayEl.className = 'detail-card-badge no-sell';
      } else {
        overlayEl.innerHTML = qty >= 2 ? `Owned x${qty}` : `Owned`;
        overlayEl.className = 'detail-card-badge owned';
      }
    } else {
      overlayEl.style.display = 'none';
    }
  }

  // Set detail modal favorite button state
  const detailBtn = document.getElementById('detail-favorite-btn');
  if (detailBtn) {
    const isFav = favoritedCardUuids.has(p.uuid);
    detailBtn.classList.toggle('favorited', isFav);
    detailBtn.onclick = (e) => toggleFavorite(e, p.uuid);
    const svg = detailBtn.querySelector('svg');
    if (svg) {
      svg.setAttribute('fill', isFav ? '#ff4b4b' : 'none');
      svg.setAttribute('stroke', isFav ? '#ff4b4b' : '#fff');
    }
  }
  
  // Title & headers
  const detailNameEl = document.getElementById('detail-name');
  if (detailNameEl) {
    detailNameEl.innerHTML = `<a href="https://mlb26.theshow.com/items/${p.uuid}" target="_blank" class="detail-name-link" title="Open on MLB The Show website">${p.name}</a>`;
  }
  
  const positionFullNames = {
    'SP': 'Starting Pitcher',
    'RP': 'Relief Pitcher',
    'CP': 'Closing Pitcher',
    'C': 'Catcher',
    '1B': 'First Base',
    '2B': 'Second Base',
    '3B': 'Third Base',
    'SS': 'Shortstop',
    'LF': 'Left Field',
    'CF': 'Center Field',
    'RF': 'Right Field',
    'DH': 'Designated Hitter',
    'OF': 'Outfield',
    'IF': 'Infield'
  };
  const mainPosName = positionFullNames[p.display_position] || p.display_position;
  
  let detailSeriesHTML = p.series;
  if (p.series === 'Live' && typeof liveStatsMap !== 'undefined') {
    const statsKey = normalizePlayerName(p.name) + (p.is_hitter ? '_hitter' : '_pitcher');
    const stats = liveStatsMap.get(statsKey);
    if (stats) {
      const displayStat = p.is_hitter ? stats.avg : `${stats.era} ERA`;
      detailSeriesHTML = `Live <a href="${stats.url}" target="_blank" class="live-avg-link" title="Open MLB official profile (Season: ${stats.year})" onclick="event.stopPropagation();">(${displayStat})</a>`;
    }
  }

  document.getElementById('detail-sub-meta').innerHTML = `${detailSeriesHTML} &bull; OVR ${p.ovr} &bull; ${mainPosName} (${p.display_position})${p.display_secondary_positions ? ` &bull; Sec: ${p.display_secondary_positions}` : ''}`;
  
  // Rarity pill
  const rarityPill = document.getElementById('detail-rarity');
  rarityPill.className = `card-rarity-pill ${p.rarity.toLowerCase().replace(/ /g, '-')}`;
  rarityPill.textContent = p.rarity;

  // Render Stats Grid
  const statsGrid = document.getElementById('detail-stats-grid');
  statsGrid.innerHTML = '';
  
  let attributes = [];
  if (p.is_hitter) {
    attributes = [
      { label: 'Contact vs L', val: p.contact_left },
      { label: 'Contact vs R', val: p.contact_right },
      { label: 'Power vs L', val: p.power_left },
      { label: 'Power vs R', val: p.power_right },
      { label: 'Plate Vision', val: p.plate_vision },
      { label: 'Plate Discipline', val: p.plate_discipline },
      { label: 'Batting Clutch', val: p.batting_clutch },
      { label: 'Bunting Ability', val: p.bunting_ability },
      { label: 'Drag Bunting', val: p.drag_bunting_ability },
      { label: 'Fielding Ability', val: p.fielding_ability },
      { label: 'Arm Strength', val: p.arm_strength },
      { label: 'Arm Accuracy', val: p.arm_accuracy },
      { label: 'Reaction', val: p.reaction_left },
      { label: 'Speed', val: p.speed },
      { label: 'Base Stealing', val: p.base_stealing },
      { label: 'Baserunning Ability', val: p.baserunning_ability }
    ];
    // Hide pitch tab
    document.getElementById('detail-pitch-tab-btn').classList.add('hidden');
  } else {
    // Pitcher
    attributes = [
      { label: 'Stamina', val: p.stamina },
      { label: 'H/9 vs Left', val: p.hits_per_bf_left },
      { label: 'H/9 vs Right', val: p.hits_per_bf_right },
      { label: 'K/9 vs Left', val: p.k_per_bf_left },
      { label: 'K/9 vs Right', val: p.k_per_bf_right },
      { label: 'BB/9 (Control)', val: p.bb_per_bf },
      { label: 'HR/9', val: p.hr_per_bf },
      { label: 'Pitching Clutch', val: p.pitching_clutch },
      { label: 'Pitch Velocity', val: p.pitch_velocity },
      { label: 'Pitch Control', val: p.pitch_control },
      { label: 'Pitch Movement', val: p.pitch_movement },
      { label: 'Fielding Ability', val: p.fielding_ability },
      { label: 'Arm Strength', val: p.arm_strength },
      { label: 'Arm Accuracy', val: p.arm_accuracy },
      { label: 'Reaction', val: p.reaction_left },
      { label: 'Speed', val: p.speed },
      { label: 'Base Stealing', val: p.base_stealing },
      { label: 'Baserunning Ability', val: p.baserunning_ability }
    ];
    // Show pitch tab
    document.getElementById('detail-pitch-tab-btn').classList.remove('hidden');
    
    // Fill pitches list
    renderPitchesList(p);
  }

  // Append bars
  attributes.forEach(attr => {
    if (attr.val !== undefined && attr.val !== null) {
      statsGrid.appendChild(createAttributeBarHTML(attr.label, attr.val));
    }
  });

  // Fill Quirks
  const quirksList = document.getElementById('detail-quirks-list');
  quirksList.innerHTML = '';
  if (p.quirks && p.quirks.length > 0) {
    p.quirks.forEach(q => {
      const qEl = document.createElement('div');
      qEl.className = 'quirk-badge';
      
      let badgeContent = '';
      if (typeof q === 'object' && q !== null) {
        const name = q.name || '';
        const desc = q.description || '';
        const img = q.img || '';
        
        qEl.setAttribute('title', desc);
        if (img) {
          badgeContent = `
            <img src="${img}" alt="${name}" style="width: 20px; height: 20px; object-fit: contain;">
            <span>${name}</span>
          `;
        } else {
          badgeContent = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:var(--accent-cyan)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span>${name}</span>
          `;
        }
      } else {
        badgeContent = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:var(--accent-cyan)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span>${q}</span>
        `;
      }
      
      qEl.innerHTML = badgeContent;
      quirksList.appendChild(qEl);
    });
  } else {
    quirksList.innerHTML = `<p style="grid-column: 1 / -1; color: var(--text-dark); font-style:italic">No quirks available for this card.</p>`;
  }

  // Fill Bios
  document.getElementById('bio-age').textContent = p.age || 'N/A';
  document.getElementById('bio-hands').textContent = `${p.bat_hand || '?'}/${p.throw_hand || '?'}`;
  document.getElementById('bio-height').textContent = p.height || 'N/A';
  document.getElementById('bio-weight').textContent = p.weight || 'N/A';
  document.getElementById('bio-jersey').textContent = p.jersey_number || 'N/A';
  document.getElementById('bio-born').textContent = p.born || 'N/A';

  // Force reset tab panel viewing status back to stats
  switchDetailTab('stats');
}

// Generate attribute percentage-like progress bar
function createAttributeBarHTML(label, value) {
  const el = document.createElement('div');
  el.className = 'detailed-stat-bar-group';
  
  // Decide denominator based on attribute label (max 125 vs max 99 stats)
  const max125Labels = [
    'Contact vs L', 'Contact vs R', 'Contact vs Left', 'Contact vs Right',
    'Power vs L', 'Power vs R', 'Power vs Left', 'Power vs Right',
    'Plate Vision', 'Plate Discipline',
    'Batting Clutch', 'Pitching Clutch',
    'H/9 vs Left', 'H/9 vs Right', 'H/9 vs L', 'H/9 vs R',
    'K/9 vs Left', 'K/9 vs Right', 'K/9 vs L', 'K/9 vs R',
    'Stamina'
  ];
  
  const denominator = max125Labels.includes(label) ? 125 : 99;
  const pct = Math.min(100, (value / denominator) * 100);
  
  // Style ratings colors
  let ratingClass = 'stat-low';
  if (value >= 100) ratingClass = 'stat-elite';
  else if (value >= 76) ratingClass = 'stat-high';
  else if (value >= 51) ratingClass = 'stat-med';

  el.innerHTML = `
    <div class="detailed-stat-label-row">
      <span>${label}</span>
      <span class="detailed-stat-value">${value}</span>
    </div>
    <div class="detailed-stat-bar-track">
      <div class="detailed-stat-bar-fill ${ratingClass}" style="width: ${pct}%"></div>
    </div>
  `;
  return el;
}

// Render pitch details for individual pitcher
function renderPitchesList(p) {
  const container = document.getElementById('detail-pitches-list');
  container.innerHTML = '';

  const pitchData = p.pitches && p.pitches.pitches ? p.pitches.pitches : [];
  
  if (pitchData.length > 0) {
    // Render single table header
    const header = document.createElement('div');
    header.className = 'pitches-header';
    header.innerHTML = `
      <span>Pitch</span>
      <span>Velocity</span>
      <span>Break</span>
      <span>Quality</span>
      <span>Usage</span>
    `;
    container.appendChild(header);

    pitchData.forEach(pitch => {
      const el = document.createElement('div');
      el.className = 'pitch-item';
      el.innerHTML = `
        <span class="pitch-name">${pitch.name}</span>
        <span class="pitch-val">${pitch.speed ? pitch.speed + ' MPH' : 'N/A'}</span>
        <span class="pitch-val">${pitch.movement || 0}</span>
        <span class="pitch-val quality-val">${pitch.rating || 0}</span>
        <span class="pitch-val">${pitch.usage ? pitch.usage + '%' : '0%'}</span>
      `;
      container.appendChild(el);
    });
  } else {
    container.innerHTML = `<p style="color: var(--text-dark); font-style:italic">No pitch analytics details found.</p>`;
  }
}

// Detail panel tab toggling logic
function switchDetailTab(panelName) {
  // Update Tab buttons styles
  const buttons = document.querySelectorAll('.detail-tab-btn');
  buttons.forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    const isActive = onclickAttr.includes(`'${panelName}'`);
    btn.classList.toggle('active', isActive);
  });

  // Switch display panel visible statuses
  document.getElementById('panel-stats').classList.toggle('active', panelName === 'stats');
  document.getElementById('panel-pitches').classList.toggle('active', panelName === 'pitches');
  document.getElementById('panel-quirks').classList.toggle('active', panelName === 'quirks');
  document.getElementById('panel-location').classList.toggle('active', panelName === 'location');
  document.getElementById('panel-captains').classList.toggle('active', panelName === 'captains');
}

// Global modal close utility
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Natural Language Search Parser
function applyNaturalLanguagePrompt() {
  const promptInput = document.getElementById('nlp-prompt-input');
  if (!promptInput) return;
  let text = promptInput.value.toLowerCase().trim();
  // Strip common punctuation and quotes (keeping comparison signs >, <, =, and slashes /)
  text = text.replace(/[.,!?";:()\[\]{}*&%$#@^_~']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) {
    runFiltersAndSort();
    return;
  }

  // 1. Reset all filters to default first without rendering yet
  resetFiltersNoRender();

  // 2. Parse Player Type & Resolve Ambiguous Names from Database
  let hasExplicitType = text.includes('pitch') || text.includes('starter') || text.includes('reliever') || text.includes('closer') || text.includes('rotation') || text.includes('bullpen') || text.includes('sp ') || text.includes('rp ') || text.includes('cp ') || text.includes('hitter') || text.includes('batter') || text.includes('position player') ||
                        /\b(?:sinker|cutter|slider|changeup|curveball|sweeper|forkball|screwball|splitter|slurve|fastball)\b/.test(text);

  let type = 'hitter';
  if (text.includes('pitch') || text.includes('starter') || text.includes('reliever') || text.includes('closer') || text.includes('rotation') || text.includes('bullpen') || text.includes('sp ') || text.includes('rp ') || text.includes('cp ') ||
      /\b(?:sinker|cutter|slider|changeup|curveball|sweeper|forkball|screwball|splitter|slurve|fastball)\b/.test(text)) {
    type = 'pitcher';
  }

  // If type not explicitly set, check if the query contains a name matching a pitcher in the database
  const cleanedNameCheck = cleanQueryForName(text);
  if (!hasExplicitType && cleanedNameCheck.length >= 3) {
    const dbMatches = players.filter(p => p.name.toLowerCase().includes(cleanedNameCheck));
    if (dbMatches.length > 0) {
      const pitcherCount = dbMatches.filter(p => !p.is_hitter).length;
      if (pitcherCount > dbMatches.length / 2) {
        type = 'pitcher';
      }
    }
  }

  switchPlayerType(type); // Updates UI elements visibility and positions dropdown

  // Parse Pitch Filters (Pitchers Only)
  if (type === 'pitcher') {
    const pitchTypesList = [
      { value: 'Sinker', keys: ['sinker', 'sink'] },
      { value: 'Cutter', keys: ['cutter', 'cut'] },
      { value: 'Slider', keys: ['slider', 'slide'] },
      { value: 'Circle Change', keys: ['circle change', 'circlechange'] },
      { value: 'Splitter', keys: ['splitter', 'split'] },
      { value: 'Slurve', keys: ['slurve'] },
      { value: '12-6 Curve', keys: ['12-6 curve', '12 6 curve', '12-6'] },
      { value: 'Sweeper', keys: ['sweeper'] },
      { value: 'Knuckle-curve', keys: ['knuckle-curve', 'knuckle curve', 'knuckcurve'] },
      { value: 'Sweeping Curve', keys: ['sweeping curve', 'sweepingcurve'] },
      { value: 'Forkball', keys: ['forkball', 'fork'] },
      { value: 'Screwball', keys: ['screwball', 'screw'] },
      { value: 'Palmball', keys: ['palmball', 'palm'] },
      { value: 'Vulcan Change', keys: ['vulcan change', 'vulcanchange', 'vulcan'] },
      { value: '4-Seam Fastball', keys: ['4-seam fastball', '4 seam fastball', '4-seam', '4seam', 'fastball'] },
      { value: '2-Seam Fastball', keys: ['2-seam fastball', '2 seam fastball', '2-seam', '2seam'] },
      { value: 'Curveball', keys: ['curveball', 'curve'] },
      { value: 'Changeup', keys: ['changeup', 'change'] },
      { value: 'Knuckle', keys: ['knuckleball', 'knuckle'] }
    ];

    let detectedPitch = null;
    for (let pt of pitchTypesList) {
      for (let key of pt.keys) {
        if (text.includes(key)) {
          detectedPitch = pt.value;
          break;
        }
      }
      if (detectedPitch) break;
    }

    if (detectedPitch) {
      pitchTypeSelect.value = detectedPitch;
      pitchAttrSliders.classList.remove('hidden');

      const isMaxSpeed = /(?:under|below|less than|max|maximum|<|<=)/i.test(text);
      const speedVal = parsePitchAttributeValue(text, detectedPitch, ['speed', 'velocity', 'vel', 'mph'], pitchTypesList);
      if (speedVal !== null) {
        if (isMaxSpeed) {
          filterPitchSpeedMax.value = speedVal;
          document.getElementById('pitch-speed-max-val').textContent = speedVal + ' MPH';
        } else {
          filterPitchSpeed.value = speedVal;
          document.getElementById('pitch-speed-val').textContent = speedVal + ' MPH';
        }
      }

      const controlVal = parsePitchAttributeValue(text, detectedPitch, ['control', 'ctrl'], pitchTypesList);
      if (controlVal !== null) {
        filterPitchControl.value = controlVal;
        document.getElementById('pitch-control-val').textContent = controlVal;
      }

      const breakVal = parsePitchAttributeValue(text, detectedPitch, ['break', 'movement', 'mvt'], pitchTypesList);
      if (breakVal !== null) {
        filterPitchBreak.value = breakVal;
        document.getElementById('pitch-break-val').textContent = breakVal;
      }

      const usageVal = parsePitchAttributeValue(text, detectedPitch, ['usage', 'use', '%'], pitchTypesList);
      if (usageVal !== null) {
        filterPitchUsage.value = usageVal;
        document.getElementById('pitch-usage-val').textContent = usageVal + '%';
      }
    }
  }

  // 3. Parse Rarity
  let raritiesFound = [];
  if (text.includes('diamond')) raritiesFound.push('Diamond');
  if (text.includes('gold')) raritiesFound.push('Gold');
  if (text.includes('silver')) raritiesFound.push('Silver');
  if (text.includes('bronze')) raritiesFound.push('Bronze');
  if (text.includes('common')) raritiesFound.push('Common');

  if (raritiesFound.length > 0) {
    Object.entries(rarityCheckboxes).forEach(([rarity, cb]) => {
      cb.checked = raritiesFound.includes(rarity);
    });
  }

  // Parse Inventory / Favorites from keywords
  if (text.includes('favorite') || text.includes('bookmark') || text.includes('hearted') || text.includes('star')) {
    inventorySelect.value = 'favorites';
  } else if (text.includes('owned only') || text.includes('i own') || text.includes('my cards') || text.includes('my inventory')) {
    inventorySelect.value = 'owned';
  } else if (text.includes('duplicate') || text.includes('extra')) {
    inventorySelect.value = 'duplicates';
  } else if (text.includes('not owned') || text.includes('dont own') || text.includes("don't own") || text.includes('missing')) {
    inventorySelect.value = 'not-owned';
  } else if (text.includes('no sell') || text.includes('non sellable') || text.includes('un-sellable') || text.includes('unsellable') || text.includes('not sellable') || text.includes('nonsellable')) {
    inventorySelect.value = 'no-sell';
  } else if (text.includes('sellable') || text.includes('tradeable') || text.includes('tradable')) {
    inventorySelect.value = 'sellable';
  }

  // 4. Parse Teams
  const teamOptions = Array.from(teamSelect.options).map(o => o.value);
  for (let team of teamOptions) {
    if (team === 'All') continue;
    const teamLower = team.toLowerCase();
    if (text.includes(teamLower)) {
      teamSelect.value = team;
      break;
    }
    // Match abbreviations
    if (teamLower === 'red sox' && text.includes('bos')) { teamSelect.value = team; break; }
    if (teamLower === 'yankees' && text.includes('nyy')) { teamSelect.value = team; break; }
    if (teamLower === 'mets' && text.includes('nym')) { teamSelect.value = team; break; }
    if (teamLower === 'dodgers' && text.includes('lad')) { teamSelect.value = team; break; }
    if (teamLower === 'cubs' && text.includes('chc')) { teamSelect.value = team; break; }
    if (teamLower === 'giants' && text.includes('sf')) { teamSelect.value = team; break; }
    if (teamLower === 'braves' && text.includes('atl')) { teamSelect.value = team; break; }
    if (teamLower === 'diamondbacks' && (text.includes('arizona') || text.includes('dbacks') || text.includes('d-backs') || text.includes('d back'))) { teamSelect.value = team; break; }
  }

  // 5. Parse Positions (LF, CF, RF, Outfielders, Infielders, etc.)
  if (text.includes('outfielder') || text.includes('outfield') || text.includes(' of ') || text.endsWith(' of') || text.startsWith('of ')) {
    positionSelect.value = 'OF';
  } else if (text.includes('infielder') || text.includes('infield') || text.includes(' if ') || text.endsWith(' if') || text.startsWith('if ')) {
    if (text.includes('infielder') || text.includes('infield') || text.includes(' inf ')) {
      positionSelect.value = 'IF';
    }
  } else {
    const posOptions = activeType === 'hitter' ? hitterPositions : pitcherPositions;
    for (let pos of posOptions) {
      if (pos === 'OF' || pos === 'IF') continue;
      const posLower = pos.toLowerCase();
      let matches = false;
      
      if (text.includes(' ' + posLower + ' ') || text.startsWith(posLower + ' ') || text.endsWith(' ' + posLower) || text === posLower) matches = true;
      else if (posLower === 'c' && text.includes('catcher')) matches = true;
      else if (posLower === '1b' && (text.includes('1st base') || text.includes('first base'))) matches = true;
      else if (posLower === '2b' && (text.includes('2nd base') || text.includes('second base'))) matches = true;
      else if (posLower === '3b' && (text.includes('3rd base') || text.includes('third base'))) matches = true;
      else if (posLower === 'ss' && text.includes('shortstop')) matches = true;
      else if (posLower === 'lf' && (text.includes('left field') || text.includes('leftfield'))) matches = true;
      else if (posLower === 'cf' && (text.includes('center field') || text.includes('centerfield') || text.includes('cf '))) matches = true;
      else if (posLower === 'rf' && (text.includes('right field') || text.includes('rightfield'))) matches = true;
      else if (posLower === 'dh' && (text.includes('designated hitter') || text.includes('dh '))) matches = true;
      else if (posLower === 'sp' && (text.includes('starting pitcher') || text.includes('starter'))) matches = true;
      else if (posLower === 'rp' && (text.includes('relief pitcher') || text.includes('reliever'))) matches = true;
      else if (posLower === 'cp' && (text.includes('closer') || text.includes('cp '))) matches = true;

      if (matches) {
        positionSelect.value = pos;
        break;
      }
    }
  }

  // Handedness parsing
  if (text.includes('switch hitter') || text.includes('switch bat')) {
    handSelect.value = 'S';
  } else if (text.includes('left handed') || text.includes('lefty') || text.includes(' bats l') || text.includes('throws l')) {
    handSelect.value = 'L';
  } else if (text.includes('right handed') || text.includes('righty') || text.includes(' bats r') || text.includes('throws r')) {
    handSelect.value = 'R';
  }

  // 6. Parse Qualitative Descriptors (mapping adjectives to numeric thresholds)
  if (activeType === 'hitter') {
    if (text.includes('elite contact') || text.includes('contact over 95') || text.includes('contact > 95')) setAttrSlider('filter-contact', 'attr-contact-val', 95);
    else if (text.includes('high contact') || text.includes('good contact') || text.includes('contact over 85') || text.includes('contact > 85')) setAttrSlider('filter-contact', 'attr-contact-val', 85);
    else if (text.includes('contact')) setAttrSlider('filter-contact', 'attr-contact-val', 75);

    if (text.includes('elite power') || text.includes('power over 95') || text.includes('power > 95')) setAttrSlider('filter-power', 'attr-power-val', 95);
    else if (text.includes('high power') || text.includes('good power') || text.includes('power over 85') || text.includes('power > 85')) setAttrSlider('filter-power', 'attr-power-val', 85);
    else if (text.includes('power')) setAttrSlider('filter-power', 'attr-power-val', 75);

    if (text.includes('elite speed') || text.includes('fastest') || text.includes('speed over 95') || text.includes('speed > 95')) setAttrSlider('filter-speed', 'attr-speed-val', 95);
    else if (text.includes('high speed') || text.includes('fast') || text.includes('speed over 85') || text.includes('speed > 85')) setAttrSlider('filter-speed', 'attr-speed-val', 85);
    else if (text.includes('speed')) setAttrSlider('filter-speed', 'attr-speed-val', 70);

    if (text.includes('elite fielding') || text.includes('glove') || text.includes('gold glove') || text.includes('fielding over 95')) setAttrSlider('filter-fielding', 'attr-fielding-val', 90);
    else if (text.includes('high fielding') || text.includes('good defense') || text.includes('fielding over 85')) setAttrSlider('filter-fielding', 'attr-fielding-val', 80);
    else if (text.includes('fielding') || text.includes('defense')) setAttrSlider('filter-fielding', 'attr-fielding-val', 70);
  } else {
    if (text.includes('high stamina') || text.includes('stamina over 80') || text.includes('stamina > 80')) setAttrSlider('filter-stamina', 'attr-stamina-val', 80);
    else if (text.includes('stamina')) setAttrSlider('filter-stamina', 'attr-stamina-val', 60);

    if (text.includes('elite h/9') || text.includes('elite h9') || text.includes('h/9 over 95') || text.includes('h9 over 95')) setAttrSlider('filter-h9', 'attr-h9-val', 95);
    else if (text.includes('high h/9') || text.includes('high h9') || text.includes('good h/9') || text.includes('h/9 over 80')) setAttrSlider('filter-h9', 'attr-h9-val', 80);
    else if (text.includes('h/9') || text.includes('h9')) setAttrSlider('filter-h9', 'attr-h9-val', 70);

    if (text.includes('strikeout') || text.includes('high k/9') || text.includes('high k9') || text.includes('k/9 over 90')) setAttrSlider('filter-k9', 'attr-k9-val', 90);
    else if (text.includes('k/9') || text.includes('k9')) setAttrSlider('filter-k9', 'attr-k9-val', 75);

    if (text.includes('control') || text.includes('high bb/9') || text.includes('high bb9') || text.includes('bb/9 over 80')) setAttrSlider('filter-bb9', 'attr-bb9-val', 80);
    else if (text.includes('bb/9') || text.includes('bb9')) setAttrSlider('filter-bb9', 'attr-bb9-val', 70);

    if (text.includes('velocity') || text.includes('throw hard') || text.includes('vel over 80')) setAttrSlider('filter-velocity', 'attr-velocity-val', 80);
    else if (text.includes('velocity') || text.includes('vel')) setAttrSlider('filter-velocity', 'attr-velocity-val', 70);

    if (text.includes('elite speed') || text.includes('speed over 80')) setAttrSlider('filter-speed', 'attr-speed-val', 80);
    else if (text.includes('high speed') || text.includes('speed over 60')) setAttrSlider('filter-speed', 'attr-speed-val', 60);
  }

  // 7. Parse Explicit Numeric Thresholds (both speed 99 and 99 speed formats)
  const staminaVal = parseAttributeValue(text, ['stamina', 'sta']);
  if (staminaVal !== null) setAttrSlider('filter-stamina', 'attr-stamina-val', staminaVal);

  const speedVal = parseAttributeValue(text, ['speed', 'spd', 'run', 'fast']);
  if (speedVal !== null) {
    if (activeType === 'pitcher') {
      setAttrSlider('filter-velocity', 'attr-velocity-val', speedVal);
    } else {
      setAttrSlider('filter-speed', 'attr-speed-val', speedVal);
    }
  }

  const contactVal = parseAttributeValue(text, ['contact', 'con']);
  if (contactVal !== null) setAttrSlider('filter-contact', 'attr-contact-val', contactVal);

  const powerVal = parseAttributeValue(text, ['power', 'pow']);
  if (powerVal !== null) setAttrSlider('filter-power', 'attr-power-val', powerVal);

  const fieldingVal = parseAttributeValue(text, ['fielding', 'field', 'fld', 'defense', 'glove']);
  if (fieldingVal !== null) setAttrSlider('filter-fielding', 'attr-fielding-val', fieldingVal);

  const visionVal = parseAttributeValue(text, ['vision', 'vis']);
  if (visionVal !== null) setAttrSlider('filter-vision', 'attr-vision-val', visionVal);

  const clutchVal = parseAttributeValue(text, ['clutch']);
  if (clutchVal !== null) {
    setAttrSlider('filter-clutch', 'attr-clutch-val', clutchVal);
    setAttrSlider('filter-pclutch', 'attr-pclutch-val', clutchVal);
  }

  const h9Val = parseAttributeValue(text, ['h/9', 'h9', 'hits']);
  if (h9Val !== null) setAttrSlider('filter-h9', 'attr-h9-val', h9Val);

  const k9Val = parseAttributeValue(text, ['k/9', 'k9', 'strikeouts', 'k']);
  if (k9Val !== null) setAttrSlider('filter-k9', 'attr-k9-val', k9Val);

  const bb9Val = parseAttributeValue(text, ['bb/9', 'bb9', 'control', 'walks']);
  if (bb9Val !== null) setAttrSlider('filter-bb9', 'attr-bb9-val', bb9Val);

  const velocityVal = parseAttributeValue(text, ['velocity', 'vel']);
  if (velocityVal !== null) setAttrSlider('filter-velocity', 'attr-velocity-val', velocityVal);

  // Parse OVR Min/Max
  const ovrMinMatch = text.match(/(?:overall|ovr|rating|ratings|pitch|pitching|hitter|hitting|card|cards|player|players)\s*(?:over|above|greater than|more than|>|>=)?\s*(\d+)/i) || text.match(/(\d+)\s*(?:overall|ovr|rating|ratings|pitch|pitching|hitter|hitting|card|cards|player|players)/i);
  if (ovrMinMatch && ovrMinMatch[1]) {
    const val = parseInt(ovrMinMatch[1]);
    ovrMinInput.value = val;
    ovrMinVal.textContent = val;
  }
  const ovrMaxMatch = text.match(/(?:overall|ovr|rating|ratings|pitch|pitching|hitter|hitting|card|cards|player|players)\s*(?:under|below|less than|<|<=)\s*(\d+)/i);
  if (ovrMaxMatch && ovrMaxMatch[1]) {
    const val = parseInt(ovrMaxMatch[1]);
    ovrMaxInput.value = val;
    ovrMaxVal.textContent = val;
  }

  // 8. Extract remaining text as name search with database whitelist verification
  const nlpFeedback = document.getElementById('nlp-feedback');
  if (nlpFeedback) {
    nlpFeedback.classList.add('hidden');
    nlpFeedback.textContent = '';
  }

  if (cleanedNameCheck) {
    // Check if the candidate matches any player's name, team, series, birthplace, or position in the entire database (case-insensitive substring)
    const textExists = players.some(p => 
      (p.name && p.name.toLowerCase().includes(cleanedNameCheck)) ||
      (p.team && p.team.toLowerCase().includes(cleanedNameCheck)) ||
      (p.series && p.series.toLowerCase().includes(cleanedNameCheck)) ||
      (p.born && p.born.toLowerCase().includes(cleanedNameCheck)) ||
      (p.display_position && p.display_position.toLowerCase().includes(cleanedNameCheck))
    );
    
    if (textExists) {
      searchInput.value = cleanedNameCheck;
    } else {
      // Discard name filter, but show visual feedback in the UI
      searchInput.value = '';
      if (nlpFeedback) {
        nlpFeedback.textContent = `Note: No player matching "${cleanedNameCheck}" was found. Showing results for other filter criteria.`;
        nlpFeedback.classList.remove('hidden');
      }
      console.log(`NLP Parser ignored candidate keyword "${cleanedNameCheck}" as it matched 0 players in DB.`);
    }
  }

  // Parse Sorting from keywords
  if (text.includes('expensive') || text.includes('costly') || text.includes('priciest') || text.includes('pricey') || text.includes('highest price') || text.includes('most stubs')) {
    sortBySelect.value = 'price';
    sortAscending = false;
    updateSortDirectionIcon();
  } else if (text.includes('cheapest') || text.includes('cheap') || text.includes('least expensive') || text.includes('lowest price') || text.includes('affordable') || text.includes('least stubs')) {
    sortBySelect.value = 'price';
    sortAscending = true;
    updateSortDirectionIcon();
  } else if (text.includes('market') || text.includes('price') || text.includes('stubs') || text.includes('cost')) {
    sortBySelect.value = 'price';
    sortAscending = false;
    updateSortDirectionIcon();
  } else if (text.includes('differential')) {
    if (type === 'pitcher') {
      sortBySelect.value = 'velocity_differential';
      if (text.includes('lowest') || text.includes('least') || text.includes('minimum') || text.includes('min') || text.includes('slowest') || text.includes('slow')) {
        if (text.includes('highest') || text.includes('higest') || text.includes('greatest') || text.includes('max') || text.includes('most')) {
          sortAscending = false;
        } else {
          sortAscending = true;
        }
      } else {
        sortAscending = false;
      }
      updateSortDirectionIcon();
    }
  } else if (text.includes('fastest') || text.includes('hardest') || text.includes('velocity') || text.includes('vel ') || text.endsWith(' vel') || text.includes('slowest') || text.includes('slow')) {
    if (type === 'pitcher') {
      sortBySelect.value = 'velocity';
    } else {
      sortBySelect.value = 'speed';
    }
    if (text.includes('slowest') || text.includes('slow')) {
      sortAscending = true;
    } else {
      sortAscending = false;
    }
    updateSortDirectionIcon();
  } else if (text.includes('contact') || text.includes('con ')) {
    sortBySelect.value = 'contact';
  } else if (text.includes('power') || text.includes('pow ')) {
    sortBySelect.value = 'power';
  } else if (text.includes('stamina') || text.includes('sta ')) {
    if (type === 'pitcher') {
      sortBySelect.value = 'stamina';
    }
  } else {
    sortBySelect.value = 'ovr';
  }

  runFiltersAndSort();
}

// Clean natural query to extract potential player name search keywords
function cleanQueryForName(text) {
  let nameQuery = text;
  
  // Remove rarities
  nameQuery = nameQuery.replace(/\b(?:diamond|gold|silver|bronze|common)\b/g, '');
  
  // Remove player types
  nameQuery = nameQuery.replace(/\b(?:hitters?|batters?|pitchers?|pitch(?:es)?|pitching|starters?|relievers?|closers?|position players?|cards?|players?)\b/g, '');
  
  // Remove teams list
  const teamsList = ['yankees', 'mets', 'red sox', 'dodgers', 'cubs', 'giants', 'braves', 'angels', 'astros', 'athletics', 'blue jays', 'brewers', 'cardinals', 'diamondbacks', 'guardians', 'mariners', 'marlins', 'nationals', 'orioles', 'padres', 'phillies', 'pirates', 'rangers', 'rays', 'reds', 'rockies', 'royals', 'tigers', 'twins', 'white sox', 'free agents'];
  teamsList.forEach(team => {
    nameQuery = nameQuery.replace(new RegExp('\\b' + team + '\\b', 'g'), '');
  });
  
  // Abbreviations
  nameQuery = nameQuery.replace(/\b(?:nyy|nym|bos|lad|chc|sf|atl|arizona|dbacks|d-backs)\b/g, '');
  
  // Positions
  const allPositions = ['c', '1b', '2b', '3b', 'ss', 'lf', 'cf', 'rf', 'dh', 'sp', 'rp', 'cp', 'catcher', 'first base', 'second base', 'third base', 'shortstop', 'outfielders?', 'infielders?', 'outfield', 'infield', 'starters?', 'relievers?', 'closers?'];
  allPositions.forEach(pos => {
    nameQuery = nameQuery.replace(new RegExp('\\b' + pos + '\\b', 'g'), '');
  });
  
  // Hands
  nameQuery = nameQuery.replace(/\b(?:switch hitter|switch bat|left handed|right handed|lefty|righty|bats|throws)\b/g, '');
  
  // Remove pitches
  const allPitches = ['4-seam fastball', '4 seam fastball', '4-seam', '4seam', 'fastball', 'sinker', 'sink', 'circle change', 'circlechange', 'slider', 'slide', 'cutter', 'cut', 'splitter', 'split', 'slurve', '12-6 curve', '12 6 curve', '12-6', 'sweeper', 'curveball', 'curve', 'changeup', 'change', 'knuckle-curve', 'knuckle curve', 'knuckcurve', 'sweeping curve', 'sweepingcurve', 'forkball', 'fork', 'screwball', 'screw', '2-seam fastball', '2 seam fastball', '2-seam', '2seam', 'palmball', 'palm', 'vulcan change', 'vulcanchange', 'vulcan', 'knuckleball', 'knuckle'];
  allPitches.forEach(pt => {
    nameQuery = nameQuery.replace(new RegExp('\\b' + pt + '\\b', 'g'), '');
  });
  
  // Numeric limits & attributes (both formats)
  nameQuery = nameQuery.replace(/(?:overall|ovr|rating|ratings|pitch|pitching|hitter|hitting|card|cards|player|players|speed|spd|run|fast|contact|con|power|pow|fielding|field|fld|defense|glove|vision|vis|clutch|stamina|sta|h\/9|h9|hits|k\/9|k9|strikeouts|k|bb\/9|bb9|control|walks|velocity|vel|break|movement|mvt|usage|use|mph|%)\s*(?:over|under|above|below|greater than|less than|more than|>|>=|<|<=)?\s*\d+/g, '');
  nameQuery = nameQuery.replace(/\d+\s*(?:overall|ovr|rating|ratings|pitch|pitching|hitter|hitting|card|cards|player|players|speed|spd|run|fast|contact|con|power|pow|fielding|field|fld|defense|glove|vision|vis|clutch|stamina|sta|h\/9|h9|hits|k\/9|k9|strikeouts|k|bb\/9|bb9|control|walks|velocity|vel|break|movement|mvt|usage|use|mph|%)\b/g, '');
  
  // Qualitative words & filler
  nameQuery = nameQuery.replace(/\b(?:elite|high|good|bad|low|average|slowest|slow|fastest|fast|hardest|hard|highest|higest|lowest|greatest|maximum|minimum|max|min|differential|differentials|diff|velocity|vel|speed|spd|mph|with|from|has|having|whose|and|the|a|an|of|in|for|to|find|search|get|give|show|list|display|select|filter|want|need|i|me|who|which|what|how|many|most|least|best|worst|expensive|cheap|cheapest|costly|priciest|pricey|affordable|stubs|cost|market|price|prices|that|it|them|is|are|have|had|do|does|did|be|been|was|were|database|look|looking|at|on|by|mlb|show|theshow|the_show|please|pls|can|could|would|you|your|my|some|any|all|sellable|tradeable|tradable|no-sell|nosell|un-sellable|unsellable|non-sellable|sell)\b/g, '');
  
  return nameQuery.trim().replace(/\s+/g, ' ');
}

// Helper to parse dynamic values like "99 speed" or "speed 99"
function parseAttributeValue(text, keywords) {
  const pattern1 = new RegExp('(?:' + keywords.join('|') + ')\\s*(?:over|above|greater than|more than|>|>=)?\\s*(\\d+)', 'i');
  const pattern2 = new RegExp('(\\d+)\\s*(?:' + keywords.join('|') + ')', 'i');
  
  let match = text.match(pattern1);
  if (match && match[1]) return parseInt(match[1]);
  
  match = text.match(pattern2);
  if (match && match[1]) return parseInt(match[1]);
  
  return null;
}

// Helper to parse pitch-specific attribute values (e.g. "sinker over 95 mph")
function parsePitchAttributeValue(text, pitchValue, attrKeywords, pitchTypesList) {
  const pitchObj = pitchTypesList.find(pt => pt.value === pitchValue);
  const keys = pitchObj ? pitchObj.keys : [pitchValue.toLowerCase()];
  
  for (let key of keys) {
    // 1. key + spaces + keyword + comparison + number (e.g. "sinker speed 95")
    const pattern1 = new RegExp(key + '\\s*(?:[a-z\\s]*?)\\b(?:' + attrKeywords.join('|') + ')\\b(?:[a-z\\s]*?)(?:over|above|greater than|more than|>|>=)?\\s*(\\d+)', 'i');
    let match = text.match(pattern1);
    if (match && match[1]) return parseInt(match[1]);

    // 2. key + spaces + comparison + number + spaces + keyword (e.g. "sinker over 95 mph")
    const pattern2 = new RegExp(key + '\\s*(?:[a-z\\s]*?)(?:over|above|greater than|more than|>|>=)?\\s*(\\d+)\\s*\\b(?:' + attrKeywords.join('|') + ')\\b', 'i');
    match = text.match(pattern2);
    if (match && match[1]) return parseInt(match[1]);

    // 3. number + keyword + spaces + key (e.g. "95 mph sinker")
    const pattern3 = new RegExp('(\\d+)\\s*\\b(?:' + attrKeywords.join('|') + ')\\b(?:[a-z\\s]*?)\\b' + key + '\\b', 'i');
    match = text.match(pattern3);
    if (match && match[1]) return parseInt(match[1]);
    
    // 4. Fallback for speed range if speed/mph is checked (e.g. "sinker 95" or "sinker > 95")
    if (attrKeywords.includes('speed') || attrKeywords.includes('mph')) {
      const pattern4 = new RegExp(key + '\\s*(?:([a-z\\s]*?))(?:over|above|greater than|more than|>|>=)?\\s*(\\d+)', 'i');
      match = text.match(pattern4);
      if (match && match[2]) {
        const between = match[1] || '';
        const otherKeywords = ['control', 'ctrl', 'break', 'movement', 'mvt', 'usage', 'use', '%'];
        const containsOther = otherKeywords.some(ok => between.includes(ok));
        if (!containsOther) {
          const val = parseInt(match[2]);
          if (val >= 60 && val <= 105) return val;
        }
      }
    }
  }
  return null;
}

function setAttrSlider(sliderId, displayValId, value) {
  const slider = document.getElementById(sliderId);
  if (slider) {
    slider.value = value;
    const display = document.getElementById(displayValId);
    if (display) display.textContent = value;
  }
}

function resetFiltersNoRender() {
  searchInput.value = '';
  ovrMinInput.value = 50;
  ovrMaxInput.value = 99;
  ovrMinVal.textContent = 50;
  ovrMaxVal.textContent = 99;
  teamSelect.value = 'All';
  seriesSelect.value = 'All';
  positionSelect.value = 'All';
  handSelect.value = 'All';
  specialSelect.value = 'All';
  inventorySelect.value = 'All';
  enableCustomFormula.checked = false;
  sortBySelect.value = 'ovr';
  sortAscending = false;
  updateSortDirectionIcon();
  
  Object.values(rarityCheckboxes).forEach(cb => {
    cb.checked = true;
  });

  const allSliders = document.querySelectorAll('.filter-section input[type="range"]');
  allSliders.forEach(slider => {
    if (slider.id !== 'ovr-min' && slider.id !== 'ovr-max' && !slider.id.startsWith('w-')) {
      slider.value = 0;
    }
  });

  const displays = document.querySelectorAll('.slider-header span:last-child');
  displays.forEach(d => {
    d.textContent = '0';
  });

  // Reset weight values to defaults (so they don't zero out on NLP searches)
  const defaultWeights = {
    'w-contact-l': 5, 'w-contact-r': 5, 'w-power-l': 5, 'w-power-r': 5, 'w-vision': 3, 'w-clutch': 4, 'w-fielding': 4, 'w-speed': 4, 'w-stealing': 2,
    'w-stamina': 5, 'w-h9-l': 5, 'w-h9-r': 5, 'w-k9-l': 5, 'w-k9-r': 5, 'w-bb9': 4, 'w-pclutch': 4, 'w-velocity': 3, 'w-movement': 3
  };
  Object.entries(defaultWeights).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const wi = document.getElementById(id.replace('w-', 'wi-'));
    if (wi) wi.textContent = val;
  });

  // Reset Pitch Specific Filters
  if (pitchTypeSelect) {
    pitchTypeSelect.value = 'All';
  }
  if (pitchAttrSliders) {
    pitchAttrSliders.classList.add('hidden');
  }
  if (filterPitchSpeed) {
    filterPitchSpeed.value = 60;
    const speedVal = document.getElementById('pitch-speed-val');
    if (speedVal) speedVal.textContent = '60 MPH';
  }
  if (filterPitchSpeedMax) {
    filterPitchSpeedMax.value = 105;
    const speedMaxVal = document.getElementById('pitch-speed-max-val');
    if (speedMaxVal) speedMaxVal.textContent = '105 MPH';
  }
  if (filterPitchControl) {
    filterPitchControl.value = 0;
    const ctrlVal = document.getElementById('pitch-control-val');
    if (ctrlVal) ctrlVal.textContent = '0';
  }
  if (filterPitchBreak) {
    filterPitchBreak.value = 0;
    const breakVal = document.getElementById('pitch-break-val');
    if (breakVal) breakVal.textContent = '0';
  }
  if (filterPitchUsage) {
    filterPitchUsage.value = 0;
    const usageVal = document.getElementById('pitch-usage-val');
    if (usageVal) usageVal.textContent = '0%';
  }
}

function setExamplePrompt(text) {
  const input = document.getElementById('nlp-prompt-input');
  if (input) {
    input.value = text;
    applyNaturalLanguagePrompt();
  }
}

// Pagination state for NLP tips examples
let currentTipsPage = 0;
const TIPS_PER_PAGE = 8;

const STATIC_TIPS = [
  { text: 'elite contact hitters with speed over 85', query: 'elite contact hitters with speed over 85' },
  { text: 'power over 90 & speed over 80 (power-speed threat)', query: 'hitters with power over 90 and speed over 80' },
  { text: 'sinker speed over 96 mph (nasty hard sinker)', query: 'pitchers with sinker speed over 96 mph' },
  { text: 'cutter control over 85 (precise cutter)', query: 'pitchers with cutter control over 85' },
  { text: 'slider break over 90 (sweeping break)', query: 'pitchers with slider break over 90' },
  { text: '12-6 curve break over 85 (vertical curve)', query: 'pitchers with 12-6 curve break over 85' },
  { text: 'dodgers pitchers with stamina over 80 and h/9 above 75', query: 'dodgers pitchers with stamina over 80 and h/9 above 75' },
  { text: 'gold shortstops from Red Sox', query: 'gold shortstops from Red Sox' }
];

const LETHAL_COMBOS = [
  {
    "text": "contact over 91 & speed over 86 (elite speedster)",
    "query": "hitters with contact over 91 and speed over 86"
  },
  {
    "text": "sinker speed over 95 mph (hard velocity)",
    "query": "pitchers with Sinker speed over 95 mph"
  },
  {
    "text": "power over 92 & speed over 82 (power-speed threat)",
    "query": "hitters with power over 92 and speed over 82"
  },
  {
    "text": "cutter break over 90 (heavy movement)",
    "query": "pitchers with Cutter break over 90"
  },
  {
    "text": "contact over 98 & power over 88 (ultimate bat)",
    "query": "hitters with contact over 98 and power over 88"
  },
  {
    "text": "slider control over 88 (precise locator)",
    "query": "pitchers with Slider control over 88"
  },
  {
    "text": "vision over 96 & clutch over 94 (clutch contact)",
    "query": "hitters with vision over 96 and clutch over 94"
  },
  {
    "text": "k/9 over 89 & stamina over 79 (workhorse K-machine)",
    "query": "pitchers with k/9 over 89 and stamina over 79"
  },
  {
    "text": "fielding over 95 & speed over 90 (elite defense)",
    "query": "hitters with fielding over 95 and speed over 90"
  },
  {
    "text": "h/9 over 90 & bb/9 over 85 (stingy control)",
    "query": "pitchers with h/9 over 90 and bb/9 over 85"
  },
  {
    "text": "diamond hitters from Yankees (power over 91)",
    "query": "diamond hitters from Yankees with power over 91"
  },
  {
    "text": "12-6 curve speed over 95 & slider break over 91",
    "query": "pitchers with 12-6 Curve speed over 95 mph and slider break over 91"
  },
  {
    "text": "gold hitters from Dodgers (speed over 92)",
    "query": "gold hitters from Dodgers with speed over 92"
  },
  {
    "text": "circle change control over 92 & break over 92",
    "query": "pitchers with Circle Change control over 92 and break over 92"
  },
  {
    "text": "contact over 92 & speed over 93 (elite speedster)",
    "query": "hitters with contact over 92 and speed over 93"
  },
  {
    "text": "pitchers from Red Sox (h/9 over 88)",
    "query": "pitchers from Red Sox with h/9 over 88"
  },
  {
    "text": "power over 93 & speed over 89 (power-speed threat)",
    "query": "hitters with power over 93 and speed over 89"
  },
  {
    "text": "sweeper speed over 97 mph (hard velocity)",
    "query": "pitchers with Sweeper speed over 97 mph"
  },
  {
    "text": "contact over 97 & power over 87 (ultimate bat)",
    "query": "hitters with contact over 97 and power over 87"
  },
  {
    "text": "knuckle-curve break over 90 (heavy movement)",
    "query": "pitchers with Knuckle-curve break over 90"
  },
  {
    "text": "vision over 97 & clutch over 93 (clutch contact)",
    "query": "hitters with vision over 97 and clutch over 93"
  },
  {
    "text": "sweeping curve control over 85 (precise locator)",
    "query": "pitchers with Sweeping Curve control over 85"
  },
  {
    "text": "fielding over 90 & speed over 86 (elite defense)",
    "query": "hitters with fielding over 90 and speed over 86"
  },
  {
    "text": "k/9 over 86 & stamina over 87 (workhorse K-machine)",
    "query": "pitchers with k/9 over 86 and stamina over 87"
  },
  {
    "text": "diamond hitters from Cubs (power over 87)",
    "query": "diamond hitters from Cubs with power over 87"
  },
  {
    "text": "h/9 over 87 & bb/9 over 93 (stingy control)",
    "query": "pitchers with h/9 over 87 and bb/9 over 93"
  },
  {
    "text": "gold hitters from Mets (speed over 88)",
    "query": "gold hitters from Mets with speed over 88"
  },
  {
    "text": "splitter speed over 98 & slider break over 89",
    "query": "pitchers with Splitter speed over 98 mph and slider break over 89"
  },
  {
    "text": "contact over 93 & speed over 89 (elite speedster)",
    "query": "hitters with contact over 93 and speed over 89"
  },
  {
    "text": "changeup control over 90 & break over 90",
    "query": "pitchers with Changeup control over 90 and break over 90"
  },
  {
    "text": "power over 94 & speed over 85 (power-speed threat)",
    "query": "hitters with power over 94 and speed over 85"
  },
  {
    "text": "pitchers from Braves (h/9 over 80)",
    "query": "pitchers from Braves with h/9 over 80"
  },
  {
    "text": "contact over 96 & power over 86 (ultimate bat)",
    "query": "hitters with contact over 96 and power over 86"
  },
  {
    "text": "curveball speed over 99 mph (hard velocity)",
    "query": "pitchers with Curveball speed over 99 mph"
  },
  {
    "text": "vision over 92 & clutch over 92 (clutch contact)",
    "query": "hitters with vision over 92 and clutch over 92"
  },
  {
    "text": "forkball break over 90 (heavy movement)",
    "query": "pitchers with Forkball break over 90"
  },
  {
    "text": "fielding over 91 & speed over 93 (elite defense)",
    "query": "hitters with fielding over 91 and speed over 93"
  },
  {
    "text": "screwball control over 93 (precise locator)",
    "query": "pitchers with Screwball control over 93"
  },
  {
    "text": "diamond hitters from Giants (power over 94)",
    "query": "diamond hitters from Giants with power over 94"
  },
  {
    "text": "k/9 over 94 & stamina over 79 (workhorse K-machine)",
    "query": "pitchers with k/9 over 94 and stamina over 79"
  },
  {
    "text": "gold hitters from Phillies (speed over 95)",
    "query": "gold hitters from Phillies with speed over 95"
  },
  {
    "text": "h/9 over 95 & bb/9 over 85 (stingy control)",
    "query": "pitchers with h/9 over 95 and bb/9 over 85"
  },
  {
    "text": "contact over 94 & speed over 85 (elite speedster)",
    "query": "hitters with contact over 94 and speed over 85"
  },
  {
    "text": "sinker speed over 96 & slider break over 87",
    "query": "pitchers with Sinker speed over 96 mph and slider break over 87"
  },
  {
    "text": "power over 95 & speed over 81 (power-speed threat)",
    "query": "hitters with power over 95 and speed over 81"
  },
  {
    "text": "cutter control over 88 & break over 88",
    "query": "pitchers with Cutter control over 88 and break over 88"
  },
  {
    "text": "contact over 95 & power over 85 (ultimate bat)",
    "query": "hitters with contact over 95 and power over 85"
  },
  {
    "text": "pitchers from Padres (h/9 over 88)",
    "query": "pitchers from Padres with h/9 over 88"
  },
  {
    "text": "vision over 93 & clutch over 91 (clutch contact)",
    "query": "hitters with vision over 93 and clutch over 91"
  },
  {
    "text": "slider speed over 95 mph (hard velocity)",
    "query": "pitchers with Slider speed over 95 mph"
  },
  {
    "text": "fielding over 92 & speed over 89 (elite defense)",
    "query": "hitters with fielding over 92 and speed over 89"
  },
  {
    "text": "12-6 curve break over 90 (heavy movement)",
    "query": "pitchers with 12-6 Curve break over 90"
  },
  {
    "text": "diamond hitters from Mariners (power over 90)",
    "query": "diamond hitters from Mariners with power over 90"
  },
  {
    "text": "circle change control over 90 (precise locator)",
    "query": "pitchers with Circle Change control over 90"
  },
  {
    "text": "gold hitters from Orioles (speed over 91)",
    "query": "gold hitters from Orioles with speed over 91"
  },
  {
    "text": "k/9 over 91 & stamina over 87 (workhorse K-machine)",
    "query": "pitchers with k/9 over 91 and stamina over 87"
  },
  {
    "text": "contact over 95 & speed over 92 (elite speedster)",
    "query": "hitters with contact over 95 and speed over 92"
  },
  {
    "text": "h/9 over 92 & bb/9 over 93 (stingy control)",
    "query": "pitchers with h/9 over 92 and bb/9 over 93"
  },
  {
    "text": "power over 90 & speed over 88 (power-speed threat)",
    "query": "hitters with power over 90 and speed over 88"
  },
  {
    "text": "sweeper speed over 94 & slider break over 85",
    "query": "pitchers with Sweeper speed over 94 mph and slider break over 85"
  },
  {
    "text": "contact over 98 & power over 92 (ultimate bat)",
    "query": "hitters with contact over 98 and power over 92"
  },
  {
    "text": "knuckle-curve control over 86 & break over 86",
    "query": "pitchers with Knuckle-curve control over 86 and break over 86"
  },
  {
    "text": "vision over 94 & clutch over 90 (clutch contact)",
    "query": "hitters with vision over 94 and clutch over 90"
  },
  {
    "text": "pitchers from Astros (h/9 over 80)",
    "query": "pitchers from Astros with h/9 over 80"
  },
  {
    "text": "fielding over 93 & speed over 85 (elite defense)",
    "query": "hitters with fielding over 93 and speed over 85"
  },
  {
    "text": "sweeping curve speed over 97 mph (hard velocity)",
    "query": "pitchers with Sweeping Curve speed over 97 mph"
  },
  {
    "text": "diamond hitters from Yankees (power over 86)",
    "query": "diamond hitters from Yankees with power over 86"
  },
  {
    "text": "splitter break over 90 (heavy movement)",
    "query": "pitchers with Splitter break over 90"
  },
  {
    "text": "gold hitters from Dodgers (speed over 87)",
    "query": "gold hitters from Dodgers with speed over 87"
  },
  {
    "text": "changeup control over 87 (precise locator)",
    "query": "pitchers with Changeup control over 87"
  },
  {
    "text": "contact over 90 & speed over 88 (elite speedster)",
    "query": "hitters with contact over 90 and speed over 88"
  },
  {
    "text": "k/9 over 88 & stamina over 79 (workhorse K-machine)",
    "query": "pitchers with k/9 over 88 and stamina over 79"
  },
  {
    "text": "power over 91 & speed over 84 (power-speed threat)",
    "query": "hitters with power over 91 and speed over 84"
  },
  {
    "text": "h/9 over 89 & bb/9 over 85 (stingy control)",
    "query": "pitchers with h/9 over 89 and bb/9 over 85"
  },
  {
    "text": "contact over 97 & power over 91 (ultimate bat)",
    "query": "hitters with contact over 97 and power over 91"
  },
  {
    "text": "curveball speed over 97 & slider break over 93",
    "query": "pitchers with Curveball speed over 97 mph and slider break over 93"
  },
  {
    "text": "vision over 95 & clutch over 97 (clutch contact)",
    "query": "hitters with vision over 95 and clutch over 97"
  },
  {
    "text": "forkball control over 94 & break over 94",
    "query": "pitchers with Forkball control over 94 and break over 94"
  },
  {
    "text": "fielding over 94 & speed over 92 (elite defense)",
    "query": "hitters with fielding over 94 and speed over 92"
  },
  {
    "text": "pitchers from Red Sox (h/9 over 88)",
    "query": "pitchers from Red Sox with h/9 over 88"
  },
  {
    "text": "diamond hitters from Cubs (power over 93)",
    "query": "diamond hitters from Cubs with power over 93"
  },
  {
    "text": "screwball speed over 99 mph (hard velocity)",
    "query": "pitchers with Screwball speed over 99 mph"
  },
  {
    "text": "gold hitters from Mets (speed over 94)",
    "query": "gold hitters from Mets with speed over 94"
  },
  {
    "text": "sinker break over 90 (heavy movement)",
    "query": "pitchers with Sinker break over 90"
  },
  {
    "text": "contact over 91 & speed over 95 (elite speedster)",
    "query": "hitters with contact over 91 and speed over 95"
  },
  {
    "text": "cutter control over 95 (precise locator)",
    "query": "pitchers with Cutter control over 95"
  },
  {
    "text": "power over 92 & speed over 80 (power-speed threat)",
    "query": "hitters with power over 92 and speed over 80"
  },
  {
    "text": "k/9 over 85 & stamina over 87 (workhorse K-machine)",
    "query": "pitchers with k/9 over 85 and stamina over 87"
  },
  {
    "text": "contact over 96 & power over 90 (ultimate bat)",
    "query": "hitters with contact over 96 and power over 90"
  },
  {
    "text": "h/9 over 86 & bb/9 over 93 (stingy control)",
    "query": "pitchers with h/9 over 86 and bb/9 over 93"
  },
  {
    "text": "vision over 96 & clutch over 96 (clutch contact)",
    "query": "hitters with vision over 96 and clutch over 96"
  },
  {
    "text": "slider speed over 95 & slider break over 91",
    "query": "pitchers with Slider speed over 95 mph and slider break over 91"
  },
  {
    "text": "fielding over 95 & speed over 88 (elite defense)",
    "query": "hitters with fielding over 95 and speed over 88"
  },
  {
    "text": "12-6 curve control over 92 & break over 92",
    "query": "pitchers with 12-6 Curve control over 92 and break over 92"
  },
  {
    "text": "diamond hitters from Braves (power over 89)",
    "query": "diamond hitters from Braves with power over 89"
  },
  {
    "text": "pitchers from Giants (h/9 over 80)",
    "query": "pitchers from Giants with h/9 over 80"
  },
  {
    "text": "gold hitters from Phillies (speed over 90)",
    "query": "gold hitters from Phillies with speed over 90"
  },
  {
    "text": "circle change speed over 95 mph (hard velocity)",
    "query": "pitchers with Circle Change speed over 95 mph"
  },
  {
    "text": "contact over 92 & speed over 91 (elite speedster)",
    "query": "hitters with contact over 92 and speed over 91"
  },
  {
    "text": "sweeper break over 90 (heavy movement)",
    "query": "pitchers with Sweeper break over 90"
  }
];

// Render the lethal attribute combinations dynamically with pagination
function renderLethalCombinations() {
  const container = document.getElementById('nlp-examples-container');
  if (!container || typeof LETHAL_COMBOS === 'undefined') return;
  container.innerHTML = '';

  const allTips = [...STATIC_TIPS, ...LETHAL_COMBOS];

  // Try: label
  const label = document.createElement('span');
  label.className = 'example-label';
  label.textContent = 'Try:';
  container.appendChild(label);

  // Slice for the current page
  const start = currentTipsPage * TIPS_PER_PAGE;
  const end = start + TIPS_PER_PAGE;
  const pageTips = allTips.slice(start, end);

  // Render page pills
  pageTips.forEach(combo => {
    const el = document.createElement('span');
    el.className = 'example-pill';
    el.textContent = combo.text;
    el.onclick = () => setExamplePrompt(combo.query);
    container.appendChild(el);
  });

  // Nav buttons inline
  if (currentTipsPage > 0) {
    const backBtn = document.createElement('span');
    backBtn.className = 'example-nav-btn';
    backBtn.textContent = 'Back';
    backBtn.onclick = () => {
      currentTipsPage--;
      renderLethalCombinations();
    };
    container.appendChild(backBtn);
  }

  if (end < allTips.length) {
    const moreBtn = document.createElement('span');
    moreBtn.className = 'example-nav-btn';
    moreBtn.textContent = 'More';
    moreBtn.onclick = () => {
      currentTipsPage++;
      renderLethalCombinations();
    };
    container.appendChild(moreBtn);
  }
}

// Generate descriptive acquisition details based on player locations data and series
function getCardAcquisitionMethod(player) {
  const name = player.name;
  const series = player.series || 'Live';
  
  // Explicit overrides for exact matches shown on Showzone
  if (name === 'Jonathan Broxton' && series === 'All-Star') {
    return `Available as an epic reward in the <strong style="color: #ff4b4b;">Broxton / Anderson</strong> diamond quest.`;
  }
  if (name === 'Garret Anderson' && series === 'Rookie') {
    return `Available as an epic reward in the <strong style="color: #ff4b4b;">Broxton / Anderson</strong> diamond quest.`;
  }
  
  if (player.locations && player.locations.length > 0) {
    // Build friendly descriptors
    const methods = [];
    player.locations.forEach(loc => {
      switch (loc) {
        case 'COMMUNITY MARKET':
          methods.push(`Can be bought or sold on the <strong>Community Market</strong>.`);
          break;
        case 'FEATURED IN PACK':
        case 'THE SHOW PACK':
          methods.push(`Obtainable from standard <strong>Show Packs</strong> or featured choice packs.`);
          break;
        case 'PROGRAM (Team Affinity)':
          methods.push(`Earned through the <strong>Team Affinity</strong> program track for the <strong>${player.team || "card's team"}</strong>.`);
          break;
        case 'PROGRAM (XP Reward Path)':
          methods.push(`Obtainable as a reward in the main <strong>XP Reward Path</strong> program track.`);
          break;
        case 'PROGRAM (Spotlight Programs)':
          methods.push(`Obtainable by completing <strong>Spotlight Program</strong> tracks.`);
          break;
        case 'PROGRAM (Themed Programs)':
          if (name === 'Felix Hernandez' && series === 'Rookie' && player.ovr === 82) {
            methods.push(`Earned by completing the <strong>Starter Program</strong> track.`);
          } else if (series === 'Topps Now') {
            methods.push(`Obtainable by completing weekly <strong>Topps Now</strong> Program moments and missions.`);
          } else if (series === 'Cover Athletes') {
            methods.push(`Obtainable by completing the <strong>Cover Athletes</strong> Program.`);
          } else if (series === 'Mural') {
            methods.push(`Obtainable by completing the <strong>Mural</strong> Program.`);
          } else if (series === 'Cityscapes') {
            methods.push(`Obtainable by completing the <strong>Cityscapes</strong> Program.`);
          } else if (series === 'Jolt') {
            methods.push(`Obtainable by completing <strong>Jolt</strong> themed Programs.`);
          } else {
            methods.push(`Obtainable by completing specialized <strong>Themed Programs</strong> (such as the <strong>Starter Program</strong> or themed program tracks).`);
          }
          break;
        case 'PROGRAM (Player Programs)':
          methods.push(`Earned by completing dedicated <strong>Player Program</strong> missions.`);
          break;
        case 'DIAMOND QUEST':
          methods.push(`Available as a reward for completing <strong>Diamond Dynasty Quests</strong>.`);
          break;
        case 'COLLECTION':
          methods.push(`Earned by completing card collection sets in Diamond Dynasty.`);
          break;
        case 'SHOWDOWN':
          methods.push(`Obtainable through <strong>Showdown</strong> drafts and challenges.`);
          break;
        case 'CONQUEST':
          methods.push(`Reward earned by playing and capturing territories in <strong>Conquest</strong> maps.`);
          break;
        case 'DAILY LOGIN REWARD':
          methods.push(`Can be obtained as a <strong>Daily Login Reward</strong>.`);
          break;
        case 'MULTIPLAYER':
          methods.push(`Earned as a reward in multiplayer modes like Ranked, Battle Royale, or Events.`);
          break;
        case 'MISSION':
          methods.push(`Obtainable through active gameplay missions.`);
          break;
        case 'EXCHANGE':
          methods.push(`Obtainable through Card Exchanges.`);
          break;
      }
    });
    
    if (methods.length > 0) {
      if (methods.length === 1) {
        return methods[0];
      } else {
        return `<ul style="margin: 0; padding-left: 1.25rem;">` + 
          methods.map(m => `<li style="margin-bottom: 0.5rem;">${m}</li>`).join('') + 
          `</ul>`;
      }
    }
  }
  
  // Fallback switch-case on series if locations are missing
  switch(series.toLowerCase()) {
    case 'live':
      return `This is ${name}'s <strong>Live Series</strong> card. It can be found in standard Show Packs, gained from Team Affinity programs, or purchased directly from the <strong>Community Market</strong>.`;
    case 'vintage':
      return `This <strong>Vintage Series</strong> card represents a classic year in ${name}'s career. It is obtainable through historical Programs, vintage choice packs, or by buying it on the <strong>Community Market</strong>.`;
    case 'awards':
      return `This elite <strong>Awards Series</strong> card celebrates ${name}'s major season awards. You can earn it through the Diamond Dynasty Awards Program, choice pack drops, or buy it via the <strong>Community Market</strong>.`;
    case 'all-star':
      return `Celebrating ${name}'s All-Star selection, this <strong>All-Star Series</strong> card can be obtained in the mid-season All-Star Program, special choice packs, or via the <strong>Community Market</strong>.`;
    case 'standout':
      return `This <strong>Standout Series</strong> card is earned through Weekly Wonders programs, Captain Choice packs, or via the <strong>Community Market</strong>.`;
    case 'spotlight':
      return `This <strong>Spotlight Series</strong> card highlights a key milestone. It is obtainable through Spotlight Program missions, Player Program tracks, or the <strong>Community Market</strong>.`;
    case 'topps now':
      return `This <strong>Topps Now Series</strong> card commemorates a real-world moment. Earn it by completing Topps Now weekly moments programs, or purchase it on the <strong>Community Market</strong>.`;
    case 'world baseball classic':
    case 'wbc':
      return `Representing their nation, this <strong>World Baseball Classic</strong> card is obtainable through the WBC program paths, special nation packs, or via the <strong>Community Market</strong>.`;
    default:
      return `This premium <strong>${series} Series</strong> card can be obtained by completing specialized Diamond Dynasty program tracks, event rewards, or purchased on the <strong>Community Market</strong>.`;
  }
}

// showWhereToFind toggle function removed in favor of Location tab panel

// Helper function to map team short name to full name
function getFullTeamName(team) {
  const teamMap = {
    'Dodgers': 'Los Angeles Dodgers',
    'Yankees': 'New York Yankees',
    'Red Sox': 'Boston Red Sox',
    'Giants': 'San Francisco Giants',
    'Athletics': 'Oakland Athletics',
    'Mets': 'New York Mets',
    'Phillies': 'Philadelphia Phillies',
    'Braves': 'Atlanta Braves',
    'Cubs': 'Chicago Cubs',
    'Cardinals': 'St. Louis Cardinals',
    'Astros': 'Houston Astros',
    'Mariners': 'Seattle Mariners',
    'Blue Jays': 'Toronto Blue Jays',
    'Rangers': 'Texas Rangers',
    'Orioles': 'Baltimore Orioles',
    'Rays': 'Tampa Bay Rays',
    'White Sox': 'Chicago White Sox',
    'Guardians': 'Cleveland Guardians',
    'Twins': 'Minnesota Twins',
    'Tigers': 'Detroit Tigers',
    'Royals': 'Kansas City Royals',
    'Angels': 'Los Angeles Angels',
    'Pirates': 'Pittsburgh Pirates',
    'Reds': 'Cincinnati Reds',
    'Brewers': 'Milwaukee Brewers',
    'Nationals': 'Washington Nationals',
    'Marlins': 'Miami Marlins',
    'Rockies': 'Colorado Rockies',
    'Diamondbacks': 'Arizona Diamondbacks',
    'Padres': 'San Diego Padres'
  };
  return teamMap[team] || team;
}

// Select active captain level (1, 2, 3)
window.activeCaptainLevel = 3;
function selectCaptainLevel(lvl) {
  window.activeCaptainLevel = lvl;
  // Highlight selector button
  const buttons = document.querySelectorAll('.captain-level-selector .level-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.textContent) === lvl);
  });
  // Re-render
  renderEligibleCaptains();
}
window.selectCaptainLevel = selectCaptainLevel;

// Render eligible Jolt captains based on player's team and selected level
function renderEligibleCaptains() {
  const p = window.activeDetailPlayer;
  if (!p) return;

  const container = document.getElementById('detail-captains-list');
  if (!container) return;

  const captains = players.filter(c => c.series === 'Jolt' && c.team === p.team);
  if (captains.length === 0) {
    container.innerHTML = `<p style="color: var(--text-dark); font-style: italic; margin: 0;">No eligible captains available for the ${getFullTeamName(p.team)}.</p>`;
    return;
  }

  const lvl = window.activeCaptainLevel || 3;
  const cardsRequired = lvl === 1 ? 5 : lvl === 2 ? 10 : 15;
  const boostVal = lvl === 1 ? '+2' : lvl === 2 ? '+4' : '+6';

  let html = '';
  captains.forEach(c => {
    const isHitter = c.is_hitter;
    let boostHTML = '';

    if (isHitter) {
      boostHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1.5rem; font-size: 0.85rem; font-family: monospace;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2px;"><span style="color: var(--text-muted);">CON L</span><span style="color: #00e5ff; font-weight: bold;">${boostVal}</span></div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2px;"><span style="color: var(--text-muted);">CON R</span><span style="color: #00e5ff; font-weight: bold;">${boostVal}</span></div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2px;"><span style="color: var(--text-muted);">PWR L</span><span style="color: #00e5ff; font-weight: bold;">${boostVal}</span></div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2px;"><span style="color: var(--text-muted);">PWR R</span><span style="color: #00e5ff; font-weight: bold;">${boostVal}</span></div>
        </div>
      `;
    } else {
      boostHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1.5rem; font-size: 0.85rem; font-family: monospace;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2px;"><span style="color: var(--text-muted);">H/9 R</span><span style="color: #00e5ff; font-weight: bold;">${boostVal}</span></div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2px;"><span style="color: var(--text-muted);">H/9 L</span><span style="color: #00e5ff; font-weight: bold;">${boostVal}</span></div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2px;"><span style="color: var(--text-muted);">K/9 R</span><span style="color: #00e5ff; font-weight: bold;">${boostVal}</span></div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 2px;"><span style="color: var(--text-muted);">K/9 L</span><span style="color: #00e5ff; font-weight: bold;">${boostVal}</span></div>
        </div>
      `;
    }

    const cardImg = c.baked_img_lg || c.baked_img || c.img || '';

    html += `
      <div class="captain-item-card">
        <img src="${cardImg}" alt="${c.name}" style="width: 75px; height: 103px; object-fit: contain; border-radius: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.25rem;">
          <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">${c.name}</h4>
          <span style="font-size: 0.75rem; color: var(--text-dark);">Players from the ${getFullTeamName(c.team)}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Cards Required: <span style="color: var(--text-main);">${cardsRequired}</span></span>
          <div style="margin-top: 0.35rem;">
            ${boostHTML}
          </div>
          <a href="#" onclick="event.preventDefault(); openDetailsModal('${c.uuid}');" style="color: var(--accent-cyan); text-decoration: none; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-top: 0.35rem; display: inline-flex; align-items: center; gap: 0.25rem; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">
            Learn More About this Captain &rarr;
          </a>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}
window.renderEligibleCaptains = renderEligibleCaptains;

// Clear sidebar search name input
function clearSearchName() {
  searchInput.value = '';
  const clearBtn = document.getElementById('clear-search-name-btn');
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }
  runFiltersAndSort();
}
window.clearSearchName = clearSearchName;

// Clear NLP search prompt input and reset filters
function clearNaturalLanguageSearch() {
  const nlpInput = document.getElementById('nlp-prompt-input');
  if (nlpInput) {
    nlpInput.value = '';
  }
  const nlpFeedback = document.getElementById('nlp-feedback');
  if (nlpFeedback) {
    nlpFeedback.classList.add('hidden');
    nlpFeedback.textContent = '';
  }
  resetFilters();
}
window.clearNaturalLanguageSearch = clearNaturalLanguageSearch;
