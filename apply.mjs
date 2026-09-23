import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'app/web/views/UniverseView.tsx',
  'app/web/views/CharacterWorkspaceView.tsx',
  'app/web/views/SandboxView.tsx',
  'app/api/routes/control.ts',
];

function replace(file, oldText, newText) {
  const full = path.join(root, file);
  let text = fs.readFileSync(full, 'utf8');
  const count = text.split(oldText).length - 1;
  if (count !== 1) {
    throw new Error(`${file}: expected exactly 1 occurrence, found ${count}: ${oldText.slice(0, 120)}`);
  }
  text = text.replace(oldText, newText);
  fs.writeFileSync(full, text);
}

// UI: remove semantic creation defaults; require explicit choices.
replace('app/web/views/UniverseView.tsx',
`  const [locType, setLocType] = useState('SETTLEMENT');
  const [locAccess, setLocAccess] = useState('OPEN');

  const [objName, setObjName] = useState('');
  const [objDesc, setObjDesc] = useState('');
  const [objType, setObjType] = useState('RELIC');`,
`  const [locType, setLocType] = useState('');
  const [locAccess, setLocAccess] = useState('');

  const [objName, setObjName] = useState('');
  const [objDesc, setObjDesc] = useState('');
  const [objType, setObjType] = useState('');`);

replace('app/web/views/UniverseView.tsx',
`  const [relChar1, setRelChar1] = useState('');
  const [relChar2, setRelChar2] = useState('');
  const [relType, setRelType] = useState('ALLY');
  const [relDynamic, setRelDynamic] = useState('');

  const [mysteryDesc, setMysteryDesc] = useState('');
  const [mysteryType, setMysteryType] = useState('MYSTERY');
  const [mysterySignificance, setMysterySignificance] = useState('MAJOR');`,
`  const [relChar1, setRelChar1] = useState('');
  const [relChar2, setRelChar2] = useState('');
  const [relType, setRelType] = useState('');
  const [relDirection, setRelDirection] = useState('');
  const [relDynamic, setRelDynamic] = useState('');

  const [mysteryDesc, setMysteryDesc] = useState('');
  const [mysteryType, setMysteryType] = useState('');
  const [mysterySignificance, setMysterySignificance] = useState('');
  const [mysteryOwnerDomain, setMysteryOwnerDomain] = useState('');`);

replace('app/web/views/UniverseView.tsx',
`        relationshipType: relType,
        dynamic: relDynamic.trim() || undefined,`,
`        relationshipType: relType,
        direction: relDirection,
        dynamic: relDynamic.trim() || undefined,`);

replace('app/web/views/UniverseView.tsx',
`        significance: mysterySignificance,
      });`,
`        significance: mysterySignificance,
        ownerDomain: mysteryOwnerDomain,
      });`);

replace('app/web/views/UniverseView.tsx',
`              <option value="SETTLEMENT">PEMUKIMAN / KOTA</option>`,
`              <option value="">-- Belum ditentukan --</option>
              <option value="SETTLEMENT">PEMUKIMAN / KOTA</option>`);

replace('app/web/views/UniverseView.tsx',
`              <option value="RELIC">PUSAKA / ARTEFAK</option>`,
`              <option value="">-- Belum ditentukan --</option>
              <option value="RELIC">PUSAKA / ARTEFAK</option>`);

replace('app/web/views/UniverseView.tsx',
`              <option value="ALLY">SEKUTU / KAWAN (ALLY)</option>`,
`              <option value="">-- Pilih Tipe --</option>
              <option value="ALLY">SEKUTU / KAWAN (ALLY)</option>`);

replace('app/web/views/UniverseView.tsx',
`          <div>
            <label className="block font-bold text-slate-700 mb-1">Dinamika Hubungan</label>`,
`          <div>
            <label className="block font-bold text-slate-700 mb-1">Arah Relasi *</label>
            <select
              required
              value={relDirection}
              onChange={(e) => setRelDirection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
            >
              <option value="">-- Pilih Arah --</option>
              <option value="UNIDIRECTIONAL">SATU ARAH</option>
              <option value="BIDIRECTIONAL">DUA ARAH</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Dinamika Hubungan</label>`);

replace('app/web/views/UniverseView.tsx',
`              <option value="MYSTERY">MISTERI DUNIA</option>`,
`              <option value="">-- Belum ditentukan --</option>
              <option value="MYSTERY">MISTERI DUNIA</option>`);

replace('app/web/views/UniverseView.tsx',
`              <option value="MAJOR">UTAMA (MAJOR)</option>`,
`              <option value="">-- Belum ditentukan --</option>
              <option value="MAJOR">UTAMA (MAJOR)</option>`);

replace('app/web/views/UniverseView.tsx',
`          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Klasifikasi</label>`,
`          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Domain Pemilik *</label>
              <select
                required
                value={mysteryOwnerDomain}
                onChange={(e) => setMysteryOwnerDomain(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
              >
                <option value="">-- Pilih Domain --</option>
                <option value="CHARACTER">CHARACTER</option>
                <option value="RELATIONSHIP">RELATIONSHIP</option>
                <option value="OBJECT">OBJECT</option>
                <option value="KNOWLEDGE">KNOWLEDGE</option>
                <option value="STATE">STATE</option>
                <option value="LOCATION">LOCATION</option>
                <option value="DAILY_UNIVERSE">DAILY_UNIVERSE</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Klasifikasi</label>`);

replace('app/web/views/UniverseView.tsx',
`disabled={isSubmitting || !relChar1 || !relChar2 || relChar1 === relChar2}`,
`disabled={isSubmitting || !relChar1 || !relChar2 || !relType || !relDirection || relChar1 === relChar2}`);

replace('app/web/views/UniverseView.tsx',
`disabled={isSubmitting || !mysteryDesc.trim()}`,
`disabled={isSubmitting || !mysteryDesc.trim() || !mysteryType || !mysterySignificance || !mysteryOwnerDomain}`);

replace('app/web/views/CharacterWorkspaceView.tsx',
`  const [knowCertainty, setKnowCertainty] = useState('FACT');`,
`  const [knowCertainty, setKnowCertainty] = useState('');`);

replace('app/web/views/CharacterWorkspaceView.tsx',
`                <option value="FACT">FAKTA PASTI (FACT)</option>`,
`                <option value="">-- Belum ditentukan --</option>
                <option value="FACT">FAKTA PASTI (FACT)</option>`);

replace('app/web/views/CharacterWorkspaceView.tsx',
`<label className="block font-bold text-slate-700 mb-1">Sumber Perolehan</label>`,
`<label className="block font-bold text-slate-700 mb-1">Sumber Perolehan *</label>`);

replace('app/web/views/CharacterWorkspaceView.tsx',
`              placeholder="Contoh: Membaca manuskrip kuno"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"`,
`              placeholder="Contoh: Membaca manuskrip kuno"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
              required`);

replace('app/web/views/CharacterWorkspaceView.tsx',
`disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Tambah Pengetahuan'}`,
`disabled={isSubmitting || !knowCertainty || !knowSource.trim()}>
              {isSubmitting ? 'Menyimpan...' : 'Tambah Pengetahuan'}`);

replace('app/web/views/SandboxView.tsx',
`genre: universe?.storyMetadata?.genre || 'Fantasi',`,
`genre: universe?.storyMetadata?.genre ?? '',`);

replace('app/web/views/SandboxView.tsx',
`📅 {universe?.temporal?.currentUniverseDate || '2024-01-01'}`,
`📅 {universe?.temporal?.currentUniverseDate ?? 'Belum ditentukan'}`);

// API: never invent semantic facts when the request omits them.
replace('app/api/routes/control.ts',
`          status: r.status ?? 'ACTIVE',
          dynamic: (r as any).dynamic || (r.relationshipType ? \`Relasi: \${r.relationshipType}\` : 'Belum tercatat'),
          narrativeBasis: (r as any).narrativeBasis || (r.notes ? r.notes : 'Terbentuk seiring perkembangan cerita.')`,
`          status: r.status ?? null,
          dynamic: (r as any).dynamic ?? null,
          narrativeBasis: (r as any).narrativeBasis ?? (r.notes ?? null)`);

replace('app/api/routes/control.ts',
`      const genre = input?.genre || 'Fantasi / Petualangan';`,
`      const genre = input?.genre ?? '';`);

replace('app/api/routes/control.ts',
`       referencedSubject: referencedSubject ? String(referencedSubject).trim() : 'Fakta Semesta',
       statement: String(statement).trim(),
       knowledgeStatus: 'ACTIVE',
       acquisitionSource: acquisitionSource ? String(acquisitionSource).trim() : 'Pengalaman Langsung',
       acquiredDate: uCopy.temporalContext.currentUniverseDate,
       certainty: (certainty || EpistemicCertainty.FACT) as EpistemicCertainty,
       isUniverseFactConfirmed: true,`,
`       referencedSubject: referencedSubject ? String(referencedSubject).trim() : '',
       statement: String(statement).trim(),
       knowledgeStatus: 'ACTIVE',
       acquisitionSource: acquisitionSource ? String(acquisitionSource).trim() : '',
       acquiredDate: uCopy.temporalContext.currentUniverseDate,
       certainty: (certainty || '') as EpistemicCertainty,
       isUniverseFactConfirmed: undefined,`);

replace('app/api/routes/control.ts',
`    const { subjectRef, targetRef, relationshipType, direction, strength, dynamic, narrativeBasis } = req.body ?? {};
    if (!subjectRef || !targetRef) return res.status(400).json({ error: 'TOKOH_HUBUNGAN_DIBUTUHKAN' });`,
`    const { subjectRef, targetRef, relationshipType, direction, strength, dynamic, narrativeBasis } = req.body ?? {};
    if (!subjectRef || !targetRef) return res.status(400).json({ error: 'TOKOH_HUBUNGAN_DIBUTUHKAN' });
    if (!relationshipType || !direction) return res.status(400).json({ error: 'TIPE_DAN_ARAH_RELASI_DIBUTUHKAN' });`);

replace('app/api/routes/control.ts',
`      relationshipType: relationshipType ? String(relationshipType) : 'ALLY',
      direction: direction ? String(direction) as any : 'BIDIRECTIONAL',
      status: EntityLifecycleStatus.ACTIVE,
      strength: typeof strength === 'number' ? strength : 0.8,`,
`      relationshipType: String(relationshipType).trim(),
      direction: String(direction) as any,
      status: EntityLifecycleStatus.ACTIVE,
      strength: typeof strength === 'number' ? strength : undefined,`);

replace('app/api/routes/control.ts',
`    (newRel as any).dynamic = dynamic ? String(dynamic) : 'Hubungan Saling Percaya';
    (newRel as any).narrativeBasis = narrativeBasis ? String(narrativeBasis) : 'Terbangun dari pengalaman bersama.';`,
`    if (dynamic !== undefined) (newRel as any).dynamic = String(dynamic).trim();
    if (narrativeBasis !== undefined) (newRel as any).narrativeBasis = String(narrativeBasis).trim();`);

replace('app/api/routes/control.ts',
`    const { conditionType, description, targetEntityRef } = req.body ?? {};
    if (!description) return res.status(400).json({ error: 'DESKRIPSI_MISTERI_DIBUTUHKAN' });`,
`    const { conditionType, description, targetEntityRef, ownerDomain } = req.body ?? {};
    if (!description) return res.status(400).json({ error: 'DESKRIPSI_MISTERI_DIBUTUHKAN' });
    if (!conditionType || !ownerDomain) return res.status(400).json({ error: 'KLASIFIKASI_DAN_DOMAIN_MISTERI_DIBUTUHKAN' });`);

replace('app/api/routes/control.ts',
`      conditionType: conditionType ? String(conditionType) : 'NARRATIVE_MYSTERY',
      description: String(description).trim(),
      ownerDomain: makeDomainID('LOCATION'),
      targetEntityRef: targetEntityRef ? String(targetEntityRef) : 'UNSPECIFIED',`,
`      conditionType: String(conditionType).trim(),
      description: String(description).trim(),
      ownerDomain: makeDomainID(String(ownerDomain).trim()),
      targetEntityRef: targetEntityRef ? String(targetEntityRef).trim() : undefined,`);

replace('app/api/routes/control.ts',
`      conditionType: String(conditionType).trim(),
      description: String(description).trim(),
      ownerDomain: makeDomainID(String(ownerDomain).trim()),
      targetEntityRef: targetEntityRef ? String(targetEntityRef).trim() : undefined,
      temporalScope: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalCategory: 'POSSIBILITY' as any },
      dependencyRefs: [],
      currentStatus: 'CARRYOVER',`,
`      conditionType: String(conditionType).trim(),
      description: String(description).trim(),
      ownerDomain: makeDomainID(String(ownerDomain).trim()),
      targetEntityRef: targetEntityRef ? String(targetEntityRef).trim() : undefined,
      temporalScope: { effectiveFrom: uCopy.temporalContext.currentUniverseTime, temporalCategory: 'POSSIBILITY' as any },
      dependencyRefs: [],
      currentStatus: 'PENDING',`);

replace('app/api/routes/control.ts',
`    const defaultLoc = Object.keys(uCopy.locations || {})[0] || 'LOC_DEFAULT';`,
`    const objectLocation = locationRef ? String(locationRef).trim() : 'UNKNOWN';`);

replace('app/api/routes/control.ts',
`      objectType: objectType ? String(objectType).trim() as any : 'PHYSICAL' as any,
      category: 'ARTIFACT',
      categoryPath: ['ARTIFACT'],`,
`      objectType: objectType ? String(objectType).trim() as any : 'UNKNOWN' as any,
      category: 'UNKNOWN',
      categoryPath: ['UNKNOWN'],`);

replace('app/api/routes/control.ts',
`      possessionStatus: (possessionRef || currentUserRef || currentWearerRef) ? 'HELD' as any : 'UNCLAIMED' as any,`,
`      possessionStatus: (possessionRef || currentUserRef || currentWearerRef) ? 'HELD' as any : 'UNKNOWN' as any,`);

replace('app/api/routes/control.ts',
`      locationRef: locationRef ? String(locationRef) : defaultLoc,`,
`      locationRef: objectLocation,`);

replace('app/api/routes/control.ts',
`      accessStatus: 'ACCESSIBLE' as any,
      condition: condition ? String(condition).trim() as any : 'INTACT' as any,
      status: 'ACTIVE' as any,
      identityStatus: 'CONFIRMED' as any,`,
`      accessStatus: 'UNKNOWN' as any,
      condition: condition ? String(condition).trim() as any : 'UNKNOWN' as any,
      status: 'UNKNOWN' as any,
      identityStatus: 'UNKNOWN' as any,`);

replace('app/api/routes/control.ts',
`    const currentDate = new Date(uCopy.temporalContext.currentUniverseDate || '2024-01-01');`,
`    const currentDateValue = uCopy.temporalContext.currentUniverseDate;
    if (!currentDateValue) {
      return res.status(409).json({ error: 'TEMPORAL_CONTEXT_UNRESOLVED', message: 'Tanggal semesta belum ditentukan.' });
    }
    const currentDate = new Date(currentDateValue);
    if (Number.isNaN(currentDate.getTime())) {
      return res.status(409).json({ error: 'TEMPORAL_CONTEXT_INVALID', message: 'Tanggal semesta tidak valid.' });
    }`);

console.log('Final Integrity Cleanup applied successfully.');
