import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase.js';
import { fetchCredits, deductCredits } from '../lib/creditsService.js';
import { createBatchJob, submitBatchToFastAPI, pollBatchStatus, triggerBatchDownload } from '../lib/batchService.js';
import { useClientMode } from '../lib/clientConfig.js';

const STYLE_AVAILABILITY = {
  "Home Furnishing": { "Living Decor": [], "Bed & Bath": [], "Table Linens": [] },
  "Cosmetics": { "Fragrances & Essential Oils": [], "Haircare & Treatment": [], "Skincare & Wellness": [] },
  "Apparels": { "Kids Wear": [], "Men": [], "Women": [], "Sustainable & Handlooms": [] },
  "Footwear": { "Active & Casual": [], "Heels, Flats & Loafers": [], "Ethnic — Juttis & Kolhapuri": [] },
  "Bags & Accessories": { "Wallets, Belts & Scarves": [] },
  "Food & Beverages": { "Fresh Vegetables & Fruits": [], "Frozen Fruits": [] },
  "Handicraft & Export": { "Artisanal Decor & Wall Art": [], "Dining & Kitchen": [] },
  "Jewellery": { "Ethnic & Traditional": [], "Western Pieces": [] },
};

const STYLE_OPTIONS = [
  { key: 'white_bg',      label: 'White BG' },
  { key: 'white_bg_dims', label: 'White BG + Dims' },
  { key: 'with_model',    label: 'With Model' },
  { key: 'professional',  label: 'Professional' },
  { key: 'flat_lay',      label: 'Flat Lay' },
];

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'expired']);
const POLL_INTERVAL_MS = 5000;

function SectionLabel({ children }) {
  return (
    <span className="text-[11px] tracking-[0.25em] uppercase font-['DM_Sans'] text-[#888888] mb-3 block font-medium">
      {children}
    </span>
  );
}

function DropZone({ accept, multiple, onFiles, isDragging, setIsDragging, children, className = '' }) {
  const inputRef = useRef(null);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return IMAGE_EXTS.has(ext);
    });
    if (files.length) onFiles(files);
  }, [onFiles, setIsDragging]);

  return (
    <div
      className={`border border-dashed rounded-none cursor-pointer transition-all ${
        isDragging ? 'border-[#a78bfa] bg-[#a78bfa]/5' : 'border-[#2a2a2a] hover:border-[#444]'
      } ${className}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = ''; }}
      />
    </div>
  );
}

function StyledSelect({ value, onChange, disabled, children, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const [openUpward, setOpenUpward] = useState(false);

  const options = [];
  let placeholderText = placeholder || 'Select option';
  const childrenArray = Array.isArray(children) ? children.flat() : [children];
  childrenArray.forEach(child => {
    if (child?.type === 'option') {
      if (child.props.disabled) placeholderText = child.props.children;
      else options.push({ value: child.props.value, label: child.props.children });
    }
  });
  const selectedOption = options.find(o => o.value === value);

  function handleToggle() {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 240);
    }
    setIsOpen(o => !o);
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        onClick={handleToggle}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className={`w-full bg-transparent border-0 border-b ${
          disabled ? 'border-[#1e1e1e] text-[#444] cursor-not-allowed'
          : isOpen ? 'border-[#c9a96e] text-[#f0ede8]'
          : 'border-[#333333] text-[#f0ede8] hover:border-[#555]'
        } rounded-none px-0 py-3 font-['DM_Sans'] text-sm transition-colors flex items-center justify-between focus:outline-none`}
      >
        <span className={selectedOption ? 'text-[#f0ede8]' : 'text-[#666666]'}>
          {selectedOption ? selectedOption.label : placeholderText}
        </span>
        <span className={`transition-transform duration-200 text-[#c9a96e] ${isOpen ? 'rotate-180' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {isOpen && !disabled && (
        <div className={`absolute left-0 right-0 max-h-60 overflow-y-auto bg-[#111] border border-[#222] z-50 shadow-[0_10px_25px_rgba(0,0,0,0.5)] ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange({ target: { value: opt.value } }); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 font-['DM_Sans'] text-sm transition-colors border-b border-[#1a1a1a] last:border-0 ${
                value === opt.value ? 'bg-[#c9a96e]/10 text-[#c9a96e] font-medium' : 'text-[#aaaaaa] hover:bg-[#1a1a1a] hover:text-[#f0ede8]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BatchUpload() {
  const navigate = useNavigate();
  const { clientCode } = useClientMode();

  // Section 1 — source
  const [sourceTab, setSourceTab] = useState('images');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagesDragging, setImagesDragging] = useState(false);
  const [driveLink, setDriveLink] = useState('');

  // Section 2 — CSV
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [csvDragging, setCsvDragging] = useState(false);
  const [csvFilename, setCsvFilename] = useState('');

  // Section 3 — settings
  const [industry, setIndustry] = useState('');
  const [category, setCategory] = useState('');
  const [selectedStyles, setSelectedStyles] = useState(new Set());
  const [sceneBrief, setSceneBrief] = useState('Create a premium ecommerce product image with a clean premium background.');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Polling state
  const [pollingJobs, setPollingJobs] = useState([]); // [{ batchId, label, status, counts, downloaded }]
  const pollTimerRef = useRef(null);

  // ── Image selection ───────────────────────────────────────────
  function handleImageFiles(files) {
    const images = files.filter(f => IMAGE_EXTS.has(f.name.split('.').pop().toLowerCase()));
    if (images.length) setSelectedImages(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...images.filter(f => !names.has(f.name))];
    });
  }

  function removeImage(name) {
    setSelectedImages(prev => prev.filter(f => f.name !== name));
  }

  // ── CSV parsing ──────────────────────────────────────────────
  function handleCsvFiles(files) {
    const file = files.find(f => f.name.toLowerCase().endsWith('.csv'));
    if (!file) return;
    setCsvError('');
    setCsvFilename(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields?.map(f => f.trim().toLowerCase()) ?? [];
        if (!fields.includes('filename') || !fields.includes('product_name')) {
          setCsvError('CSV must include "filename" and "product_name" columns.');
          setCsvRows([]);
          return;
        }
        const rows = results.data.map(row => {
          const n = {};
          for (const [k, v] of Object.entries(row)) n[k.trim().toLowerCase()] = v;
          return n;
        });
        setCsvRows(rows);
      },
      error: () => { setCsvError('Failed to parse CSV.'); setCsvRows([]); },
    });
  }

  // ── Style toggle ─────────────────────────────────────────────
  function toggleStyle(key) {
    setSelectedStyles(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── Polling ──────────────────────────────────────────────────
  function startPolling(jobs, supabaseJobId) {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    async function tick(currentJobs) {
      let allDone = true;
      const updated = await Promise.all(currentJobs.map(async job => {
        if (TERMINAL_STATUSES.has(job.status)) return job;
        try {
          const data = await pollBatchStatus(job.batchId);
          const newStatus = data.status || 'unknown';
          const counts = data.request_counts || {};
          const isDone = TERMINAL_STATUSES.has(newStatus);
          if (!isDone) allDone = false;

          if (newStatus === 'completed' && data.output_file_id && !job.downloaded) {
            try {
              await triggerBatchDownload(job.batchId, supabaseJobId);
            } catch {
              // non-fatal — results may still appear in Supabase
            }
            return { ...job, status: newStatus, counts, downloaded: true };
          }
          return { ...job, status: newStatus, counts };
        } catch {
          allDone = false;
          return job;
        }
      }));

      setPollingJobs(updated);

      if (!allDone) {
        pollTimerRef.current = setTimeout(() => tick(updated), POLL_INTERVAL_MS);
      } else {
        setSubmitStatus('');
        setSuccessMessage('All batches complete. Check Collections for your results.');
        setTimeout(() => navigate('/collections'), 2500);
      }
    }

    tick(jobs);
  }

  // ── Submit ───────────────────────────────────────────────────
  const hasSource = sourceTab === 'images' ? selectedImages.length > 0 : driveLink.trim().length > 0;
  const hasCsv = csvRows.length > 0 && !csvError;
  const hasStyles = selectedStyles.size > 0;
  const estimatedCredits = csvRows.length * selectedStyles.size;
  const submitDisabled = !hasSource || !hasCsv || !hasStyles || !!csvError || isSubmitting;

  async function handleSubmit() {
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    setPollingJobs([]);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    try {
      // Step 1: auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please log in first.'); return; }

      // Step 2: credits gate
      setSubmitStatus('Checking credits...');
      const balance = await fetchCredits(user.id);
      const required = csvRows.length * selectedStyles.size;
      if (balance < required) {
        alert(`Insufficient credits. Need ${required}, have ${balance}.`);
        return;
      }

      // Step 3: send images to FastAPI
      setSubmitStatus('Uploading images to batch service...');
      const imagesToSend = sourceTab === 'images' ? selectedImages : [];
      const batchResult = await submitBatchToFastAPI(imagesToSend, {
        scene_brief: sceneBrief,
        category: category || 'pets_accessories',
        completion_window: '24h',
        input_fidelity: 'low',
        image_count: 1,
      });

      const batchIds = batchResult.batch_ids || [];
      if (!batchIds.length) throw new Error('No batch IDs returned from server.');

      // Step 4: create Supabase job record
      setSubmitStatus('Creating job record...');
      const items = csvRows.map(row => ({
        product_name: row.product_name,
        brand_name: row.brand_name || null,
        category: row.category || null,
        image_url: '',
        original_filename: row.filename,
      }));

      const supabaseJobId = await createBatchJob({
        userId: user.id,
        clientCode: clientCode || null,
        styles: [...selectedStyles],
        industry: industry || null,
        category: category || null,
        driveLink: sourceTab === 'drive' ? driveLink : null,
        items,
        batchIds,
        status: 'submitted',
      });

      // Step 5: deduct credits
      setSubmitStatus('Deducting credits...');
      await deductCredits(user.id, required);

      // Step 6: start polling
      setSubmitStatus('Processing — polling for results...');
      const jobs = (batchResult.batches || batchIds.map((id, i) => ({ batch_id: id, label: `Batch ${i + 1}/${batchIds.length}` }))).map(b => ({
        batchId: b.batch_id,
        label: b.label || b.batch_id,
        status: b.status || 'validating',
        counts: {},
        downloaded: false,
      }));
      setPollingJobs(jobs);
      startPolling(jobs, supabaseJobId);

    } catch (err) {
      setErrorMessage(err.message || 'Submission failed.');
      setSubmitStatus('');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isPolling = pollingJobs.length > 0 && !successMessage;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#aaaaaa] font-['DM_Sans']">
      <style>{`
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #c9a96e; }
        * { scrollbar-width: thin; scrollbar-color: #1e1e1e #0a0a0a; }
      `}</style>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0a0a0a] border-b border-white/10 flex items-center px-6 gap-6">
        <button
          onClick={() => navigate('/generator')}
          className="font-['Cormorant_Garamond'] text-lg font-semibold tracking-[0.2em] uppercase text-[#c9a96e]"
        >
          ContentPro
        </button>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-[11px] tracking-[0.2em] uppercase text-[#555]">Batch Upload</span>
      </nav>

      <div className="pt-14 max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">

        <div className="mb-2">
          <h1 className="font-['Cormorant_Garamond'] text-[32px] font-light text-[#f0ede8]">
            Batch Image Generation
          </h1>
          <p className="text-[13px] text-[#666] mt-1">
            Upload product images and a CSV of metadata to generate multiple listings at once.
          </p>
        </div>

        {/* ── SECTION 1: Image Source ── */}
        <section className="bg-zinc-900 border border-white/10 p-6">
          <SectionLabel>01 — Product Images Source</SectionLabel>

          <div className="flex border-b border-white/10 mb-6">
            {[['images', 'Upload Images'], ['drive', 'Google Drive Link']].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSourceTab(tab)}
                className={`px-5 py-2.5 text-xs tracking-[0.15em] uppercase font-medium transition-colors border-b-2 -mb-px ${
                  sourceTab === tab ? 'border-[#a78bfa] text-[#a78bfa]' : 'border-transparent text-[#555] hover:text-[#888]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {sourceTab === 'images' && (
            <div>
              <DropZone
                accept="image/png,image/jpeg,image/webp"
                multiple
                onFiles={handleImageFiles}
                isDragging={imagesDragging}
                setIsDragging={setImagesDragging}
                className="py-10 flex flex-col items-center justify-center gap-3"
              >
                {selectedImages.length > 0 ? (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="text-[#a78bfa] text-sm font-medium">{selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected</span>
                    <span className="text-[#555] text-xs">Click or drop to add more</span>
                  </>
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-[#888] text-sm">Drag & drop images here, or click to browse</span>
                    <span className="text-[#444] text-xs">PNG, JPG, WEBP</span>
                  </>
                )}
              </DropZone>

              {selectedImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {selectedImages.slice(0, 30).map(f => (
                    <span
                      key={f.name}
                      className="text-[10px] font-['DM_Sans'] text-[#666] bg-[#111] border border-white/5 px-2 py-0.5 flex items-center gap-1.5 max-w-[200px]"
                    >
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(f.name); }}
                        className="text-[#444] hover:text-[#a78bfa] flex-shrink-0"
                      >×</button>
                    </span>
                  ))}
                  {selectedImages.length > 30 && (
                    <span className="text-[10px] text-[#555] px-2 py-0.5">+{selectedImages.length - 30} more</span>
                  )}
                </div>
              )}
            </div>
          )}

          {sourceTab === 'drive' && (
            <div className="flex flex-col gap-3">
              <input
                type="url"
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveLink}
                onChange={e => setDriveLink(e.target.value)}
                className="bg-transparent border-b border-[#333] py-3 text-[#f0ede8] text-sm placeholder-[#555] focus:outline-none focus:border-[#a78bfa] transition-colors w-full"
              />
              <p className="text-[11px] text-[#555]">
                Coming soon — Google Drive ingestion is not yet wired to the batch service.
              </p>
            </div>
          )}
        </section>

        {/* ── SECTION 2: CSV Metadata ── */}
        <section className="bg-zinc-900 border border-white/10 p-6">
          <SectionLabel>02 — CSV Metadata</SectionLabel>

          <DropZone
            accept=".csv"
            onFiles={handleCsvFiles}
            isDragging={csvDragging}
            setIsDragging={setCsvDragging}
            className="py-8 flex flex-col items-center justify-center gap-3"
          >
            {csvRows.length > 0 && !csvError ? (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="text-[#a78bfa] text-sm font-medium">{csvFilename}</span>
                <span className="text-[#555] text-xs">Click or drop to replace</span>
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-[#888] text-sm">Drag & drop your CSV here, or click to browse</span>
                <span className="text-[#444] text-xs">Required columns: filename, product_name · Optional: brand_name, category</span>
              </>
            )}
          </DropZone>

          {csvError && (
            <p className="mt-3 text-[12px] text-red-400">{csvError}</p>
          )}

          {csvRows.length > 0 && !csvError && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-[12px] font-['DM_Sans'] border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Filename', 'Product Name', 'Brand', 'Category'].map(col => (
                      <th key={col} className="text-left text-[10px] tracking-[0.2em] uppercase text-[#555] pb-2 pr-4 font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="py-2 pr-4 text-[#888] truncate max-w-[160px]">{row.filename || '—'}</td>
                      <td className="py-2 pr-4 text-[#f0ede8] truncate max-w-[180px]">{row.product_name || '—'}</td>
                      <td className="py-2 pr-4 text-[#888] truncate max-w-[120px]">{row.brand_name || '—'}</td>
                      <td className="py-2 pr-4 text-[#888] truncate max-w-[140px]">{row.category || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-[#555]">
                {csvRows.length} {csvRows.length === 1 ? 'product' : 'products'} loaded
                {csvRows.length > 5 && ' · showing first 5 rows'}
              </p>
            </div>
          )}
        </section>

        {/* ── SECTION 3: Job Settings ── */}
        <section className="bg-zinc-900 border border-white/10 p-6">
          <SectionLabel>03 — Job Settings</SectionLabel>

          <div className="flex gap-6 mb-6">
            <div className="flex-1">
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#555] mb-1">Industry</p>
              <StyledSelect value={industry} onChange={e => { setIndustry(e.target.value); setCategory(''); }} placeholder="Select industry">
                <option value="" disabled>Select industry</option>
                {Object.keys(STYLE_AVAILABILITY).map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </StyledSelect>
            </div>
            <div className="flex-1">
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#555] mb-1">Category</p>
              <StyledSelect value={category} onChange={e => setCategory(e.target.value)} disabled={!industry} placeholder="Select category">
                <option value="" disabled>Select category</option>
                {industry && Object.keys(STYLE_AVAILABILITY[industry]).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </StyledSelect>
            </div>
          </div>
          <p className="text-[11px] text-[#555] mb-4 -mt-3">Job-level defaults — per-row "category" in CSV overrides if present.</p>

          <div className="mb-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#555] mb-2">Scene Brief</p>
            <textarea
              value={sceneBrief}
              onChange={e => setSceneBrief(e.target.value)}
              rows={2}
              className="w-full bg-transparent border border-[#222] text-[#f0ede8] text-sm px-3 py-2 resize-none focus:outline-none focus:border-[#444] font-['DM_Sans'] placeholder-[#555]"
            />
          </div>

          <div className="mb-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#555] mb-3">Styles</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map(({ key, label }) => {
                const active = selectedStyles.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleStyle(key)}
                    className={`px-4 py-2 text-xs font-medium tracking-wide transition-all border ${
                      active ? 'bg-violet-600 border-violet-500 text-white' : 'bg-zinc-800 border-white/10 text-[#888] hover:border-white/20 hover:text-[#bbb]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border border-white/10 px-5 py-3 mb-6 bg-[#111]">
            <span className="text-[11px] tracking-[0.2em] uppercase text-[#555]">Estimated Credits</span>
            <span className={`font-['Cormorant_Garamond'] text-2xl ${estimatedCredits > 0 ? 'text-[#c9a96e]' : 'text-[#333]'}`}>
              {estimatedCredits}
            </span>
          </div>

          {/* Polling status */}
          {pollingJobs.length > 0 && (
            <div className="mb-4 border border-white/10 bg-[#0d0d0d] px-4 py-3 flex flex-col gap-2">
              {pollingJobs.map(job => {
                const counts = job.counts || {};
                const total = counts.total || 0;
                const done = (counts.completed || 0) + (counts.failed || 0);
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={job.batchId} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#888]">{job.label}</span>
                      <span className="text-[11px] text-[#666]">{job.status}{total ? ` · ${done}/${total}` : ''}</span>
                    </div>
                    {total > 0 && (
                      <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
              {submitStatus && <p className="text-[11px] text-[#a78bfa] mt-1">{submitStatus}</p>}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 flex items-start gap-3 border border-[#a78bfa]/30 bg-[#a78bfa]/5 px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-[13px] text-[#a78bfa]">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 px-4 py-3 border border-red-500/30 bg-red-500/5">
              <p className="text-[12px] text-red-400">{errorMessage}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled || isPolling}
            className={`w-full h-14 tracking-widest text-sm uppercase font-['DM_Sans'] font-medium transition-all flex items-center justify-center gap-3 ${
              submitDisabled || isPolling
                ? 'bg-[#111] text-[#333] cursor-not-allowed border border-[#1e1e1e]'
                : 'bg-gradient-to-r from-[#6d4aff] to-[#a78bfa] hover:opacity-90 text-white shadow-[0_0_20px_rgba(109,74,255,0.3)] cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                {submitStatus || 'Submitting...'}
              </>
            ) : isPolling ? 'Processing...' : 'Submit Batch Job'}
          </button>
        </section>

      </div>
    </div>
  );
}
