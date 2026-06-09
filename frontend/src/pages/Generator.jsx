import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateVariant, generateWithQueue } from '@ai-services/imageService.js';
import Results from './Results.jsx';
import { fetchCredits, deductCredits } from '../lib/creditsService.js';
import { saveSession } from '../lib/collectionsService.js';
import Collections from './Collections.jsx';
import AuthModal from './AuthModal.jsx';
import { signOut } from '../lib/authService.js';
import { supabase } from '../lib/supabase.js';
import { useClientMode } from '../lib/clientConfig.js';

async function blobUrlToBase64(blobUrl) {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const STYLE_OPTIONS = [
  {
    key: 'white_bg',
    label: 'White Background',
    description: 'Clean isolated product on pure white',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="12" cy="12" r="2.5"/>
      </svg>
    ),
  },
  {
    key: 'white_bg_dims',
    label: 'White BG + Dimensions',
    description: 'White background with size scale overlay',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h18M3 12h4m10 0h4M3 17h18"/>
        <path d="M7 5v4M17 5v4"/>
      </svg>
    ),
  },
  {
    key: 'with_model',
    label: 'With Model',
    description: 'Product in use with a lifestyle model',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4"/>
        <path d="M5 21v-2a7 7 0 0 1 14 0v2"/>
      </svg>
    ),
  },
  {
    key: 'professional',
    label: 'Professional',
    description: 'Dramatic studio lighting, premium feel',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
        <path d="M5 3l.6 1.8L7.4 5.4l-1.8.6L5 7.8l-.6-1.8L2.6 5.4l1.8-.6z"/>
        <path d="M19 16l.4 1.2 1.2.4-1.2.4L19 19.2l-.4-1.2-1.2-.4 1.2-.4z"/>
      </svg>
    ),
  },
  {
    key: 'flat_lay',
    label: 'Flat Lay',
    description: 'Top-down arranged with complementary props',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
];

const STYLE_AVAILABILITY = {
  "Home Furnishing": {
    "Living Decor": ["white_bg", "white_bg_dims", "with_model", "professional", "flat_lay"],
    "Bed & Bath": ["white_bg", "white_bg_dims", "with_model", "professional", "flat_lay"],
    "Table Linens": ["white_bg", "white_bg_dims", "professional", "flat_lay"],
  },
  "Cosmetics": {
    "Fragrances & Essential Oils": ["white_bg", "white_bg_dims", "professional", "flat_lay"],
    "Haircare & Treatment": ["white_bg", "white_bg_dims", "with_model", "flat_lay"],
    "Skincare & Wellness": ["white_bg", "white_bg_dims", "with_model", "professional", "flat_lay"],
  },
  "Apparels": {
    "Kids Wear": ["white_bg", "with_model", "flat_lay"],
    "Men": ["white_bg", "white_bg_dims", "with_model", "flat_lay"],
    "Women": ["white_bg", "white_bg_dims", "with_model", "flat_lay"],
    "Sustainable & Handlooms": ["white_bg", "with_model", "professional", "flat_lay"],
  },
  "Footwear": {
    "Active & Casual": ["white_bg", "white_bg_dims", "with_model", "professional"],
    "Heels, Flats & Loafers": ["white_bg", "white_bg_dims", "with_model", "professional"],
    "Ethnic — Juttis & Kolhapuri": ["white_bg", "white_bg_dims", "with_model", "flat_lay"],
  },
  "Bags & Accessories": {
    "Wallets, Belts & Scarves": ["white_bg", "white_bg_dims", "with_model", "flat_lay"],
  },
  "Food & Beverages": {
    "Fresh Vegetables & Fruits": ["white_bg", "professional", "flat_lay"],
    "Frozen Fruits": ["white_bg", "white_bg_dims", "professional", "flat_lay"],
  },
  "Handicraft & Export": {
    "Artisanal Decor & Wall Art": ["white_bg", "professional", "flat_lay"],
    "Dining & Kitchen": ["white_bg", "white_bg_dims", "professional", "flat_lay"],
  },
  "Jewellery": {
    "Ethnic & Traditional": ["white_bg", "white_bg_dims", "with_model", "professional"],
    "Western Pieces": ["white_bg", "white_bg_dims", "with_model", "professional"],
  },
};

function SectionLabel({ children }) {
  return (
    <span className="text-[11px] tracking-[0.25em] uppercase font-['DM_Sans'] text-[#888888] mb-2 mt-8 block font-medium">
      {children}
    </span>
  );
}

function StyledInput({ style, onFocus: onFocusProp, onBlur: onBlurProp, ...props }) {
  return (
    <input
      {...props}
      className="bg-transparent border-0 border-b border-[#333333] rounded-none px-0 py-3 text-[#f0ede8] font-['DM_Sans'] text-base placeholder-[#666666] focus:outline-none focus:border-[#c9a96e] transition-colors w-full"
    />
  );
}

function StyledSelect({ value, onChange, disabled, children, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Parse children to get options
  const options = [];
  let placeholderText = placeholder || "Select option";

  const childrenArray = Array.isArray(children) ? children.flat() : [children];
  childrenArray.forEach(child => {
    if (child && child.type === 'option') {
      if (child.props.disabled) {
        placeholderText = child.props.children;
      } else {
        options.push({
          value: child.props.value,
          label: child.props.children
        });
      }
    }
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleToggle() {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // 240px = max-h-60 dropdown height
      setOpenUpward(spaceBelow < 240);
    }
    setIsOpen(o => !o);
  }

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full bg-transparent border-0 border-b ${disabled ? 'border-[#1e1e1e] text-[#444] cursor-not-allowed' : isOpen ? 'border-[#c9a96e] text-[#f0ede8]' : 'border-[#333333] text-[#f0ede8] hover:border-[#555]'} rounded-none px-0 py-3 font-['DM_Sans'] text-base transition-colors flex items-center justify-between text-left focus:outline-none`}
      >
        <span className={selectedOption ? "text-[#f0ede8]" : "text-[#666666]"}>
          {selectedOption ? selectedOption.label : placeholderText}
        </span>
        <span className={`transition-transform duration-200 text-[#c9a96e] ${isOpen ? 'rotate-180' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>

      {isOpen && !disabled && (
        <div className={`absolute left-0 right-0 max-h-60 overflow-y-auto bg-[#111] border border-[#222] rounded-none z-50 shadow-[0_10px_25px_rgba(0,0,0,0.5)] ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 font-['DM_Sans'] text-sm transition-colors border-b border-[#1a1a1a] last:border-0 ${value === opt.value ? 'bg-[#c9a96e]/10 text-[#c9a96e] font-medium' : 'text-[#aaaaaa] hover:bg-[#1a1a1a] hover:text-[#f0ede8]'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ onCollections, onSignOut, userInitial }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const items = [
    { label: 'Collections', icon: '▦', onClick: () => { setOpen(false); onCollections(); } },
    { label: 'Profile', icon: '○', onClick: null },
    { label: 'Settings', icon: '◎', onClick: null },
    { label: 'Help', icon: '?', onClick: null },
    { label: 'Logout', icon: '→', onClick: () => { setOpen(false); onSignOut(); } },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center hover:border-[#c9a96e] transition-colors"
      >
        <span className="font-['DM_Sans'] text-xs text-[#aaaaaa] font-medium">{userInitial}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-[#111111] border border-[#1e1e1e] rounded-sm z-50 shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          {items.map(({ label, icon, onClick }) => (
            <button
              key={label}
              onClick={onClick ?? undefined}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left font-['DM_Sans'] text-xs text-[#aaaaaa] hover:text-[#f0ede8] hover:bg-[#1a1a1a] transition-colors border-b border-[#1a1a1a] last:border-0"
            >
              <span className="text-[#555555] text-sm w-4">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Generator() {
  const navigate = useNavigate();

  const { isClientMode, config: clientConfig, setCode, clearCode } = useClientMode();

  const [clientStyleKey, setClientStyleKey] = useState(
    () => clientConfig?.styleOptions?.[0]?.promptKey ?? clientConfig?.lockedPromptKey ?? null
  );

  useEffect(() => {
    setClientStyleKey(clientConfig?.styleOptions?.[0]?.promptKey ?? clientConfig?.lockedPromptKey ?? null);
  }, [clientConfig]);

  // Multi-image upload state
  const [referenceImages, setReferenceImages] = useState([]); // max 5, array of { url, file, id }
  const primaryImage = referenceImages[0] ?? null;
  const dimsSectionRef = useRef(null);

  const [user, _setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const setUser = (val) => {
    _setUser((prev) => {
      if (!prev && !val) return null;
      if (prev && val && prev.id === val.id && prev.email === val.email) {
        return prev;
      }
      return val;
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // 429 rate-limit failures cause false SIGNED_OUT — verify before clearing
        setTimeout(() => {
          supabase.auth.getSession().then(({ data }) => {
            if (!data.session) setUser(null);
          });
        }, 2000);
        return;
      }
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
        return;
      }
      if (session?.user) setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [credits, setCredits] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchCredits(user.id).then(b => setCredits(b));
  }, [user]);

  // Product/brand state
  const [industry, setIndustry] = useState('');
  const [category, setCategory] = useState('');
  const [productName, setProductName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('');
  const [size, setSize] = useState('');
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [serialNumber, setSerialNumber] = useState('');
  const [serialNumberError, setSerialNumberError] = useState('');

  // Inline access code entry
  const [showAccessInput, setShowAccessInput] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessCodeStatus, setAccessCodeStatus] = useState(null); // 'success' | 'error' | null

  // Serial number format: letters then space then digits then dash then digits e.g. "ABC 12-123"
  function validateSerialNumber(val) {
    return /^[A-Za-z]+\s+\d+-\d+$/.test(val.trim());
  }

  // Style selection state
  const [styleSelections, setStyleSelections] = useState({});
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });
  const [dimensionUnit, setDimensionUnit] = useState('cm');

  const hasDimsSelected = styleSelections['white_bg_dims'] > 0;
  useEffect(() => {
    if (hasDimsSelected && dimsSectionRef.current) {
      dimsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [hasDimsSelected]);

  const MAX_IMAGES = 4;
  const totalSelected = Object.values(styleSelections).reduce((sum, n) => sum + n, 0);

  // Generation state
  const [showCollections, setShowCollections] = useState(false);
  const [mode, setMode] = useState('create');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState([]);
  const [finalizedVariants, setFinalizedVariants] = useState({});
  const [finalizingVariants, setFinalizingVariants] = useState(new Set());
  const [rerollingVariants, setRerollingVariants] = useState({});
  const [finalizeErrors, setFinalizeErrors] = useState({});

  const handleImageUpload = (files) => {
    const incoming = Array.from(files).slice(0, 5 - referenceImages.length);
    const mapped = incoming.map(file => ({
      id: `${Date.now()}_${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setReferenceImages(prev => [...prev, ...mapped].slice(0, 5));
  };

  const removeImage = (id) => {
    setReferenceImages(prev => prev.filter(img => img.id !== id));
  };

  // Auto-deselect styles that are no longer available when category changes
  useEffect(() => {
    const available = (industry && category)
      ? (STYLE_AVAILABILITY[industry]?.[category] ?? [])
      : [];
    setStyleSelections(prev => {
      const next = {};
      for (const key of Object.keys(prev)) {
        if (available.includes(key)) next[key] = prev[key];
      }
      return next;
    });
  }, [industry, category]);


  async function handleGenerate() {
    if (!primaryImage?.url) return;

    const { data: { user: liveUser } } = await supabase.auth.getUser();
    if (!liveUser) {
      setErrorMessage('Please sign in to generate images.');
      return;
    }

    // In client mode: generate one image using the locked prompt key.
    // In normal mode: fan out over user-selected style selections.
    const jobs = isClientMode
      ? [async () => {
          const result = await generateVariant(clientStyleKey, primaryImage?.url, '', {
            productName, brandName,
            referenceImages: referenceImages.map(img => img.url),
            imageUrl: primaryImage?.url,
          }, 0);
          return { ...result, id: `${clientStyleKey}_0` };
        }]
      : Object.entries(styleSelections).flatMap(([key, count]) =>
          Array.from({ length: count }, (_, i) => async () => {
            const result = await generateVariant(key, primaryImage?.url, category, {
              productName, brandName, description, industry, category,
              referenceImages: referenceImages.map(img => img.url),
              imageUrl: primaryImage?.url,
              dimensions: styleSelections['white_bg_dims'] > 0 ? { ...dimensions, unit: dimensionUnit } : null,
            }, i);
            return { ...result, id: `${key}_${i}` };
          })
        );

    setIsGenerating(true);
    setGenerationStatus(`Generating image 1 of ${jobs.length}...`);
    setErrorMessage('');
    setResults([]);
    setFinalizedVariants({});
    setFinalizingVariants(new Set());
    setRerollingVariants({});
    setFinalizeErrors({});

    try {
      const settled = await generateWithQueue(jobs, 15000, (completed, total) => {
        if (completed < total) {
          setGenerationStatus(`Generating image ${completed + 1} of ${total}...`);
        }
      });
      const earned = settled.filter(r => r?.outputUrl).length;
      setResults(settled);
      deductCredits(liveUser.id, earned).then(newBal => {
        if (newBal !== false) setCredits(newBal);
      });

      // Save session to Supabase
      const sourceBase64 = await blobUrlToBase64(primaryImage.url);
      saveSession({
        userId: liveUser.id,
        productName,
        brandName,
        sourceImageBase64: sourceBase64,
        results: settled,
        sequenceNumber: isClientMode ? sequenceNumber : null,
        serialNumber: isClientMode && serialNumber.trim() ? serialNumber.trim() : null,
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  }

  async function handleFinalize(id) {
    const original = results.find(r => r.id === id);
    const styleKey = original?.variant;
    if (!styleKey) return;
    const scenePrompt = original?.metadata?.scene_prompt;
    setFinalizeErrors(cur => { const n = { ...cur }; delete n[id]; return n; });
    setFinalizingVariants(cur => new Set(cur).add(id));
    try {
      const result = await generateVariant(styleKey, primaryImage?.url, category, { finalPass: true, industry, category, brandName, productName, scenePrompt, referenceImages: referenceImages.map(img => img.url), imageUrl: primaryImage?.url });
      if (!result.success) throw new Error(result.error || 'Failed to finalize variant');
      setFinalizedVariants(cur => ({ ...cur, [id]: { outputUrl: result.outputUrl, metadata: result.metadata } }));
    } catch (error) {
      setFinalizeErrors(cur => ({ ...cur, [id]: error.message }));
    } finally {
      setFinalizingVariants(cur => { const n = new Set(cur); n.delete(id); return n; });
    }
  }

  async function handleReroll(id) {
    const styleKey = results.find(r => r.id === id)?.variant;
    if (!styleKey) return;
    setFinalizeErrors(cur => { const n = { ...cur }; delete n[id]; return n; });
    setFinalizedVariants(cur => { const n = { ...cur }; delete n[id]; return n; });
    setRerollingVariants(cur => ({ ...cur, [id]: true }));
    try {
      const result = await generateVariant(styleKey, primaryImage?.url, category, { finalPass: false, industry, category, brandName, productName, referenceImages: referenceImages.map(img => img.url), imageUrl: primaryImage?.url });
      if (!result.success) throw new Error(result.error || 'Failed to re-roll variant');
      setResults(cur => cur.map(item => item.id === id ? { ...result, id } : item));
    } catch (error) {
      setFinalizeErrors(cur => ({ ...cur, [id]: error.message }));
    } finally {
      setRerollingVariants(cur => { const n = { ...cur }; delete n[id]; return n; });
    }
  }

  function handleDownload(id) {
    const finalized = finalizedVariants[id];
    const url = finalized?.outputUrl || results.find(r => r.id === id)?.outputUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}.png`;
    a.click();
  }

  if (!authReady) return <div className="fixed inset-0 bg-[#080808]" />;
  if (!user) return <AuthModal onSuccess={() => {}} />;

  if (showCollections) return <Collections onBack={() => setShowCollections(false)} userId={user?.id} />;

  if (mode === 'results' && results.length > 0) {
    return (
      <Results
        results={results}
        finalizedVariants={finalizedVariants}
        finalizingVariants={finalizingVariants}
        rerollingVariants={rerollingVariants}
        finalizeErrors={finalizeErrors}
        onFinalize={handleFinalize}
        onDownload={handleDownload}
        onReroll={handleReroll}
        onBack={() => setMode('create')}
      />
    );
  }

  const availableStyles = (industry && category)
    ? (STYLE_AVAILABILITY[industry]?.[category] ?? [])
    : [];

  const dimsMissing = !isClientMode && (styleSelections['white_bg_dims'] > 0) &&
    (!dimensions.length || !dimensions.width || !dimensions.height ||
     Number(dimensions.length) <= 0 || Number(dimensions.width) <= 0 || Number(dimensions.height) <= 0);
  const generateDisabled = (!isClientMode && totalSelected === 0) || referenceImages.length === 0 || isGenerating || dimsMissing;

  // Parse generation status to get current image index and total images
  const match = generationStatus.match(/Generating image (\d+) of (\d+)/);
  const currentImageIndex = match ? parseInt(match[1], 10) : 1;
  const totalImages = match ? parseInt(match[2], 10) : Object.values(styleSelections).reduce((sum, n) => sum + n, 0) || 1;

  const getStyleAtIndex = (index) => {
    let currentIndex = 0;
    for (const [key, count] of Object.entries(styleSelections)) {
      if (index > currentIndex && index <= currentIndex + count) {
        const styleObj = STYLE_OPTIONS.find(s => s.key === key);
        return styleObj ? styleObj.label : key;
      }
      currentIndex += count;
    }
    return null;
  };
  const currentStyle = getStyleAtIndex(currentImageIndex);

  return (
    <div className="bg-[#080808] text-[#aaaaaa] flex h-screen overflow-hidden font-['DM_Sans'] pt-14">
      <style>{`
        @keyframes hue-sweep {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gold-pulse {
          background: linear-gradient(
            270deg,
            #c9a96e, #7a6240, #f0c98a, #a07840, #c9a96e
          );
          background-size: 300% 300%;
          animation: hue-sweep 3s ease infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin-slow { animation: spin-slow 1.2s linear infinite; display: inline-block; }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        /* Sleek luxury custom scrollbars */
        ::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        ::-webkit-scrollbar-track {
          background: #080808;
        }
        ::-webkit-scrollbar-thumb {
          background: #1e1e1e;
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #c9a96e;
        }
        
        /* Firefox scrollbar compatibility */
        * {
          scrollbar-width: thin;
          scrollbar-color: #1e1e1e #080808;
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#080808] border-b border-[#1e1e1e] flex items-center px-6">
        
        {/* Left: Wordmark */}
        <span className="font-['Cormorant_Garamond'] text-lg font-semibold tracking-[0.2em] uppercase text-[#c9a96e]">
          ContentPro
        </span>

        {/* Center: Photo / Video toggle */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-[#111111] border border-[#1e1e1e] rounded-full p-0.5">
          <button className="px-5 py-1.5 rounded-full text-xs tracking-[0.2em] uppercase font-['DM_Sans'] transition-all bg-[#c9a96e] text-[#080808] font-medium">
            Photo
          </button>
          <button className="px-5 py-1.5 rounded-full text-xs tracking-[0.2em] uppercase font-['DM_Sans'] text-[#555555] hover:text-[#aaaaaa] transition-all">
            Video
          </button>
        </div>

        {/* Right: Credits + Profile */}
        <div className="ml-auto flex items-center gap-4">
          {user && (
            <button
              type="button"
              onClick={() => navigate('/batch')}
              className="text-[11px] tracking-[0.15em] uppercase font-['DM_Sans'] text-[#666] hover:text-[#a78bfa] transition-colors border border-transparent hover:border-[#a78bfa]/30 px-3 py-1.5"
            >
              Batch Upload
            </button>
          )}
          {/* Credit balance */}
          <div className="flex items-center gap-1.5 border border-[#1e1e1e] rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9a96e] inline-block" />
            <span className="font-['DM_Sans'] text-xs text-[#aaaaaa]">{credits === null ? '...' : `${credits} credits`}</span>
          </div>

          {/* Profile menu */}
          <ProfileMenu
            onCollections={() => setShowCollections(true)}
            onSignOut={signOut}
            userInitial={user?.email?.[0]?.toUpperCase() ?? '?'}
          />
        </div>
      </nav>

      {/* LEFT PANEL */}
      <div className="w-[420px] min-w-[420px] border-r border-[#1e1e1e] flex flex-col h-full bg-[#080808] z-10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">

        {/* SCROLLABLE LEFT CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          
          <SectionLabel>PRODUCT IMAGE</SectionLabel>
          {/* Upload Grid */}
          <div className="mt-2">
            <div className="grid grid-cols-4 gap-2">

              {/* Main slot — col-span-2 row-span-2, always shown */}
              <div
                className="col-span-2 row-span-2 relative aspect-square bg-[#111111] border border-[#1e1e1e] hover:border-[#c9a96e] transition-colors cursor-pointer flex items-center justify-center group"
                onClick={() => !primaryImage && document.getElementById('multi-upload').click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files); }}
              >
                {primaryImage ? (
                  <>
                    <img src={primaryImage.url} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] tracking-widest uppercase text-white font-['DM_Sans']">Primary</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeImage(primaryImage.id); }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-900 transition-colors"
                    >✕</button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-[11px] font-['DM_Sans'] text-[#555] leading-tight">Drop primary<br/>photo here</span>
                  </div>
                )}
              </div>

              {/* 4 smaller slots */}
              {[1, 2, 3, 4].map(i => {
                const img = referenceImages[i];
                return (
                  <div
                    key={i}
                    className="relative aspect-square bg-[#111111] border border-[#1e1e1e] hover:border-[#c9a96e] transition-colors cursor-pointer flex items-center justify-center group"
                    onClick={() => !img && document.getElementById('multi-upload').click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files); }}
                  >
                    {img ? (
                      <>
                        <img src={img.url} className="w-full h-full object-contain" />
                        <button
                          onClick={e => { e.stopPropagation(); removeImage(img.id); }}
                          className="absolute top-1 right-1 w-4 h-4 bg-black/70 text-white text-[9px] flex items-center justify-center hover:bg-red-900 transition-colors"
                        >✕</button>
                      </>
                    ) : (
                      <span className="text-[#333] text-lg">+</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hidden file input — multiple */}
            <input
              id="multi-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={e => handleImageUpload(e.target.files)}
            />

            {/* Count indicator */}
            {referenceImages.length > 0 && (
              <p className="mt-1.5 text-[10px] font-['DM_Sans'] text-[#555] tracking-wide">
                {referenceImages.length} / 5 reference photos · First image is primary for generation
              </p>
            )}
          </div>

          <SectionLabel>BRAND</SectionLabel>
          <div className="mt-2">
            <StyledInput
              type="text"
              placeholder={isClientMode ? (clientConfig.brandLabel ?? 'Brand Name') : 'e.g. Wakefit'}
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
            />
          </div>

          <SectionLabel>PRODUCT</SectionLabel>
          <div className="mt-2 flex flex-col gap-5">
            <StyledInput
              type="text"
              placeholder={isClientMode ? (clientConfig.productLabel ?? 'Product Name') : 'Product Name'}
              value={productName}
              onChange={e => setProductName(e.target.value)}
            />
            {isClientMode ? (
              <>
                {clientConfig.styleOptions?.length > 1 && (
                  <>
                    <SectionLabel>PRODUCT TYPE</SectionLabel>
                    <div className="flex gap-2 mt-2">
                      {clientConfig.styleOptions.map(opt => (
                        <button
                          key={opt.promptKey}
                          onClick={() => setClientStyleKey(opt.promptKey)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            clientStyleKey === opt.promptKey
                              ? 'bg-white text-black border-white'
                              : 'bg-transparent text-white border-white/20 hover:border-white/50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {clientConfig.showSequenceNumber && (
                  <>
                    <SectionLabel>{clientConfig.sequenceLabel ?? 'Image Number'}</SectionLabel>
                    <StyledInput
                      type="number"
                      min={1}
                      placeholder="1"
                      value={sequenceNumber}
                      onChange={e => setSequenceNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </>
                )}
                <SectionLabel>SERIAL NUMBER</SectionLabel>
                <div>
                  <StyledInput
                    type="text"
                    placeholder="e.g. ABC 12-123"
                    value={serialNumber}
                    onChange={e => { setSerialNumber(e.target.value); setSerialNumberError(''); }}
                    onBlur={() => {
                      if (serialNumber.trim() && !validateSerialNumber(serialNumber)) {
                        setSerialNumberError('Format: letters · space · number-number (e.g. ABC 12-123)');
                      }
                    }}
                  />
                  {serialNumberError && (
                    <p className="text-[11px] text-red-400 font-['DM_Sans'] mt-1">{serialNumberError}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex gap-5">
                <div className="flex-1">
                  <StyledSelect
                    value={industry}
                    onChange={e => { setIndustry(e.target.value); setCategory(''); }}
                  >
                    <option value="" disabled>Industry</option>
                    {Object.keys(STYLE_AVAILABILITY).map(ind => (
                      <option key={ind} value={ind} className="bg-[#111] text-[#f0ede8]">{ind}</option>
                    ))}
                  </StyledSelect>
                </div>
                <div className="flex-1">
                  <StyledSelect
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    disabled={!industry}
                  >
                    <option value="" disabled>Category</option>
                    {industry && Object.keys(STYLE_AVAILABILITY[industry]).map(cat => (
                      <option key={cat} value={cat} className="bg-[#111] text-[#f0ede8]">{cat}</option>
                    ))}
                  </StyledSelect>
                </div>
              </div>
            )}
          </div>

          {!isClientMode && styleSelections['white_bg_dims'] > 0 && (
            <div 
              ref={dimsSectionRef}
              className={`mt-6 p-4 border transition-all duration-300 ${dimsMissing ? 'border-[#c9a96e] bg-[#16130d] shadow-[0_0_15px_rgba(201,169,110,0.15)] animate-[pulse_2s_infinite]' : 'border-[#1e1e1e] bg-[#0c0c0c]'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] tracking-[0.25em] uppercase font-['DM_Sans'] font-medium ${dimsMissing ? 'text-[#c9a96e]' : 'text-[#888888]'}`}>
                  WHITE BG + DIMENSIONS
                </span>
                {dimsMissing && (
                  <span className="text-[10px] tracking-wider uppercase bg-[#c9a96e] text-[#080808] px-1.5 py-0.5 font-bold animate-pulse">
                    Required
                  </span>
                )}
              </div>
              <div className="flex gap-4 items-end">
                {['length', 'width', 'height'].map(dim => (
                  <div key={dim} className="flex-1">
                    <div className="text-[11px] text-[#888888] mb-1 capitalize tracking-wider">{dim}</div>
                    <StyledInput
                      type="number"
                      min={0}
                      placeholder="0"
                      value={dimensions[dim]}
                      onChange={e => setDimensions(prev => ({ ...prev, [dim]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pb-2 ml-2">
                  {['cm', 'in'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setDimensionUnit(u)}
                      className={`text-sm font-['DM_Sans'] transition-colors px-2 pb-1 ${dimensionUnit === u ? 'text-[#c9a96e] border-b border-[#c9a96e]' : 'text-[#666666] hover:text-[#aaaaaa] border-b border-transparent'}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM LEFT: Generating state OR Generate button */}
        <div className="px-8 pb-8 mt-auto">
          {errorMessage && (
            <p className="text-[13px] text-red-400 mb-3">{errorMessage}</p>
          )}
          {isGenerating ? (
            <div className="mx-0 mt-4 rounded-none overflow-hidden border border-[#1e1e1e]">
              {/* Animated gold gradient bar — top edge */}
              <div className="gold-pulse h-[2px] w-full" />

              <div className="bg-[#0e0e0e] px-5 py-4 flex items-center gap-3">
                {/* Spinning ring */}
                <span className="spin-slow text-[#c9a96e] text-base leading-none">◌</span>

                <div className="flex flex-col gap-0.5">
                  <span className="font-['DM_Sans'] text-[11px] tracking-[0.25em] uppercase text-[#c9a96e]">
                    Generating
                  </span>
                  <span className="font-['Cormorant_Garamond'] text-base text-[#f0ede8] font-light">
                    Image {currentImageIndex} of {totalImages}
                    {currentStyle && (
                      <span className="text-[#555555] text-sm ml-2">— {currentStyle}</span>
                    )}
                  </span>
                </div>

                {/* Animated dots — far right */}
                <div className="ml-auto flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full bg-[#c9a96e]"
                      style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>

              {/* Progress track */}
              <div className="h-[1px] bg-[#1e1e1e] w-full">
                <div
                  className="gold-pulse h-full transition-all duration-700"
                  style={{ width: `${(currentImageIndex / totalImages) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMode('results')}
                  className="w-full h-12 rounded-none tracking-widest text-xs uppercase font-['DM_Sans'] font-medium transition-all bg-transparent border border-[#c9a96e] text-[#c9a96e] hover:bg-[#c9a96e]/10 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>View Results</span>
                  <span className="text-sm">→</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateDisabled}
                className={`w-full h-14 rounded-none tracking-widest text-sm uppercase font-['DM_Sans'] font-medium transition-all ${
                  generateDisabled 
                    ? 'bg-[#111111] text-[#333333] cursor-not-allowed border border-[#222]' 
                    : results.length > 0
                      ? 'gold-pulse text-[#080808] shadow-[0_0_20px_rgba(201,169,110,0.4)] cursor-pointer hover:opacity-90'
                      : 'bg-gradient-to-r from-[#c9a96e] to-[#b8924f] hover:from-[#b8924f] hover:to-[#9a7b45] text-[#080808] shadow-[0_0_15px_rgba(201,169,110,0.3)] cursor-pointer'
                }`}
              >
                {isClientMode
                  ? (results.length > 0 ? 'Generate Again' : 'Generate')
                  : (results.length > 0 ? 'Generate Again' : `Generate · ${totalSelected} ${totalSelected === 1 ? 'credit' : 'credits'}`)
                }
              </button>
              {isClientMode ? (
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={() => setShowCollections(true)}
                    className="text-[#555555] text-[12px] font-['DM_Sans'] hover:text-[#888888] transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Collections
                  </button>
                  <button
                    type="button"
                    onClick={clearCode}
                    className="text-[#3a3a3a] text-[11px] font-['DM_Sans'] hover:text-[#555555] transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Exit client mode
                  </button>
                </div>
              ) : showAccessInput ? (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={accessCodeInput}
                      onChange={e => { setAccessCodeInput(e.target.value); setAccessCodeStatus(null); }}
                      onKeyDown={e => e.key === 'Escape' && (setShowAccessInput(false), setAccessCodeInput(''), setAccessCodeStatus(null))}
                      placeholder="Access code"
                      className="flex-1 bg-transparent border-b border-[#333333] px-0 py-1.5 text-[#f0ede8] font-['DM_Sans'] text-sm placeholder-[#555555] focus:outline-none focus:border-[#c9a96e] transition-colors tracking-widest uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const ok = setCode(accessCodeInput.trim().toUpperCase());
                        if (ok) {
                          setAccessCodeStatus('success');
                          setTimeout(() => { setShowAccessInput(false); setAccessCodeInput(''); setAccessCodeStatus(null); }, 1200);
                        } else {
                          setAccessCodeStatus('error');
                        }
                      }}
                      className="text-[12px] font-['DM_Sans'] tracking-widest uppercase text-[#c9a96e] hover:text-[#f0ede8] transition-colors bg-transparent border-none cursor-pointer flex-shrink-0 pb-1"
                    >
                      Apply
                    </button>
                  </div>
                  {accessCodeStatus === 'error' && (
                    <p className="text-[11px] text-red-400 font-['DM_Sans']">Invalid code</p>
                  )}
                  {accessCodeStatus === 'success' && (
                    <p className="text-[11px] text-[#c9a96e] font-['DM_Sans']">Client mode activated</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-[#888888] text-sm text-center">
                    <span className={totalSelected > 0 ? 'text-[#c9a96e]' : ''}>{totalSelected}</span> / {MAX_IMAGES} images selected
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAccessInput(true)}
                    className="text-[#3a3a3a] text-[11px] font-['DM_Sans'] hover:text-[#555555] transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Enter access code
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 bg-[#080808] flex flex-col overflow-hidden relative">

        {/* Generation Styles view — hidden in client mode */}
        {isClientMode ? (
          <div className="flex items-center justify-center h-full text-[#333333] font-['DM_Sans'] text-sm tracking-widest uppercase select-none">
            Client Mode
          </div>
        ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-12 pt-16 pb-10 border-b border-[#111111] bg-gradient-to-b from-[#111111] to-[#080808]">
            <h2 className="font-['Cormorant_Garamond'] text-[36px] font-light text-[#c9a96e] m-0">Generation Styles</h2>
            <p className="font-['DM_Sans'] text-[15px] text-[#888888] mt-3 m-0">Choose how your product photos should look</p>
          </div>

          {/* Style list */}
          <div className="flex-1 overflow-y-auto pb-24">
            {availableStyles.length > 0 ? (
              <div className="flex flex-col">
                {STYLE_OPTIONS.filter(s => availableStyles.includes(s.key)).map((style) => {
                  const count = styleSelections[style.key] || 0;
                  const isActive = count > 0;
                  const atMax = totalSelected >= MAX_IMAGES;
                  return (
                    <div
                      key={style.key}
                      className={`flex items-center py-6 px-12 gap-6 border-b border-[#1e1e1e] w-full transition-all ${isActive ? 'bg-[#111111] border-l-4 border-l-[#c9a96e] shadow-inner' : 'bg-transparent border-l-4 border-l-transparent hover:bg-[#0c0c0c]'}`}
                    >
                      {/* Icon */}
                      <div className={`${isActive ? 'text-[#c9a96e]' : 'text-[#666666]'} w-8 h-8 flex-shrink-0`}>
                        {style.icon}
                      </div>
                      {/* Text */}
                      <div className="flex flex-col">
                        <div className={`font-['Cormorant_Garamond'] text-[22px] mb-1 ${isActive ? 'text-[#f0ede8]' : 'text-[#aaaaaa]'}`}>{style.label}</div>
                        <div className="font-['DM_Sans'] text-[13px] text-[#888888]">{style.description}</div>
                      </div>
                      {/* Controls */}
                      <div className="ml-auto flex items-center">
                        {isActive ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setStyleSelections(prev => {
                                const n = { ...prev };
                                if (n[style.key] <= 1) { delete n[style.key]; } else { n[style.key]--; }
                                return n;
                              })}
                              className="text-[#888] hover:text-[#c9a96e] text-2xl px-4 py-2 transition-colors bg-transparent border-none cursor-pointer"
                            >−</button>
                            <span className="font-['Cormorant_Garamond'] text-[28px] text-[#c9a96e] min-w-[32px] text-center">{count}</span>
                            <button
                              onClick={() => setStyleSelections(prev => ({ ...prev, [style.key]: prev[style.key] + 1 }))}
                              disabled={atMax}
                              className={`text-2xl px-4 py-2 transition-colors bg-transparent border-none ${atMax ? 'text-[#333] cursor-not-allowed' : 'text-[#888] hover:text-[#c9a96e] cursor-pointer'}`}
                            >+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setStyleSelections(prev => ({ ...prev, [style.key]: 1 }))}
                            disabled={atMax}
                            className={`text-[12px] tracking-[0.25em] font-bold uppercase transition-colors bg-transparent border px-6 py-2 rounded-full ${atMax ? 'text-[#333] border-[#222] cursor-not-allowed' : 'text-[#888] border-[#333] hover:text-[#c9a96e] hover:border-[#c9a96e] cursor-pointer'}`}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-[#666] font-['DM_Sans'] text-[15px]">
                Select an industry and category to see available styles
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#1e1e1e] px-12 py-5 flex items-center justify-between bg-[#080808] absolute bottom-0 w-full">
            <div className="font-['DM_Sans'] text-[14px] text-[#888888]">
              <span className={totalSelected > 0 ? 'text-[#c9a96e] font-medium' : ''}>{totalSelected}</span> / {MAX_IMAGES} images selected
            </div>
            
            <div className="flex gap-4">
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMode('results')}
                  className="px-6 h-12 rounded-none tracking-widest text-xs uppercase font-['DM_Sans'] font-medium transition-all bg-transparent border border-[#c9a96e] text-[#c9a96e] hover:bg-[#c9a96e]/10 cursor-pointer flex items-center gap-2"
                >
                  <span>Results Generated</span>
                  <span className="text-sm">→</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generateDisabled}
                className={`px-8 h-12 rounded-none tracking-widest text-sm uppercase font-['DM_Sans'] font-medium transition-all ${
                  generateDisabled 
                    ? 'bg-[#111111] text-[#333333] cursor-not-allowed border border-[#222]' 
                    : results.length > 0
                      ? 'gold-pulse text-[#080808] shadow-[0_0_20px_rgba(201,169,110,0.4)] cursor-pointer hover:opacity-90'
                      : 'bg-gradient-to-r from-[#c9a96e] to-[#b8924f] hover:from-[#b8924f] hover:to-[#9a7b45] text-[#080808] shadow-[0_0_15px_rgba(201,169,110,0.3)] cursor-pointer'
                }`}
              >
                {results.length > 0 ? 'Generate Again' : `Generate · ${totalSelected} ${totalSelected === 1 ? 'credit' : 'credits'}`}
              </button>
            </div>
          </div>
        </div>
        )} {/* end isClientMode conditional */}
      </div>
    </div>
  );
}
