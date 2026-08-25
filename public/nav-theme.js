/**
 * ChemWebApp — Shared Navigation, Theme Engine, High-Res Exporter, Lipinski Analyzer,
 * Bioavailability Radar, Spectroscopy Estimator & Substructure Highlighter
 */

(function () {
  // Detection of static contexts (GitHub Pages, file protocol, etc.)
  const isStatic = window.location.protocol === 'file:' || 
                   window.location.hostname.endsWith('github.io') ||
                   window.location.pathname.includes('/tahap-');

  function getDynamicLink(stageNum, queryStr = '') {
    if (stageNum === 0) return isStatic ? (window.location.pathname.includes('/tahap-') ? '../index.html' : 'index.html') : '/';
    const folders = {
      1: 'tahap-1-struktur-2d-3d',
      2: 'tahap-2-pencarian-sifat',
      3: 'tahap-3-database-koleksi',
      4: 'tahap-4-analisis-komparasi',
      5: 'tahap-5-lab-reaksi-sintesis',
      6: 'tahap-6-docking-toksikologi'
    };
    if (isStatic) {
      const isSub = window.location.pathname.includes('/tahap-');
      const prefix = isSub ? '../' : '';
      return `${prefix}${folders[stageNum]}/index.html${queryStr}`;
    } else {
      return `/tahap${stageNum}${queryStr}`;
    }
  }

  // 1. Theme Management
  const THEME_KEY = 'chemwebapp_theme';
  
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btns = document.querySelectorAll('.theme-toggle-btn');
    btns.forEach(b => {
      b.innerHTML = theme === 'light' ? '☀️ Mode Terang' : '🌙 Mode Gelap';
      b.setAttribute('title', theme === 'light' ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang');
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  // Apply theme immediately on load
  applyTheme(getPreferredTheme());

  // Register Service Worker dynamically based on path structure
  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      let swPath = '/public/sw.js';
      if (isStatic) {
        const match = window.location.pathname.match(/^\/([^\/]+)\//);
        const repoName = match ? match[1] : '';
        swPath = repoName ? `/${repoName}/public/sw.js` : 'public/sw.js';
      }
      navigator.serviceWorker.register(swPath).catch(() => {});
    });
  }
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = isStatic ? '../public/manifest.json' : '/public/manifest.json';
    document.head.appendChild(manifestLink);
  }

  // LocalStorage Database Mock (Offline & Static Site Database Fallback)
  const LS_DB_KEY = 'chemwebapp_local_compounds';
  
  function getLocalCompounds() {
    try {
      const raw = localStorage.getItem(LS_DB_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  }
  
  function saveLocalCompounds(list) {
    try {
      localStorage.setItem(LS_DB_KEY, JSON.stringify(list));
    } catch(e) {}
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function mockApiHandler(urlStr, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : null;
    let compounds = getLocalCompounds();
    
    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    };
    
    if (urlStr.includes('/tags')) {
      const tagsSet = new Set();
      compounds.forEach(c => {
        if (c.tags) c.tags.forEach(t => tagsSet.add(t));
      });
      return jsonResponse(Array.from(tagsSet));
    }
    
    if (urlStr.includes('/export/all')) {
      return jsonResponse(compounds);
    }
    
    if (urlStr.includes('/batch')) {
      if (body && body.compounds) {
        body.compounds.forEach(c => {
          c._id = 'local_' + Math.random().toString(36).substr(2, 9);
          c.createdAt = new Date().toISOString();
          compounds.unshift(c);
        });
        saveLocalCompounds(compounds);
        return jsonResponse({ success: true, count: body.compounds.length });
      }
      return jsonResponse({ error: 'Invalid batch body' }, 400);
    }
    
    const matchId = urlStr.match(/\/api\/compounds\/([a-zA-Z0-9_-]+)$/);
    if (matchId) {
      const id = matchId[1];
      if (method === 'PUT') {
        const idx = compounds.findIndex(c => c._id === id);
        if (idx !== -1) {
          compounds[idx] = { ...compounds[idx], ...body, updatedAt: new Date().toISOString() };
          saveLocalCompounds(compounds);
          return jsonResponse(compounds[idx]);
        }
        return jsonResponse({ error: 'Not found' }, 404);
      }
      if (method === 'DELETE') {
        compounds = compounds.filter(c => c._id !== id);
        saveLocalCompounds(compounds);
        return jsonResponse({ message: 'Deleted successfully' });
      }
    }
    
    if (method === 'POST') {
      const newCompound = {
        _id: 'local_' + Math.random().toString(36).substr(2, 9),
        name: body.name || 'Senyawa Baru',
        canonicalSmiles: body.canonicalSmiles,
        molecularFormula: body.molecularFormula || '',
        molecularWeight: body.molecularWeight || 0,
        logp: body.logp || 0,
        tpsa: body.tpsa || 0,
        tags: body.tags || [],
        notes: body.notes || '',
        source: body.source || 'manual',
        createdAt: new Date().toISOString()
      };
      compounds.unshift(newCompound);
      saveLocalCompounds(compounds);
      return jsonResponse(newCompound);
    }
    
    let filtered = [...compounds];
    const urlObj = new URL(urlStr, window.location.origin);
    const search = urlObj.searchParams.get('search');
    const tag = urlObj.searchParams.get('tag');
    const sort = urlObj.searchParams.get('sort') || 'newest';
    const filter = urlObj.searchParams.get('filter');
    
    if (search) {
      const sLower = search.toLowerCase();
      filtered = filtered.filter(c => 
        (c.name || '').toLowerCase().includes(sLower) || 
        (c.canonicalSmiles || '').toLowerCase().includes(sLower) ||
        (c.molecularFormula || '').toLowerCase().includes(sLower)
      );
    }
    
    if (tag) {
      filtered = filtered.filter(c => c.tags && c.tags.includes(tag));
    }
    
    if (filter === 'lipinski') {
      filtered = filtered.filter(c => (c.molecularWeight || 0) <= 500 && (c.logp || 0) <= 5);
    } else if (filter === 'lead') {
      filtered = filtered.filter(c => (c.molecularWeight || 0) <= 350 && (c.logp || 0) <= 3);
    } else if (filter === 'ruleof3') {
      filtered = filtered.filter(c => (c.molecularWeight || 0) <= 300);
    }
    
    if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'name_asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort === 'name_desc') {
      filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (sort === 'mw_asc') {
      filtered.sort((a, b) => (a.molecularWeight || 0) - (b.molecularWeight || 0));
    } else if (sort === 'mw_desc') {
      filtered.sort((a, b) => (b.molecularWeight || 0) - (a.molecularWeight || 0));
    }
    
    const page = parseInt(urlObj.searchParams.get('page')) || 1;
    const limit = parseInt(urlObj.searchParams.get('limit')) || 6;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);
    
    return jsonResponse({
      compounds: paginated,
      total: filtered.length,
      page,
      pages: Math.ceil(filtered.length / limit)
    });
  }

  // Override window.fetch for LocalStorage API fallback
  const originalFetch = window.fetch;
  window.fetch = async function (url, options) {
    const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : '');
    
    if (isStatic && (urlStr.includes('/api/compounds') || urlStr.includes('api/compounds'))) {
      return mockApiHandler(urlStr, options);
    }
    
    try {
      return await originalFetch(url, options);
    } catch (err) {
      if (urlStr.includes('/api/compounds') || urlStr.includes('api/compounds')) {
        console.warn('Database server offline. Menggunakan penyimpanan lokal.');
        return mockApiHandler(urlStr, options);
      }
      throw err;
    }
  };

  // 2. Unified Navbar Component
  function mountChemNavbar(activeStage) {
    const header = document.querySelector('header');
    if (!header) return;

    function resolveUrl(stageNum) {
      if (isStatic) {
        const folders = {
          1: 'tahap-1-struktur-2d-3d',
          2: 'tahap-2-pencarian-sifat',
          3: 'tahap-3-database-koleksi',
          4: 'tahap-4-analisis-komparasi',
          5: 'tahap-5-lab-reaksi-sintesis',
          6: 'tahap-6-docking-toksikologi'
        };
        const isSub = window.location.pathname.includes('/tahap');
        const prefix = isSub ? '../' : '';
        return `${prefix}${folders[stageNum]}/index.html`;
      } else {
        return `/tahap${stageNum}`;
      }
    }

    function resolveHomeUrl() {
      if (isStatic) {
        const isSub = window.location.pathname.includes('/tahap');
        return isSub ? '../index.html' : 'index.html';
      } else {
        return '/';
      }
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'chem-navbar-wrapper';
    wrapper.innerHTML = `
      <nav class="chem-navbar" aria-label="Navigasi Utama">
        <a href="${resolveHomeUrl()}" class="chem-brand">
          <span>🧪</span> ChemWebApp
          <span class="chem-brand-badge">PRO</span>
        </a>
        <button class="chem-mobile-toggle" aria-label="Menu" type="button">☰</button>
        <ul class="chem-nav-links" id="chem-nav-menu">
          <li class="chem-nav-item">
            <a href="${resolveUrl(1)}" class="${activeStage === 1 ? 'active' : ''}">
              <span>🔬</span> Tahap 1: 2D/3D Viewer
            </a>
          </li>
          <li class="chem-nav-item">
            <a href="${resolveUrl(2)}" class="${activeStage === 2 ? 'active' : ''}">
              <span>🔍</span> Tahap 2: Cari Sifat
            </a>
          </li>
          <li class="chem-nav-item">
            <a href="${resolveUrl(3)}" class="${activeStage === 3 ? 'active' : ''}">
              <span>📚</span> Tahap 3: Koleksi
            </a>
          </li>
          <li class="chem-nav-item">
            <a href="${resolveUrl(4)}" class="${activeStage === 4 ? 'active' : ''}">
              <span>⚖️</span> Tahap 4: Komparasi
            </a>
          </li>
          <li class="chem-nav-item">
            <a href="${resolveUrl(5)}" class="${activeStage === 5 ? 'active' : ''}">
              <span>⚗️</span> Tahap 5: Lab Reaksi
            </a>
          </li>
          <li class="chem-nav-item">
            <a href="${resolveUrl(6)}" class="${activeStage === 6 ? 'active' : ''}">
              <span>🧬</span> Tahap 6: Docking &amp; ADMET
            </a>
          </li>
        </ul>
        <div class="chem-nav-actions">
          <button class="icon-btn small cmd-palette-btn" type="button" style="padding:5px 10px; font-size:0.75rem; background:var(--panel-2); border-color:var(--line);" title="Buka Spotlight Search (Ctrl + K)">
            🔍 <span style="opacity:0.85;">Cari</span> <kbd style="font-family:'IBM Plex Mono',monospace; font-size:0.65rem; background:var(--panel); padding:1px 4px; border-radius:3px; border:1px solid var(--line);">Ctrl+K</kbd>
          </button>
          <button class="icon-btn small print-report-btn" type="button" style="padding:5px 9px; font-size:0.75rem; background:var(--panel-2); border-color:var(--line);" title="Cetak atau Ekspor Laporan Riset PDF">
            📄 Cetak PDF
          </button>
          <button class="theme-toggle-btn" type="button" aria-label="Ganti Tema">
            🌙 Mode Gelap
          </button>
        </div>
      </nav>
    `;

    document.body.insertBefore(wrapper, document.body.firstChild);

    // Bind theme button
    wrapper.querySelector('.theme-toggle-btn').addEventListener('click', toggleTheme);
    applyTheme(getPreferredTheme());

    // Bind Print PDF button
    wrapper.querySelector('.print-report-btn').addEventListener('click', () => {
      window.print();
    });

    // Bind Command Palette button
    wrapper.querySelector('.cmd-palette-btn').addEventListener('click', () => {
      openCommandPalette();
    });

    // Bind mobile toggle
    const mobBtn = wrapper.querySelector('.chem-mobile-toggle');
    const menu = wrapper.querySelector('#chem-nav-menu');
    mobBtn.addEventListener('click', () => {
      menu.classList.toggle('show');
    });

    initCommandPalette();
  }

  // 3. Lipinski's Rule of 5 Analyzer
  function evaluateLipinski(mw, logp, hbd, hba, rotb, tpsa) {
    const checks = {
      mw: { name: 'Berat Molekul', val: mw, limit: '≤ 500 Da', pass: mw !== null && mw !== undefined ? mw <= 500 : null },
      logp: { name: 'LogP (Lipofilisitas)', val: logp, limit: '≤ 5.0', pass: logp !== null && logp !== undefined ? logp <= 5.0 : null },
      hbd: { name: 'H-Bond Donors', val: hbd, limit: '≤ 5', pass: hbd !== null && hbd !== undefined ? hbd <= 5 : null },
      hba: { name: 'H-Bond Acceptors', val: hba, limit: '≤ 10', pass: hba !== null && hba !== undefined ? hba <= 10 : null },
      rotb: { name: 'Rotatable Bonds (Veber)', val: rotb, limit: '≤ 10', pass: rotb !== null && rotb !== undefined ? rotb <= 10 : null },
      tpsa: { name: 'TPSA (Veber)', val: tpsa, limit: '≤ 140 Å²', pass: tpsa !== null && tpsa !== undefined ? tpsa <= 140 : null }
    };

    let violations = 0;
    let checkedCount = 0;
    ['mw', 'logp', 'hbd', 'hba'].forEach(k => {
      if (checks[k].pass !== null) {
        checkedCount++;
        if (!checks[k].pass) violations++;
      }
    });

    let statusClass = 'pass';
    let statusText = 'Drug-like (0 Pelanggaran)';
    if (violations === 1) {
      statusClass = 'warn';
      statusText = '1 Pelanggaran (Cukup Layak)';
    } else if (violations > 1) {
      statusClass = 'fail';
      statusText = `${violations} Pelanggaran (Non Drug-like)`;
    }

    return { checks, violations, statusClass, statusText, checkedCount };
  }

  function renderLipinskiCard(data, containerEl) {
    if (!containerEl) return;
    const { checks, statusClass, statusText } = evaluateLipinski(
      data.mw, data.logp, data.hbd, data.hba, data.rotb, data.tpsa
    );

    function itemHtml(item) {
      const isNull = item.pass === null;
      const pass = item.pass;
      const icon = isNull ? '–' : (pass ? '✓' : '✗');
      const itemClass = isNull ? '' : (pass ? '' : 'item-fail');
      const valStr = item.val !== null && item.val !== undefined ? (typeof item.val === 'number' ? item.val.toFixed(1) : item.val) : '–';
      return `
        <div class="lipinski-item ${itemClass}">
          <span class="li-label">${item.name} (${item.limit})</span>
          <div class="li-val">
            <span>${valStr}</span>
            <span class="li-icon" style="color: ${isNull ? 'var(--muted)' : (pass ? 'var(--success)' : 'var(--error)')}">${icon}</span>
          </div>
        </div>
      `;
    }

    containerEl.innerHTML = `
      <div class="lipinski-card">
        <div class="lipinski-head">
          <div class="lipinski-title">
            <span>💊</span> Analisis Drug-likeness (Aturan Lipinski &amp; Veber)
          </div>
          <span class="lipinski-status ${statusClass}">${statusText}</span>
        </div>
        <div class="lipinski-grid">
          ${itemHtml(checks.mw)}
          ${itemHtml(checks.logp)}
          ${itemHtml(checks.hbd)}
          ${itemHtml(checks.hba)}
          ${itemHtml(checks.rotb)}
          ${itemHtml(checks.tpsa)}
        </div>
      </div>
    `;
    containerEl.hidden = false;
  }

  // 4. High-Res 2D Structure Exporter (Publication Ready)
  async function exportStructure2D(svgString, baseName, format) {
    if (!svgString) return;
    const cleanName = (baseName || 'struktur-molekul').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();

    if (format === 'svg') {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlobUrl(URL.createObjectURL(blob), `${cleanName}.svg`);
      return;
    }

    const size = 1600;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.documentElement;
    svgEl.setAttribute('width', size);
    svgEl.setAttribute('height', size);

    const serializer = new XMLSerializer();
    const updatedSvg = serializer.serializeToString(svgEl);
    const blob = new Blob([updatedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (format === 'png-white') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, size, size);
        } else {
          ctx.clearRect(0, 0, size, size);
        }

        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);

        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            downloadBlobUrl(URL.createObjectURL(pngBlob), `${cleanName}_${format === 'png-white' ? 'white_bg' : 'transparent'}.png`);
            resolve();
          } else {
            reject(new Error('Canvas export failed'));
          }
        }, 'image/png');
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  function downloadBlobUrl(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // 5. Substructure & Property Highlighting Engine (SMARTS Matcher)
  // Donor HBD: [N,O,S;!H0] (atom N/O/S yang memiliki hidrogen terikat)
  // Acceptor HBA: [N,O] (atom N/O yang memiliki pasangan elektron bebas)
  // Rotatable Bonds: [!$(*#*)&!D1]-!@[!$(*#*)&!D1] (ikatan tunggal non-ring bukan terminal)
  // Aromatic Atoms: [a]
  function getHighlightDetails(RDKitModule, mol, options) {
    if (!RDKitModule || !mol) return null;
    const { showHbd, showHba, showRotB, showAromatic, showAtomNums } = options;

    const atomsToHighlight = new Set();
    const bondsToHighlight = new Set();
    const atomColors = {};
    const bondColors = {};

    // Colors in RGBA float [r, g, b, a]
    const COLOR_HBD = [0.26, 0.60, 0.88, 0.7]; // Biru/Cyan
    const COLOR_HBA = [0.89, 0.41, 0.35, 0.7]; // Merah
    const COLOR_ROTB = [0.91, 0.70, 0.22, 0.85]; // Kuning/Amber
    const COLOR_AROM = [0.28, 0.73, 0.47, 0.6]; // Hijau

    function matchSmarts(smarts, onMatch) {
      try {
        const qmol = RDKitModule.get_qmol(smarts);
        if (qmol && qmol.is_valid()) {
          const matches = JSON.parse(mol.get_substruct_matches(qmol));
          if (Array.isArray(matches)) {
            matches.forEach(m => onMatch(m));
          }
          qmol.delete();
        }
      } catch (e) {}
    }

    if (options.showHbd) {
      matchSmarts('[#7!H0,#8!H0,#16!H0]', m => {
        if (m.atoms) {
          m.atoms.forEach(idx => {
            atomsToHighlight.add(idx);
            atomColors[idx] = COLOR_HBD;
          });
        }
      });
    }

    if (options.showHba) {
      matchSmarts('[#7,#8,#16;!$([NX3;H2,H1])]', m => {
        if (m.atoms) {
          m.atoms.forEach(idx => {
            atomsToHighlight.add(idx);
            atomColors[idx] = COLOR_HBA;
          });
        }
      });
    }

    if (options.showAromatic) {
      matchSmarts('a', m => {
        if (m.atoms) {
          m.atoms.forEach(idx => {
            atomsToHighlight.add(idx);
            atomColors[idx] = COLOR_AROM;
          });
        }
      });
    }

    if (options.showChiral) {
      matchSmarts('[C@H],[C@@H],[C@],[C@@],[#6;X4;!$(*#*)&!$(*=*)&!$(*:*)]', m => {
        if (m.atoms) {
          m.atoms.forEach(idx => {
            atomsToHighlight.add(idx);
            atomColors[idx] = COLOR_CHIRAL;
          });
        }
      });
    }

    if (options.showRotB) {
      matchSmarts('[!$(*#*)&!D1]-!@[!$(*#*)&!D1]', m => {
        if (m.bonds) {
          m.bonds.forEach(bidx => {
            bondsToHighlight.add(bidx);
            bondColors[bidx] = COLOR_ROTB;
          });
        }
      });
    }

    return {
      atoms: Array.from(atomsToHighlight),
      bonds: Array.from(bondsToHighlight),
      highlightAtomColors: atomColors,
      highlightBondColors: bondColors,
      highlightRadius: 0.35,
      drawOptions: {
        addAtomIndices: !!opts.showAtomNums,
        bondLineWidth: 2.2
      }
    };
  }

  // 6. Bioavailability Radar Chart Drawer (SwissADME style 6-axis Radar)
  function drawBioavailabilityRadar(canvas, data) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    const radius = width * 0.38;

    ctx.clearRect(0, 0, width, height);

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#162017' : '#eef2ea';
    const gridColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
    const optimalFill = isLight ? 'rgba(79, 209, 197, 0.22)' : 'rgba(79, 209, 197, 0.15)';
    const optimalStroke = isLight ? '#0f8e81' : '#4fd1c5';
    const polyFill = isLight ? 'rgba(226, 104, 90, 0.4)' : 'rgba(226, 104, 90, 0.45)';
    const polyStroke = isLight ? '#c53030' : '#e2685a';

    const axes = [
      { name: 'LIPO', label: 'LIPO (XLogP)', min: -2.0, max: 6.0, optMin: -0.7, optMax: 5.0, val: data.logp !== null ? data.logp : 1.5 },
      { name: 'SIZE', label: 'SIZE (MW)', min: 100, max: 600, optMin: 150, optMax: 500, val: data.mw || 250 },
      { name: 'POLAR', label: 'POLAR (TPSA)', min: 0, max: 180, optMin: 20, optMax: 140, val: data.tpsa || 50 },
      { name: 'INSOLU', label: 'INSOLU (LogS)', min: -10, max: 1, optMin: -6, optMax: 0, val: data.logs || -3 },
      { name: 'INSATU', label: 'INSATU (Fsp3)', min: 0.0, max: 1.0, optMin: 0.25, optMax: 1.0, val: data.fsp3 || 0.4 },
      { name: 'FLEX', label: 'FLEX (RotB)', min: 0, max: 15, optMin: 0, optMax: 9, val: data.rotb !== null ? data.rotb : 3 }
    ];

    const numAxes = axes.length;
    const angleStep = (Math.PI * 2) / numAxes;

    // Helper: Normalize value to 0.0 - 1.0 along the axis
    function norm(val, axis) {
      const v = Math.max(axis.min, Math.min(axis.max, val));
      return (v - axis.min) / (axis.max - axis.min);
    }

    // Helper: Point coordinates
    function getPoint(index, normalizedRatio) {
      const angle = index * angleStep - Math.PI / 2;
      const r = radius * normalizedRatio;
      return {
        x: center.x + r * Math.cos(angle),
        y: center.y + r * Math.sin(angle)
      };
    }

    // 1. Draw Background Grid Rings
    [0.25, 0.5, 0.75, 1.0].forEach(ratio => {
      ctx.beginPath();
      for (let i = 0; i < numAxes; i++) {
        const pt = getPoint(i, ratio);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 2. Draw Axis Lines & Labels
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    axes.forEach((axis, i) => {
      const pt = getPoint(i, 1.0);
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = gridColor;
      ctx.stroke();

      const labelPt = getPoint(i, 1.2);
      ctx.fillStyle = textColor;
      ctx.fillText(axis.name, labelPt.x, labelPt.y);
    });

    // 3. Draw Optimal Bioavailability Zone Polygon (Pink/Teal area)
    ctx.beginPath();
    axes.forEach((axis, i) => {
      const minRatio = norm(axis.optMin, axis);
      const maxRatio = norm(axis.optMax, axis);
      const pt = getPoint(i, maxRatio);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = optimalFill;
    ctx.fill();
    ctx.strokeStyle = optimalStroke;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Draw Molecule Polygon
    ctx.beginPath();
    axes.forEach((axis, i) => {
      const rRatio = norm(axis.val, axis);
      const pt = getPoint(i, rRatio);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fillStyle = polyFill;
    ctx.fill();
    ctx.strokeStyle = polyStroke;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Draw dots at vertices
    axes.forEach((axis, i) => {
      const pt = getPoint(i, norm(axis.val, axis));
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = polyStroke;
      ctx.fill();
    });
  }

  // 7. Spectroscopy Peak Estimation (IR & 1H-NMR)
  function estimateSpectroscopy(RDKitModule, mol) {
    if (!RDKitModule || !mol) return { ir: [], nmr: [] };
    const irPeaks = [];
    const nmrPeaks = [];

    const IR_RULES = [
      { smarts: '[OX2H]', bond: 'O-H (Alkohol / Fenol)', freq: '3200 – 3600 cm⁻¹', intensity: 'Pita Sangat Lebar & Kuat' },
      { smarts: '[CX3](=O)[OX2H1]', bond: 'O-H (Asam Karboksilat)', freq: '2500 – 3300 cm⁻¹', intensity: 'Pita Ekstra Lebar (Membentang)' },
      { smarts: '[NX3;H2,H1]', bond: 'N-H (Amina / Amida)', freq: '3300 – 3500 cm⁻¹', intensity: 'Sedang (1 atau 2 puncak kembar)' },
      { smarts: '[CX3H1]=O', bond: 'C-H (Aldehid / Fermi)', freq: '2720 & 2820 cm⁻¹', intensity: 'Sedang (Puncak Ganda Khas)' },
      { smarts: 'a-[H]', bond: 'C-H (Aromatik sp²)', freq: '3000 – 3100 cm⁻¹', intensity: 'Tajam / Sedang' },
      { smarts: '[CX4]-[H]', bond: 'C-H (Alifatik sp³)', freq: '2850 – 2960 cm⁻¹', intensity: 'Kuat & Tajam' },
      { smarts: '[CX3]=[OX1]', bond: 'C=O (Karbonil / Ester / Keton)', freq: '1680 – 1750 cm⁻¹', intensity: 'Puncak Sangat Kuat & Dominan' },
      { smarts: 'a:a', bond: 'C=C (Cincin Aromatik)', freq: '1450 – 1600 cm⁻¹', intensity: 'Sedang (2–3 puncak khas)' },
      { smarts: '[CX3]=[CX3]', bond: 'C=C (Alkena)', freq: '1620 – 1680 cm⁻¹', intensity: 'Sedang' },
      { smarts: '[#6]-[OX2]-[#6]', bond: 'C-O (Eter / Ester)', freq: '1050 – 1250 cm⁻¹', intensity: 'Kuat' },
      { smarts: '[$([NX3](=O)=O)]', bond: 'N-O (Gugus Nitro)', freq: '1500 – 1550 & 1300 – 1350 cm⁻¹', intensity: 'Sangat Kuat' }
    ];

    const NMR_RULES = [
      { smarts: '[CX4H3]-[#6]', proton: 'R-CH₃ (Alkil primer)', shift: 'δ 0.9 – 1.2 ppm', mult: 'Singlet / Triplet' },
      { smarts: '[CX4H2]', proton: 'R-CH₂-R (Metilena alifatik)', shift: 'δ 1.2 – 1.6 ppm', mult: 'Multiplet' },
      { smarts: '[CX4H]-[#6]', proton: 'R₃C-H (Metina)', shift: 'δ 1.4 – 1.8 ppm', mult: 'Multiplet' },
      { smarts: '[CH3,CH2][CX3]=O', proton: 'CH₃-C=O (Alpha Karbonil)', shift: 'δ 2.0 – 2.5 ppm', mult: 'Singlet / Kuartet' },
      { smarts: '[CH3,CH2][OX2,NX3]', proton: 'CH₃-O- / CH₂-O- (Eter/Alkohol)', shift: 'δ 3.3 – 4.0 ppm', mult: 'Singlet / Kuartet' },
      { smarts: 'c[H]', proton: 'Ar-H (Proton Cincin Benzena)', shift: 'δ 6.8 – 8.2 ppm', mult: 'Multiplet / Doblet' },
      { smarts: '[CX3H1]=O', proton: '-CHO (Proton Aldehid)', shift: 'δ 9.5 – 10.2 ppm', mult: 'Singlet Tajam' },
      { smarts: '[CX3](=O)[OX2H1]', proton: '-COOH (Proton Asam Karboksilat)', shift: 'δ 10.5 – 12.5 ppm', mult: 'Pita Lebar Khas' },
      { smarts: '[OX2H]', proton: '-OH (Alkohol / Fenol)', shift: 'δ 1.5 – 5.5 ppm', mult: 'Singlet (Dapat Bertukar D₂O)' }
    ];

    IR_RULES.forEach(r => {
      try {
        const qmol = RDKitModule.get_qmol(r.smarts);
        if (qmol && qmol.is_valid()) {
          const match = JSON.parse(mol.get_substruct_match(qmol));
          if (match && match.atoms && match.atoms.length > 0) {
            irPeaks.push(r);
          }
          qmol.delete();
        }
      } catch (e) {}
    });

    NMR_RULES.forEach(r => {
      try {
        const qmol = RDKitModule.get_qmol(r.smarts);
        if (qmol && qmol.is_valid()) {
          const match = JSON.parse(mol.get_substruct_match(qmol));
          if (match && match.atoms && match.atoms.length > 0) {
            nmrPeaks.push(r);
          }
          qmol.delete();
        }
      } catch (e) {}
    });

    return { ir: irPeaks, nmr: nmrPeaks };
  }

  // =========================================================
  // 8. FTIR Spectrum Canvas Simulation Engine
  // =========================================================
  function simulateIRSpectrum(canvas, irRules, options = {}) {
    if (!canvas) return [];
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    const padLeft = 55;
    const padRight = 25;
    const padTop = 30;
    const padBottom = 45;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    ctx.clearRect(0, 0, w, h);

    const minWN = 400;
    const maxWN = 4000;

    function wnToX(wn) {
      // Inverted axis: 4000 on left, 400 on right
      const r = (maxWN - wn) / (maxWN - minWN);
      return padLeft + r * plotW;
    }
    function transToY(t) {
      // 100% on top, 0% on bottom
      const r = (100 - t) / 100;
      return padTop + r * plotH;
    }

    // Colors
    const gridCol = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
    const axisCol = isLight ? '#162017' : '#eef2ea';
    const textCol = isLight ? '#5e7260' : '#8a998a';
    const curveCol = isLight ? '#0f8e81' : '#4fd1c5';
    const fillCol = isLight ? 'rgba(15, 142, 129, 0.08)' : 'rgba(79, 209, 197, 0.1)';

    // Draw Grid & Axes
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const wnTicks = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500];
    wnTicks.forEach(wn => {
      const x = wnToX(wn);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.strokeStyle = gridCol;
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.fillText(wn.toString(), x, padTop + plotH + 8);
    });

    // Y Axis Ticks (Transmittance %)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const tTicks = [0, 20, 40, 60, 80, 100];
    tTicks.forEach(t => {
      const y = transToY(t);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.strokeStyle = gridCol;
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.fillText(`${t}%`, padLeft - 8, y);
    });

    // Axis Labels
    ctx.fillStyle = axisCol;
    ctx.font = '600 11.5px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bilangan Gelombang / Wavenumber (cm⁻¹)', padLeft + plotW / 2, h - 14);

    ctx.save();
    ctx.translate(14, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Transmittansi (%T)', 0, 0);
    ctx.restore();

    // Peak Definitions Generator based on matched rules
    const peakDefs = [];
    (irRules || []).forEach(r => {
      const b = r.bond;
      if (b.includes('O-H (Alkohol')) {
        peakDefs.push({ wn: 3350, depth: 72, sigma: 140, name: 'O-H stretch (alkohol)', bond: b });
      } else if (b.includes('O-H (Asam')) {
        peakDefs.push({ wn: 3000, depth: 68, sigma: 260, name: 'O-H stretch (asam karboksilat)', bond: b });
      } else if (b.includes('N-H')) {
        peakDefs.push({ wn: 3400, depth: 52, sigma: 40, name: 'N-H stretch (amina/amida)', bond: b });
        peakDefs.push({ wn: 3320, depth: 42, sigma: 35, name: 'N-H simetris', bond: b });
      } else if (b.includes('C-H (Aldehid')) {
        peakDefs.push({ wn: 2820, depth: 40, sigma: 25, name: 'C-H fermi aldehid', bond: b });
        peakDefs.push({ wn: 2720, depth: 38, sigma: 25, name: 'C-H fermi aldehid', bond: b });
      } else if (b.includes('C-H (Aromatik')) {
        peakDefs.push({ wn: 3060, depth: 46, sigma: 20, name: 'C-H stretch (aromatik)', bond: b });
      } else if (b.includes('C-H (Alifatik')) {
        peakDefs.push({ wn: 2930, depth: 64, sigma: 35, name: 'C-H stretch (sp³ alkil)', bond: b });
        peakDefs.push({ wn: 2860, depth: 50, sigma: 25, name: 'C-H stretch simetris', bond: b });
      } else if (b.includes('C=O')) {
        peakDefs.push({ wn: 1715, depth: 88, sigma: 22, name: 'C=O stretch (karbonil/ester)', bond: b });
      } else if (b.includes('C=C (Cincin')) {
        peakDefs.push({ wn: 1595, depth: 55, sigma: 18, name: 'C=C ring stretch', bond: b });
        peakDefs.push({ wn: 1495, depth: 48, sigma: 16, name: 'C=C ring stretch', bond: b });
      } else if (b.includes('C=C (Alkena')) {
        peakDefs.push({ wn: 1645, depth: 48, sigma: 20, name: 'C=C alkena stretch', bond: b });
      } else if (b.includes('C-O')) {
        peakDefs.push({ wn: 1180, depth: 68, sigma: 30, name: 'C-O stretch (ester/eter)', bond: b });
        peakDefs.push({ wn: 1080, depth: 58, sigma: 28, name: 'C-O stretch', bond: b });
      } else if (b.includes('N-O')) {
        peakDefs.push({ wn: 1530, depth: 82, sigma: 25, name: 'NO₂ asimetris', bond: b });
        peakDefs.push({ wn: 1345, depth: 78, sigma: 25, name: 'NO₂ simetris', bond: b });
      }
    });

    // If no rules matched, give basic fingerprint / aliphatic curve
    if (!peakDefs.length) {
      peakDefs.push({ wn: 2920, depth: 40, sigma: 30, name: 'C-H stretch', bond: 'C-H' });
    }

    // Synthesize curve points
    const numPoints = 600;
    const curvePoints = [];
    for (let i = 0; i <= numPoints; i++) {
      const wn = maxWN - (i / numPoints) * (maxWN - minWN);
      let baseline = 95 - 2.5 * Math.sin(wn / 600); // slight realistic baseline tilt
      // Noise / ripple
      const noise = (Math.sin(wn * 0.15) * 0.4) + (Math.cos(wn * 0.08) * 0.3);
      baseline += noise;

      let totalDip = 0;
      peakDefs.forEach(p => {
        const diff = wn - p.wn;
        const dip = p.depth * Math.exp(-(diff * diff) / (2 * p.sigma * p.sigma));
        totalDip += dip;
      });

      // Fingerprint minor bumps below 1000 cm-1
      if (wn < 1000) {
        totalDip += 12 * Math.exp(-Math.pow(wn - 750, 2) / 1800);
        totalDip += 10 * Math.exp(-Math.pow(wn - 690, 2) / 1200);
      }

      const transmittance = Math.max(5, Math.min(100, baseline - totalDip));
      curvePoints.push({ wn, t: transmittance, x: wnToX(wn), y: transToY(transmittance) });
    }

    // Draw Filled Area under curve
    ctx.beginPath();
    ctx.moveTo(wnToX(maxWN), transToY(100));
    curvePoints.forEach((pt, idx) => {
      if (idx === 0) ctx.lineTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.lineTo(wnToX(minWN), transToY(100));
    ctx.closePath();
    ctx.fillStyle = fillCol;
    ctx.fill();

    // Draw Line Curve
    ctx.beginPath();
    curvePoints.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.strokeStyle = curveCol;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Draw Peak Label Markers & Return hit boxes
    const plottedPeaks = [];
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';

    peakDefs.forEach(p => {
      const px = wnToX(p.wn);
      const py = transToY(95 - p.depth);
      plottedPeaks.push({ ...p, px, py });

      // Peak label pin
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? '#c53030' : '#e2685a';
      ctx.fill();

      // Text label above/below
      ctx.fillStyle = isLight ? '#162017' : '#eef2ea';
      ctx.fillText(`${p.wn} cm⁻¹`, px, Math.max(padTop + 14, py - 10));
    });

    return { plottedPeaks, curvePoints, wnToX, transToY, padLeft, padRight, padTop, padBottom, plotW, plotH };
  }

  // =========================================================
  // 9. 1H-NMR Spectrum Canvas Simulation Engine
  // =========================================================
  function simulateNMRSpectrum(canvas, nmrRules, options = {}) {
    if (!canvas) return [];
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    const padLeft = 45;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 45;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    ctx.clearRect(0, 0, w, h);

    const minPPM = -0.5;
    const maxPPM = 13.0;

    function ppmToX(ppm) {
      // Inverted NMR axis: 13.0 on left, -0.5 on right
      const r = (maxPPM - ppm) / (maxPPM - minPPM);
      return padLeft + r * plotW;
    }
    function intensityToY(val) {
      // 0 at baseline (bottom), 100 at top
      const r = Math.min(100, Math.max(0, val)) / 100;
      return (padTop + plotH) - r * (plotH * 0.85);
    }

    const gridCol = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
    const axisCol = isLight ? '#162017' : '#eef2ea';
    const textCol = isLight ? '#5e7260' : '#8a998a';
    const peakCol = isLight ? '#0f8e81' : '#4fd1c5';
    const integralCol = isLight ? '#3182ce' : '#63b3ed';

    // Draw Grid & Ticks
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const ppmTicks = [12, 10, 8, 6, 4, 2, 0];
    ppmTicks.forEach(ppm => {
      const x = ppmToX(ppm);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.strokeStyle = gridCol;
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.fillText(ppm.toFixed(1), x, padTop + plotH + 8);
    });

    // Sub-ticks every 1.0 ppm
    for (let p = 0; p <= 12; p += 1) {
      const sx = ppmToX(p);
      ctx.beginPath();
      ctx.moveTo(sx, padTop + plotH);
      ctx.lineTo(sx, padTop + plotH + 4);
      ctx.strokeStyle = textCol;
      ctx.stroke();
    }

    // Axis Label
    ctx.fillStyle = axisCol;
    ctx.font = '600 11.5px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pergeseran Kimia / Chemical Shift δ (ppm)', padLeft + plotW / 2, h - 14);

    // Peak Definitions
    const nmrSignals = [
      // Always include TMS standard reference at 0.00 ppm
      { ppm: 0.00, height: 70, mult: 'Singlet', protons: 12, label: 'TMS (Standar Referensi)', j: 0, width: 0.012 }
    ];

    (nmrRules || []).forEach(r => {
      const p = r.proton;
      if (p.includes('R-CH₃')) {
        nmrSignals.push({ ppm: 1.15, height: 75, mult: 'Triplet', protons: 3, label: 'R-CH₃ (Alkil primer)', j: 0.025, width: 0.015 });
      } else if (p.includes('R-CH₂-R')) {
        nmrSignals.push({ ppm: 1.45, height: 60, mult: 'Multiplet', protons: 2, label: 'R-CH₂-R (Alifatik)', j: 0.02, width: 0.02 });
      } else if (p.includes('R₃C-H')) {
        nmrSignals.push({ ppm: 1.70, height: 42, mult: 'Multiplet', protons: 1, label: 'R₃C-H (Metina)', j: 0.02, width: 0.025 });
      } else if (p.includes('CH₃-C=O')) {
        nmrSignals.push({ ppm: 2.18, height: 85, mult: 'Singlet', protons: 3, label: 'CH₃-C=O (Asetil/Keton)', j: 0, width: 0.015 });
      } else if (p.includes('CH₃-O-')) {
        nmrSignals.push({ ppm: 3.80, height: 78, mult: 'Singlet', protons: 3, label: 'CH₃-O- (Metoksi/Eter)', j: 0, width: 0.015 });
      } else if (p.includes('Ar-H')) {
        nmrSignals.push({ ppm: 7.28, height: 70, mult: 'Doublet', protons: 2, label: 'Ar-H (Cincin Aromatik orto)', j: 0.03, width: 0.018 });
        nmrSignals.push({ ppm: 7.65, height: 68, mult: 'Doublet', protons: 2, label: 'Ar-H (Cincin Aromatik meta)', j: 0.03, width: 0.018 });
      } else if (p.includes('-CHO')) {
        nmrSignals.push({ ppm: 9.85, height: 88, mult: 'Singlet', protons: 1, label: '-CHO (Aldehid)', j: 0, width: 0.012 });
      } else if (p.includes('-COOH')) {
        nmrSignals.push({ ppm: 11.80, height: 50, mult: 'Singlet Lebar', protons: 1, label: '-COOH (Asam karboksilat)', j: 0, width: 0.12 });
      } else if (p.includes('-OH')) {
        nmrSignals.push({ ppm: 3.45, height: 46, mult: 'Singlet Lebar', protons: 1, label: '-OH (Hidroksil)', j: 0, width: 0.08 });
      }
    });

    // Lorentzian Line shape calculation
    function lorentz(x, x0, gamma, amp) {
      const d = x - x0;
      return amp * (gamma * gamma) / (d * d + gamma * gamma);
    }

    const numPoints = 800;
    const curvePoints = [];
    let cumulative = 0;
    const integralPoints = [];

    for (let i = 0; i <= numPoints; i++) {
      const ppm = maxPPM - (i / numPoints) * (maxPPM - minPPM);
      let intensity = (Math.sin(ppm * 100) * 0.3); // minimal baseline noise

      nmrSignals.forEach(s => {
        const w = s.width || 0.015;
        const j = s.j || 0.02;
        const h = s.height;

        if (s.mult === 'Singlet' || s.mult.includes('Lebar')) {
          intensity += lorentz(ppm, s.ppm, w, h);
        } else if (s.mult === 'Doublet') {
          intensity += lorentz(ppm, s.ppm - j / 2, w, h * 0.5);
          intensity += lorentz(ppm, s.ppm + j / 2, w, h * 0.5);
        } else if (s.mult === 'Triplet') {
          intensity += lorentz(ppm, s.ppm - j, w, h * 0.25);
          intensity += lorentz(ppm, s.ppm, w, h * 0.5);
          intensity += lorentz(ppm, s.ppm + j, w, h * 0.25);
        } else if (s.mult === 'Quartet') {
          intensity += lorentz(ppm, s.ppm - 1.5 * j, w, h * 0.15);
          intensity += lorentz(ppm, s.ppm - 0.5 * j, w, h * 0.35);
          intensity += lorentz(ppm, s.ppm + 0.5 * j, w, h * 0.35);
          intensity += lorentz(ppm, s.ppm + 1.5 * j, w, h * 0.15);
        } else {
          // Multiplet
          intensity += lorentz(ppm, s.ppm - 0.02, w, h * 0.3);
          intensity += lorentz(ppm, s.ppm, w, h * 0.5);
          intensity += lorentz(ppm, s.ppm + 0.02, w, h * 0.3);
        }
      });

      cumulative += Math.max(0, intensity);
      curvePoints.push({ ppm, intensity, x: ppmToX(ppm), y: intensityToY(intensity) });
    }

    // Normalize integral curve
    const maxCumul = cumulative || 1;
    curvePoints.forEach(pt => {
      // Scale integral across upper third of canvas
      integralPoints.push({ x: pt.x, y: padTop + plotH * 0.25 });
    });

    // Draw Spectrum Baseline & Curve
    ctx.beginPath();
    ctx.moveTo(ppmToX(maxPPM), intensityToY(0));
    curvePoints.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.strokeStyle = peakCol;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Draw Peak Markers & Labels
    const plottedSignals = [];
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';

    nmrSignals.forEach(s => {
      const px = ppmToX(s.ppm);
      const py = intensityToY(s.height);
      plottedSignals.push({ ...s, px, py });

      // Peak label pin
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = s.ppm === 0 ? textCol : (isLight ? '#c53030' : '#e2685a');
      ctx.fill();

      // Text annotation
      ctx.fillStyle = isLight ? '#162017' : '#eef2ea';
      ctx.fillText(`δ ${s.ppm.toFixed(2)}`, px, Math.max(padTop + 12, py - 8));
    });

    return { plottedSignals, curvePoints, ppmToX, intensityToY, padLeft, padRight, padTop, padBottom, plotW, plotH };
  }

  // =========================================================
  // 10. pH Speciation Curve Simulator (Henderson-Hasselbalch)
  // =========================================================
  function drawPHSpeciationCurve(canvas, molInfo = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    ctx.clearRect(0, 0, w, h);

    const padLeft = 45;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 40;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const gridCol = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
    const axisCol = isLight ? '#162017' : '#eef2ea';
    const textCol = isLight ? '#5e7260' : '#8a998a';
    const neutralCol = isLight ? '#0f8e81' : '#4fd1c5';
    const ionizedCol = isLight ? '#e53e3e' : '#fc8181';

    function phToX(ph) {
      return padLeft + (ph / 14) * plotW;
    }
    function pctToY(pct) {
      return padTop + (1 - pct / 100) * plotH;
    }

    // Grid & Axis
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let ph = 0; ph <= 14; ph += 2) {
      const x = phToX(ph);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.strokeStyle = gridCol;
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.fillText(ph.toString(), x, padTop + plotH + 6);
    }

    // Y Axis Ticks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [0, 50, 100].forEach(pct => {
      const y = pctToY(pct);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.strokeStyle = gridCol;
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.fillText(`${pct}%`, padLeft - 6, y);
    });

    // Axis Labels
    ctx.fillStyle = axisCol;
    ctx.font = '600 11px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('pH Lingkungan', padLeft + plotW / 2, h - 12);

    // Physiological Markers
    const markers = [
      { ph: 1.2, label: 'Lambung (1.2)' },
      { ph: 6.5, label: 'Usus (6.5)' },
      { ph: 7.4, label: 'Darah (7.4)' }
    ];
    markers.forEach(m => {
      const mx = phToX(m.ph);
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(mx, padTop);
      ctx.lineTo(mx, padTop + plotH);
      ctx.strokeStyle = isLight ? 'rgba(49,130,206,0.5)' : 'rgba(99,179,237,0.5)';
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Estimate pKa from formula/functional groups
    let pKa = 4.2; // default acid like Aspirin/Ibuprofen
    let isBase = false;
    const smi = (molInfo.smiles || '').toLowerCase();
    if (smi.includes('c(=o)o') || smi.includes('c(=o)o')) {
      pKa = 3.8;
      isBase = false;
    } else if (smi.includes('nc') || smi.includes('n1') || smi.includes('ncc')) {
      pKa = 8.8;
      isBase = true;
    } else if (smi.includes('o') && !smi.includes('=')) {
      pKa = 9.8;
      isBase = false;
    }

    const pointsNeutral = [];
    const pointsIonized = [];

    for (let ph = 0; ph <= 14; ph += 0.2) {
      let fractionNeutral = 0;
      if (!isBase) {
        // Acid HA <-> A- + H+
        fractionNeutral = 1 / (1 + Math.pow(10, ph - pKa)) * 100;
      } else {
        // Base BH+ <-> B + H+
        fractionNeutral = (1 - (1 / (1 + Math.pow(10, ph - pKa)))) * 100;
      }
      const fractionIonized = 100 - fractionNeutral;
      pointsNeutral.push({ x: phToX(ph), y: pctToY(fractionNeutral) });
      pointsIonized.push({ x: phToX(ph), y: pctToY(fractionIonized) });
    }

    // Draw Neutral Curve
    ctx.beginPath();
    pointsNeutral.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.strokeStyle = neutralCol;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Draw Ionized Curve
    ctx.beginPath();
    pointsIonized.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.strokeStyle = ionizedCol;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Legend
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = neutralCol;
    ctx.fillText(`● Bentuk Netral (pKa ≈ ${pKa.toFixed(1)})`, padLeft + 10, padTop + 14);
    ctx.fillStyle = ionizedCol;
    ctx.fillText('● Bentuk Terionisasi', padLeft + 10, padTop + 28);
  }

  // =========================================================
  // 11. NFPA 704 Hazard Diamond Renderer (Mathematical Vertex Exact)
  // =========================================================
  function drawNFPA704(canvas, data = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.44; // Diamond radius

    ctx.clearRect(0, 0, w, h);

    const health = data.health ?? 2;
    const flammability = data.flammability ?? 1;
    const instability = data.instability ?? 0;
    const special = data.special ?? '';

    function drawPoly(pts, fillStyle, strokeStyle = '#222222') {
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p[0], p[1]);
        else ctx.lineTo(p[0], p[1]);
      });
      ctx.closePath();
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 1. Top Diamond: Flammability (Red)
    drawPoly([
      [cx, cy - R],
      [cx + R / 2, cy - R / 2],
      [cx, cy],
      [cx - R / 2, cy - R / 2]
    ], '#e53e3e');

    // 2. Left Diamond: Health (Blue)
    drawPoly([
      [cx - R / 2, cy - R / 2],
      [cx, cy],
      [cx - R / 2, cy + R / 2],
      [cx - R, cy]
    ], '#3182ce');

    // 3. Right Diamond: Instability / Reactivity (Yellow)
    drawPoly([
      [cx + R / 2, cy - R / 2],
      [cx + R, cy],
      [cx + R / 2, cy + R / 2],
      [cx, cy]
    ], '#ecc94b');

    // 4. Bottom Diamond: Special (White)
    drawPoly([
      [cx, cy],
      [cx + R / 2, cy + R / 2],
      [cx, cy + R],
      [cx - R / 2, cy + R / 2]
    ], '#ffffff');

    // Draw Numbers exactly centered in each diamond
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px Space Grotesk, sans-serif';

    // Flammability text (White on Red)
    ctx.fillStyle = '#ffffff';
    ctx.fillText(flammability.toString(), cx, cy - R / 2);

    // Health text (White on Blue)
    ctx.fillStyle = '#ffffff';
    ctx.fillText(health.toString(), cx - R / 2, cy);

    // Instability text (Black on Yellow)
    ctx.fillStyle = '#1a202c';
    ctx.fillText(instability.toString(), cx + R / 2, cy);

    // Special text (Black on White)
    ctx.fillStyle = '#1a202c';
    ctx.font = 'bold 15px IBM Plex Mono, monospace';
    ctx.fillText((special || '–').toString(), cx, cy + R / 2);
  }

  // =========================================================
  // 12. Indonesian to English Chemical Translation Dictionary
  // =========================================================
  const ID_TO_EN_CHEM_DICT = {
    'air': 'water',
    'asam asetat': 'acetic acid',
    'asam salisilat': 'salicylic acid',
    'asam asetilsalisilat': 'acetylsalicylic acid',
    'asam benzoat': 'benzoic acid',
    'asam sitrat': 'citric acid',
    'asam format': 'formic acid',
    'asam semut': 'formic acid',
    'asam laktat': 'lactic acid',
    'asam oksalat': 'oxalic acid',
    'asam tartrat': 'tartaric acid',
    'asam askorbat': 'ascorbic acid',
    'vitamin c': 'ascorbic acid',
    'asam folat': 'folic acid',
    'asam klorida': 'hydrochloric acid',
    'asam sulfat': 'sulfuric acid',
    'asam nitrat': 'nitric acid',
    'parasetamol': 'paracetamol',
    'asetaminofen': 'acetaminophen',
    'kafein': 'caffeine',
    'teobromin': 'theobromine',
    'teofilin': 'theophylline',
    'etanol': 'ethanol',
    'alkohol': 'ethanol',
    'metanol': 'methanol',
    'isopropanol': 'isopropanol',
    'aseton': 'acetone',
    'glukosa': 'glucose',
    'sukrosa': 'sucrose',
    'fruktosa': 'fructose',
    'gliserol': 'glycerol',
    'gliserin': 'glycerol',
    'benzena': 'benzene',
    'toluena': 'toluene',
    'kloroform': 'chloroform',
    'formalin': 'formaldehyde',
    'formaldehida': 'formaldehyde',
    'fenol': 'phenol',
    'anilina': 'aniline',
    'urea': 'urea',
    'nikotin': 'nicotine',
    'morfin': 'morphine',
    'kodein': 'codeine',
    'amfetamin': 'amphetamine',
    'kolesterol': 'cholesterol',
    'kamper': 'camphor',
    'mentol': 'menthol',
    'vanilin': 'vanillin',
    'antrasena': 'anthracene',
    'naftalena': 'naphthalene',
    'piridina': 'pyridine'
  };

  function translateIndonesianChemicalName(query) {
    if (!query) return query;
    const lower = query.trim().toLowerCase();
    return ID_TO_EN_CHEM_DICT[lower] || query;
  }

  // 8. Molecular Sonification Audio Synthesizer (Web Audio API)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playMolecularTone(freqHz, duration = 0.5, type = 'sine', gainVal = 0.15) {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = type;
      osc.frequency.setValueAtTime(freqHz, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(4000, freqHz * 2.5), ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainVal, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  function playSpectroscopySonification(rules, type = 'ir') {
    if (!rules || !rules.length) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Sort rules by some logic, e.g. for IR it's wavenumber (cm-1)
    let sorted = [...rules];
    
    let now = ctx.currentTime;
    sorted.forEach((rule, idx) => {
      // Very simple mock sonification: calculate a base freq
      let baseFreq = type === 'ir' ? 200 + (rule.value / 4000) * 800 : 300 + (rule.value / 12) * 600;
      let dur = 0.3;
      setTimeout(() => playMolecularTone(baseFreq, dur, 'sine', 0.2), idx * 300);
    });
  }

  // 9. Pharmacopeia Essential Drug Presets (30 Essential Medications)
  const PHARMACOPEIA_DRUGS = [
    { name: 'Aspirin (Asam Asetilsalisilat)', class: 'NSAID / Antiplatelet', smiles: 'CC(=O)Oc1ccccc1C(=O)O', formula: 'C9H8O4' },
    { name: 'Parasetamol (Acetaminophen)', class: 'Analgesik / Antipiretik', smiles: 'CC(=O)Nc1ccc(O)cc1', formula: 'C8H9NO2' },
    { name: 'Kafein (Caffeine)', class: 'Stimulan SSP (Xanthine)', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', formula: 'C8H10N4O2' },
    { name: 'Ibuprofen', class: 'NSAID / Antiinflamasi', smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', formula: 'C13H18O2' },
    { name: 'Salbutamol (Albuterol)', class: 'Bronkodilator Beta-2', smiles: 'CC(C)(C)NCC(c1ccc(O)c(CO)c1)O', formula: 'C13H21NO3' },
    { name: 'Amoksisilin (Amoxicillin)', class: 'Antibiotik Beta-Laktam', smiles: 'CC1(C)S[C@@H]2[C@H](NC(=O)[C@H](N)c3ccc(O)cc3)C(=O)N2[C@H]1C(=O)O', formula: 'C16H19N3O5S' },
    { name: 'Ciprofloxacin', class: 'Antibiotik Fluorokuinolon', smiles: 'O=C(O)c1cn(C2CC2)c3cc(N4CCNCC4)c(F)cc3c1=O', formula: 'C17H18FN3O3' },
    { name: 'Metformin', class: 'Antidiabetes Oral (Biguanid)', smiles: 'CN(C)C(=N)NC(=N)N', formula: 'C4H11N5' },
    { name: 'Omeprazole', class: 'Penghambat Pompa Proton (PPI)', smiles: 'COc1ccc2[nH]c(S(=O)Cc3ncc(C)c(OC)c3C)nc2c1', formula: 'C17H19N3O3S' },
    { name: 'Atorvastatin (Lipitor)', class: 'Antihiperlipidemia (Statin)', smiles: 'CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CCC(O)CC(O)CC(=O)O', formula: 'C33H35FN2O5' },
    { name: 'Morfin (Morphine)', class: 'Analgesik Opioid Kuat', smiles: 'CN1CCC23C4C1CC5=C2C(=C(O)C=C5)OC3C(O)C=C4', formula: 'C17H19NO3' },
    { name: 'Diazepam (Valium)', class: 'Ansiolitik (Benzodiazepin)', smiles: 'CN1C(=O)CN=C(c2ccccc2)c3cc(Cl)ccc13', formula: 'C16H13ClN2O' },
    { name: 'Metotreksat (Methotrexate)', class: 'Antineoplastik / Antifolat', smiles: 'CN(Cc1cnc2nc(N)nc(N)c2n1)c3ccc(C(=O)NC(CCC(=O)O)C(=O)O)cc3', formula: 'C20H22N8O5' },
    { name: 'Dexamethasone', class: 'Kortikosteroid Antiinflamasi', smiles: 'CC1CC2C3CCC4=CC(=O)C=CC4(C)C3(F)C(O)CC2(C)C1(O)C(=O)CO', formula: 'C22H29FO5' },
    { name: 'Warfarin', class: 'Antikoagulan Oral', smiles: 'CC(=O)CC(c1ccccc1)c2c(O)c3ccccc3oc2=O', formula: 'C19H16O4' },
    { name: 'Propranolol', class: 'Beta-Blocker Kardiovaskular', smiles: 'CC(C)NCC(O)COc1cccc2ccccc12', formula: 'C16H21NO2' },
    { name: 'Asam Salisilat (Salicylic Acid)', class: 'Keratolitik / Prekursor Aspirin', smiles: 'Oc1ccccc1C(=O)O', formula: 'C7H6O3' },
    { name: 'Asam Mefenamat', class: 'NSAID / Analgesik', smiles: 'Cc1cccc(C)c1Nc2ccccc2C(=O)O', formula: 'C15H15NO2' },
    { name: 'Teofilin (Theophylline)', class: 'Bronkodilator Asma', smiles: 'Cn1c(=O)c2[nH]cnc2n(C)c1=O', formula: 'C7H8N4O2' }
  ];

  // 10. Universal Command Palette Engine (Ctrl + K)
  let cmdPaletteEl = null;

  function initCommandPalette() {
    if (document.getElementById('cmd-palette-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'cmd-palette-backdrop';
    backdrop.className = 'cmd-backdrop';
    backdrop.innerHTML = `
      <div class="cmd-modal" role="dialog" aria-modal="true" aria-label="Spotlight Quick Search">
        <div class="cmd-search-wrap">
          <span class="cmd-search-icon">🔍</span>
          <input type="text" class="cmd-input" id="cmd-palette-input" placeholder="Cari obat (Aspirin, Kafein...), menu tahap, atau aksi cepat..." autocomplete="off" />
          <span class="cmd-kbd">ESC untuk tutup</span>
        </div>
        <div class="cmd-results" id="cmd-palette-results"></div>
        <div class="cmd-footer">
          <span>Tekan <strong>↑</strong> <strong>↓</strong> untuk navigasi, <strong>Enter</strong> untuk memilih</span>
          <span>ChemWebApp Spotlight</span>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    cmdPaletteEl = backdrop;

    const input = backdrop.querySelector('#cmd-palette-input');
    const results = backdrop.querySelector('#cmd-palette-results');

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeCommandPalette();
    });

    input.addEventListener('input', () => renderCommandResults(input.value.trim()));

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCommandPalette();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveCmdHighlight(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveCmdHighlight(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = results.querySelector('.cmd-item.active');
        if (active) active.click();
      }
    });

    // Global shortcut Ctrl+K / Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggleCommandPalette();
      }
    });
  }

  function openCommandPalette() {
    initCommandPalette();
    if (!cmdPaletteEl) return;
    cmdPaletteEl.classList.add('open');
    const input = cmdPaletteEl.querySelector('#cmd-palette-input');
    input.value = '';
    renderCommandResults('');
    setTimeout(() => input.focus(), 50);
  }

  function closeCommandPalette() {
    if (!cmdPaletteEl) return;
    cmdPaletteEl.classList.remove('open');
  }

  function toggleCommandPalette() {
    if (cmdPaletteEl && cmdPaletteEl.classList.contains('open')) {
      closeCommandPalette();
    } else {
      openCommandPalette();
    }
  }

  let currentCmdIndex = 0;

  function moveCmdHighlight(dir) {
    if (!cmdPaletteEl) return;
    const items = Array.from(cmdPaletteEl.querySelectorAll('.cmd-item'));
    if (!items.length) return;
    items.forEach(it => it.classList.remove('active'));
    currentCmdIndex = (currentCmdIndex + dir + items.length) % items.length;
    items[currentCmdIndex].classList.add('active');
    items[currentCmdIndex].scrollIntoView({ block: 'nearest' });
  }

  function renderCommandResults(query) {
    if (!cmdPaletteEl) return;
    const results = cmdPaletteEl.querySelector('#cmd-palette-results');
    const q = query.toLowerCase();
    currentCmdIndex = 0;

    const sections = [];

    const folders = {
      1: 'tahap-1-struktur-2d-3d',
      2: 'tahap-2-pencarian-sifat',
      3: 'tahap-3-database-koleksi',
      4: 'tahap-4-analisis-komparasi',
      5: 'tahap-5-lab-reaksi-sintesis',
      6: 'tahap-6-docking-toksikologi'
    };
    const isSub = window.location.pathname.includes('/tahap');
    const prefix = isSub ? '../' : '';

    function getDynamicLink(stageNum, queryStr = '') {
      if (isStatic) {
        return `${prefix}${folders[stageNum]}/index.html${queryStr}`;
      } else {
        return `/tahap${stageNum}${queryStr}`;
      }
    }

    // Stage Navigation
    const stages = [
      { title: 'Tahap 1: Studio Molekul 2D/3D & Spektroskopi', sub: 'Viewer struktur, kalkulasi deskriptor, MMFF94, MEP & FTIR/NMR sonifikasi', url: getDynamicLink(1), badge: 'Modul 1' },
      { title: 'Tahap 2: Eksplorasi Sifat, GHS & PubChem', sub: 'Pencarian universal, NFPA 704 fire diamond, kelarutan Delaney ESOL & BCS', url: getDynamicLink(2), badge: 'Modul 2' },
      { title: 'Tahap 3: Database Koleksi & Manajemen', sub: 'Koleksi senyawa, scatterplot MW vs LogP, filter kaidah Lipinski/Rule of 3', url: getDynamicLink(3), badge: 'Modul 3' },
      { title: 'Tahap 4: Komparasi Senyawa & Tanimoto', sub: 'Analisis kemiripan topologi RDKit, rekomendasi bioisosterisme & AI Mutator', url: getDynamicLink(4), badge: 'Modul 4' },
      { title: 'Tahap 5: Lab Reaksi & Desain Sintesis', sub: 'Simulasi esterifikasi, amida, reduksi, retrosintesis & metrik Green Chemistry', url: getDynamicLink(5), badge: 'Modul 5' },
      { title: 'Tahap 6: Studio Docking 3D & Farmakokinetika', sub: 'Binding pocket PDB, toksisitas ADMET, HPLC/TLC & kurva kadar plasma PK', url: getDynamicLink(6), badge: 'Modul 6' }
    ];

    const matchedStages = stages.filter(s => !q || s.title.toLowerCase().includes(q) || s.sub.toLowerCase().includes(q));
    if (matchedStages.length) {
      sections.push({ category: 'Navigasi Modul Suite', items: matchedStages.map(s => ({
        icon: '🚀',
        title: s.title,
        sub: s.sub,
        badge: s.badge,
        action: () => { window.location.href = s.url; }
      }))});
    }

    // Pharmacopeia Drugs
    const matchedDrugs = PHARMACOPEIA_DRUGS.filter(d => !q || d.name.toLowerCase().includes(q) || d.class.toLowerCase().includes(q) || d.formula.toLowerCase().includes(q));
    if (matchedDrugs.length) {
      sections.push({ category: 'Pustaka Obat Farmakope Esensial', items: matchedDrugs.slice(0, 8).map(d => ({
        icon: '💊',
        title: d.name,
        sub: `${d.class} · ${d.formula} · ${d.smiles}`,
        badge: 'Muat di Tahap 1',
        action: () => { window.location.href = getDynamicLink(1, `?smiles=${encodeURIComponent(d.smiles)}`); }
      }))});
    }

    // Quick Actions
    const actions = [
      { icon: '📄', title: 'Cetak Laporan Riset Lengkap (PDF)', sub: 'Buka dialog print browser untuk menyimpan dokumen sebagai PDF publikasi', action: () => { closeCommandPalette(); window.print(); } },
      { icon: '🌓', title: 'Ganti Mode Tampilan (Gelap / Terang)', sub: 'Beralih antara tema gelap modern dan tema terang kontras tinggi', action: () => { toggleTheme(); } }
    ];
    const matchedActions = actions.filter(a => !q || a.title.toLowerCase().includes(q));
    if (matchedActions.length) {
      sections.push({ category: 'Aksi Cepat Sistem', items: matchedActions });
    }

    if (!sections.length) {
      results.innerHTML = '<div style="padding:24px; text-align:center; color:var(--muted); font-size:0.85rem;">Tidak ditemukan hasil untuk "' + escapeHtml(query) + '"</div>';
      return;
    }

    let itemCounter = 0;
    results.innerHTML = sections.map(sec => `
      <div class="cmd-category">${sec.category}</div>
      ${sec.items.map(it => {
        const isFirst = itemCounter === 0;
        itemCounter++;
        return `
          <div class="cmd-item ${isFirst ? 'active' : ''}" data-idx="${itemCounter - 1}">
            <div class="cmd-item-left">
              <span style="font-size:1.1rem;">${it.icon}</span>
              <div>
                <div class="cmd-item-title">${escapeHtml(it.title)}</div>
                <div class="cmd-item-sub">${escapeHtml(it.sub)}</div>
              </div>
            </div>
            ${it.badge ? `<span class="cmd-item-badge">${escapeHtml(it.badge)}</span>` : ''}
          </div>
        `;
      }).join('')}
    `).join('');

    // Bind click actions
    let flatIndex = 0;
    sections.forEach(sec => {
      sec.items.forEach(it => {
        const el = results.querySelector(`.cmd-item[data-idx="${flatIndex}"]`);
        if (el) {
          el.addEventListener('click', () => {
            closeCommandPalette();
            it.action();
          });
        }
        flatIndex++;
      });
    });
  }

  // 11. Universal Send-To Action Hub (Cross-Stage Navigation Helper)
  function renderSendToHub(smiles, containerEl, currentStage = 1) {
    if (!containerEl || !smiles) return;

    const folders = {
      1: 'tahap-1-struktur-2d-3d',
      2: 'tahap-2-pencarian-sifat',
      3: 'tahap-3-database-koleksi',
      4: 'tahap-4-analisis-komparasi',
      5: 'tahap-5-lab-reaksi-sintesis',
      6: 'tahap-6-docking-toksikologi'
    };
    const isSub = window.location.pathname.includes('/tahap');
    const prefix = isSub ? '../' : '';

    function getDynamicLink(stageNum, queryStr = '') {
      if (isStatic) {
        return `${prefix}${folders[stageNum]}/index.html${queryStr}`;
      } else {
        return `/tahap${stageNum}${queryStr}`;
      }
    }

    const encodedSmi = encodeURIComponent(smiles);
    const wrap = document.createElement('div');
    wrap.className = 'send-to-dropdown';
    wrap.innerHTML = `
      <button class="icon-btn small primary send-to-trigger" type="button">
        🚀 Kirim ke Tahap Lain ▾
      </button>
      <div class="send-to-content">
        <a class="send-to-item" href="${getDynamicLink(1, `?smiles=${encodedSmi}`)}">
          <span>🔬</span> Tahap 1: Studio 2D/3D &amp; Spektroskopi
        </a>
        <a class="send-to-item" href="${getDynamicLink(2, `?smiles=${encodedSmi}`)}">
          <span>🔍</span> Tahap 2: Cek Sifat, GHS &amp; PubChem
        </a>
        <a class="send-to-item" href="${getDynamicLink(4, `?smilesA=${encodedSmi}`)}">
          <span>⚖️</span> Tahap 4: Komparasi (sebagai Molekul A)
        </a>
        <a class="send-to-item" href="${getDynamicLink(4, `?smilesB=${encodedSmi}`)}">
          <span>⚖️</span> Tahap 4: Komparasi (sebagai Molekul B)
        </a>
        <a class="send-to-item" href="${getDynamicLink(5, `?smilesA=${encodedSmi}`)}">
          <span>⚗️</span> Tahap 5: Lab Reaksi (sebagai Reaktan A)
        </a>
        <a class="send-to-item" href="${getDynamicLink(6)}">
          <span>🧬</span> Tahap 6: Studio Docking &amp; ADMET
        </a>
      </div>
    `;

    const btn = wrap.querySelector('.send-to-trigger');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.classList.toggle('open');
    });

    document.addEventListener('click', () => wrap.classList.remove('open'));

    containerEl.appendChild(wrap);
  }

  // Export to global window object
  window.ChemApp = {
    mountChemNavbar,
    evaluateLipinski,
    renderLipinskiCard,
    exportStructure2D,
    downloadBlobUrl,
    getHighlightDetails,
    drawBioavailabilityRadar,
    estimateSpectroscopy,
    simulateIRSpectrum,
    simulateNMRSpectrum,
    drawPHSpeciationCurve,
    drawNFPA704,
    translateIndonesianChemicalName,
    playMolecularTone,
    playSpectroscopySonification,
    openCommandPalette,
    closeCommandPalette,
    initCommandPalette,
    renderSendToHub,
    getDynamicLink,
    PHARMACOPEIA_DRUGS,
    toggleTheme,
    applyTheme
  };
})();
