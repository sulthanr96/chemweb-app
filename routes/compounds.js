const express = require('express');
const router = express.Router();
const Compound = require('../models/Compound');

// Field yang boleh diisi user/klien saat create — dipakai juga saat merge dedup
const CREATABLE_FIELDS = [
  'cid', 'name', 'iupacName', 'canonicalSmiles', 'isomericSmiles',
  'inchi', 'inchikey',
  'molecularFormula', 'molecularWeight',
  'logp', 'tpsa', 'hbd', 'hba', 'rotatableBonds', 'monoisotopicMass',
  'complexity', 'charge', 'covalentUnitCount', 'definedAtomStereoCount', 'undefinedAtomStereoCount',
  'meltingPoint', 'boilingPoint', 'density', 'solubility', 'vaporPressure', 'flashPoint', 'viscosity',
  'hazards',
  'imageType', 'imageData',
  'tags', 'notes', 'source',
];

function pickBody(body) {
  const out = {};
  for (const key of CREATABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

// POST /api/compounds — simpan senyawa baru (dengan dedup by canonicalSmiles)
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.canonicalSmiles) {
      return res.status(400).json({ error: 'canonicalSmiles wajib diisi' });
    }

    const picked = pickBody(body);

    // Dedup: kalau SMILES kanonik yang sama sudah ada di koleksi, jangan bikin entri
    // baru — perkaya/perbarui data yang sudah ada (mis. entri lama dari Tahap 1 yang
    // datanya minim, disempurnakan saat user simpan ulang dari Tahap 2 untuk senyawa
    // yang sama). tags & notes milik user tidak ditimpa.
    const existing = await Compound.findOne({ canonicalSmiles: body.canonicalSmiles });
    if (existing) {
      const update = { ...picked };
      delete update.tags;
      delete update.notes;
      // Jangan timpa field yang sudah terisi dengan nilai kosong dari sumber baru
      for (const key of Object.keys(update)) {
        const val = update[key];
        const isEmpty = val === null || val === undefined || val === '' ||
          (Array.isArray(val) && val.length === 0);
        if (isEmpty && existing[key] !== undefined && existing[key] !== null && existing[key] !== '') {
          delete update[key];
        }
      }
      Object.assign(existing, update);
      await existing.save();
      return res.status(200).json({ ...existing.toObject(), duplicate: true });
    }

    const compound = await Compound.create(picked);
    res.status(201).json(compound);
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan senyawa', detail: err.message });
  }
});

// POST /api/compounds/batch — simpan jamak senyawa sekaligus (dengan dedup)
router.post('/batch', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body.items || []);
    if (!items.length) {
      return res.status(400).json({ error: 'Array items tidak boleh kosong' });
    }

    const results = { inserted: 0, updated: 0, errors: 0 };
    for (const raw of items) {
      if (!raw.canonicalSmiles) {
        results.errors++;
        continue;
      }
      const picked = pickBody(raw);
      const existing = await Compound.findOne({ canonicalSmiles: raw.canonicalSmiles });
      if (existing) {
        const update = { ...picked };
        if (update.tags && existing.tags && existing.tags.length) {
          // Gabungkan tags jika ada
          const combinedTags = Array.from(new Set([...existing.tags, ...update.tags]));
          update.tags = combinedTags;
        } else {
          delete update.tags;
        }
        if (!update.notes) delete update.notes;

        for (const key of Object.keys(update)) {
          const val = update[key];
          const isEmpty = val === null || val === undefined || val === '' ||
            (Array.isArray(val) && val.length === 0);
          if (isEmpty && existing[key] !== undefined && existing[key] !== null && existing[key] !== '') {
            delete update[key];
          }
        }
        Object.assign(existing, update);
        await existing.save();
        results.updated++;
      } else {
        await Compound.create(picked);
        results.inserted++;
      }
    }

    res.json({ ok: true, ...results });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses batch import', detail: err.message });
  }
});

// GET /api/compounds/export/all — ambil semua data tanpa paginasi untuk kebutuhan ekspor (CSV/JSON/SDF)
router.get('/export/all', async (req, res) => {
  try {
    const items = await Compound.find({}).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data untuk ekspor', detail: err.message });
  }
});

// GET /api/compounds — list + filter (tag, cari nama/formula/smiles) + pagination + sort
router.get('/', async (req, res) => {
  try {
    const { q, tag, page = 1, limit = 20, sort = 'newest' } = req.query;
    const filter = {};

    if (tag) filter.tags = tag;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { iupacName: { $regex: q, $options: 'i' } },
        { molecularFormula: { $regex: q, $options: 'i' } },
        { canonicalSmiles: { $regex: q, $options: 'i' } },
      ];
    }

    const SORT_MAP = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      mw_asc: { molecularWeight: 1 },
      mw_desc: { molecularWeight: -1 },
    };
    const sortSpec = SORT_MAP[sort] || SORT_MAP.newest;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const [items, total] = await Promise.all([
      Compound.find(filter)
        .sort(sortSpec)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Compound.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil daftar senyawa', detail: err.message });
  }
});

// GET /api/compounds/tags — daftar semua tag unik (untuk filter dropdown)
router.get('/tags', async (req, res) => {
  try {
    const tags = await Compound.distinct('tags');
    res.json(tags.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil daftar tag', detail: err.message });
  }
});

// GET /api/compounds/:id — detail
router.get('/:id', async (req, res) => {
  try {
    const compound = await Compound.findById(req.params.id);
    if (!compound) return res.status(404).json({ error: 'Senyawa tidak ditemukan' });
    res.json(compound);
  } catch (err) {
    res.status(400).json({ error: 'ID tidak valid', detail: err.message });
  }
});

// PUT /api/compounds/:id — update (nama, tag, notes, dsb)
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'iupacName', 'tags', 'notes'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const compound = await Compound.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!compound) return res.status(404).json({ error: 'Senyawa tidak ditemukan' });
    res.json(compound);
  } catch (err) {
    res.status(400).json({ error: 'Gagal update senyawa', detail: err.message });
  }
});

// DELETE /api/compounds/:id
router.delete('/:id', async (req, res) => {
  try {
    const compound = await Compound.findByIdAndDelete(req.params.id);
    if (!compound) return res.status(404).json({ error: 'Senyawa tidak ditemukan' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'ID tidak valid', detail: err.message });
  }
});

module.exports = router;
