const mongoose = require('mongoose');

const compoundSchema = new mongoose.Schema(
  {
    // Nomor CID PubChem, opsional (hanya ada kalau berasal dari Tahap 2 atau lookup Tahap 1)
    cid: { type: Number, default: null },

    name: { type: String, trim: true, default: '' },
    iupacName: { type: String, trim: true, default: '' },
    canonicalSmiles: { type: String, trim: true, required: true },
    isomericSmiles: { type: String, trim: true, default: '' },

    // Identifier standar — penting untuk dedup & cross-reference, sebelumnya tidak ada sama sekali
    inchi: { type: String, trim: true, default: '' },
    inchikey: { type: String, trim: true, default: '' },

    molecularFormula: { type: String, trim: true, default: '' },
    molecularWeight: { type: Number, default: null },

    // Descriptor sifat — bisa datang dari RDKit.js (Tahap 1) atau PubChem (Tahap 2)
    logp: { type: Number, default: null }, // CrippenClogP (T1) atau XLogP (T2)
    tpsa: { type: Number, default: null },
    hbd: { type: Number, default: null },
    hba: { type: Number, default: null },
    rotatableBonds: { type: Number, default: null },
    monoisotopicMass: { type: Number, default: null },

    // Deskriptor struktural tambahan dari PubChem (sebelumnya tidak diambil sama sekali)
    complexity: { type: Number, default: null },
    charge: { type: Number, default: null },
    covalentUnitCount: { type: Number, default: null },
    definedAtomStereoCount: { type: Number, default: null },
    undefinedAtomStereoCount: { type: Number, default: null },

    // Sifat fisik-kimia eksperimental dari PubChem PUG-View (String karena datang dengan
    // satuan & kadang beberapa nilai/sumber sekaligus — tidak semua senyawa punya data ini).
    meltingPoint: { type: String, trim: true, default: '' },
    boilingPoint: { type: String, trim: true, default: '' },
    density: { type: String, trim: true, default: '' },
    solubility: { type: String, trim: true, default: '' },
    vaporPressure: { type: String, trim: true, default: '' },
    flashPoint: { type: String, trim: true, default: '' },
    viscosity: { type: String, trim: true, default: '' },

    // Ringkasan bahaya GHS (kalimat singkat, bukan dokumen SDS lengkap)
    hazards: { type: [String], default: [] },

    // Gambar struktur disimpan langsung (bukan cuma URL, biar tidak expired)
    // imageType: 'svg' (dari RDKit Tahap 1) atau 'png-data' (dari PubChem Tahap 2, di-fetch lalu disimpan sbg base64 data URL)
    imageType: { type: String, enum: ['svg', 'png-data', 'none'], default: 'none' },
    imageData: { type: String, default: '' },

    tags: { type: [String], default: [] },
    notes: { type: String, trim: true, default: '' },

    source: { type: String, enum: ['manual', 'tahap1', 'tahap2'], default: 'manual' },
  },
  { timestamps: true }
);

// Index untuk pencarian nama/formula dan filter tag
compoundSchema.index({ name: 'text', iupacName: 'text', molecularFormula: 'text' });
compoundSchema.index({ tags: 1 });
// Index untuk cek duplikat cepat sebelum insert (lihat routes/compounds.js)
compoundSchema.index({ canonicalSmiles: 1 });

module.exports = mongoose.model('Compound', compoundSchema);
