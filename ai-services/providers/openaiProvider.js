import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const STYLE_TRANSFORMATION_DIRECTIVE = {
  with_model: [
    'A real human model is actively using or holding this product. The model\'s hands, arms, or full body are clearly visible and physically interacting with the product. Shot in a natural home interior setting matching the product\'s use case. Eye-level camera, 35mm lens perspective, natural window light.',
    'A real human model shown from the waist up, holding or using the product in a candid unposed moment. Warm indoor ambient light. The model\'s face is partially visible. Background is a soft-focus home environment relevant to the product.',
    'Close-up of a real human model\'s hands directly holding or using the product. Skin texture, fingers, and nails are clearly visible. Natural light from a side window. Background is blurred but recognizable as a home setting.',
    'A real human model sitting or standing in a lifestyle environment using the product. Full body or 3/4 body visible. Golden hour natural light through a window. The setting matches the product\'s everyday use context.',
  ],
  professional: [
    'The product is placed on a black velvet surface, dramatically tilted at 20 degrees, shot from a low 15-degree camera angle looking up slightly. Single hard spotlight from upper-left at 45 degrees casting a sharp defined shadow to the lower-right. Pure black background. The product is crisp and sharp with visible texture detail.',
    'The product is shot from a high 60-degree overhead angle, tilted 30 degrees clockwise, placed on a dark charcoal textured surface. Two lights: warm amber key light from left, cool blue fill from right creating visible color contrast on the product surface. Near-black background with subtle gradient.',
    'Extreme close-up macro shot of the product from a 45-degree side angle, filling 90% of the frame. Focus-stacked for total sharpness across the entire surface. Single rim light from behind creating a bright glowing outline. Deep black background. Every texture and detail of the product is hyper-visible.',
    'The product is photographed from a dramatic 3/4 aerial angle at 45 degrees horizontal and 40 degrees elevation, placed on deep navy blue velvet fabric with visible fabric texture. Single raking side light from the far left casting long shadows across the velvet. Product is positioned in the left third of the frame with negative space to the right.',
  ],
  flat_lay: [
    'directly overhead flat lay on warm white linen, soft diffused window light from top, product centered with subtle shadow beneath',
    'overhead on dark slate stone surface, hard directional light from upper-right, strong shadow extending left',
    'overhead on blush pink silk fabric with natural wrinkles, soft even studio light, product slightly rotated 20 degrees',
    'overhead on aged white marble with natural veining, dual softbox lighting, product dead center',
  ],
  white_bg: [
    'pure white seamless background, product perfectly centered floating with soft drop shadow directly beneath, even studio lighting',
    'pure white background, product at 25 degree clockwise rotation, longer asymmetric shadow to the lower-right',
    'pure white background, top-down view, product flat with minimal shadow directly underneath, perfectly sharp',
    'pure white background, product at 3/4 angle with slight perspective, shadow at lower-left',
  ],
};

const STYLE_PROMPTS = {
  white_bg: {
    default: "Place the product on a pure white seamless background. Soft diffused studio lighting from above-left, subtle shadow directly beneath the product. Product centered, shot from a slight 15-degree elevated angle. No props, no distractions. Professional Amazon main image standard.",
    "Home Furnishing": {
      "Living Decor": "Place the cushion, curtain, or rug on a pure white seamless surface. Fabric texture must be clearly visible — show weave, embroidery, or print detail. Soft even lighting, no harsh shadows. Shot from a 20-degree elevated front angle. Product fills 80% of frame.",
      "Bed & Bath": "Lay the linen, towel, or quilt flat on a white seamless surface, neatly folded or partially unfolded to show texture and pattern. Soft top lighting. Show fabric GSM weight visually through drape and thickness.",
      "Table Linens": "Lay the mat or runner flat on a white surface, perfectly pressed. Show the full product, texture and border detail clearly visible. Clean top-down or slight angle shot.",
    },
    "Cosmetics": {
      "Fragrances & Essential Oils": "Stand the bottle or dropper upright on a white seamless surface. Glass and liquid must render with realistic transparency and refraction. Crisp catchlights on the bottle. No props.",
      "Haircare & Treatment": "Stand the tube, bottle, or jar upright on white seamless. Label fully readable. Soft studio lighting, slight specular highlight on packaging to show material finish.",
      "Skincare & Wellness": "Arrange the product upright or at a natural resting angle on white seamless. Packaging finish — matte, glass, or metallic — must render accurately. Label legible.",
    },
    "Apparels": {
      "Kids Wear": "Display the garment flat-laid or on an invisible mannequin on white seamless. Show full garment, all details visible — prints, buttons, collar. Bright even lighting.",
      "Men": "Display on invisible mannequin or flat on white seamless. Crisp even lighting. Fabric texture and construction detail clearly visible. No creases unless natural to fabric.",
      "Women": "Display on invisible mannequin or elegant flat lay on white seamless. Fabric drape and texture clearly visible. Bright even lighting, true color rendering.",
      "Sustainable & Handlooms": "Display on white seamless showing the handwoven or natural fabric texture prominently. Earthy natural lighting feel while still clean white background. Show weave character.",
    },
    "Footwear": {
      "Active & Casual": "Place shoe in a 3/4 side-front angle on white seamless. Both sole edge and upper visible. Crisp studio lighting showing material texture — mesh, leather, or rubber.",
      "Heels, Flats & Loafers": "Place shoe at elegant 3/4 angle on white seamless. Show heel height clearly. Soft directional lighting creating gentle highlight along the shoe profile.",
      "Ethnic — Juttis & Kolhapuri": "Place ethnic footwear on white seamless at a 3/4 angle. Embroidery, mirror work, or leather craft detail must be crisp and clear. Show sole and upper.",
    },
    "Bags & Accessories": {
      "Wallets, Belts & Scarves": "Place the accessory on white seamless. For wallets — upright slightly open showing card slots. For belts — coiled or laid straight. For scarves — folded to show pattern. Material texture clearly visible.",
    },
    "Food & Beverages": {
      "Fresh Vegetables & Fruits": "Arrange the produce on a white seamless surface. Natural vibrant color, glistening fresh appearance with subtle moisture. Clean even lighting showing true color.",
      "Frozen Fruits": "Arrange frozen fruits on white seamless with frost effect visible on surface. Cool-toned crisp lighting. Freshness and quality clearly conveyed.",
    },
    "Handicraft & Export": {
      "Artisanal Decor & Wall Art": "Place the handcrafted object on white seamless. Artisan detail — carving, paint, weave — must be sharp and clear. Neutral directional light showing depth and texture.",
      "Dining & Kitchen": "Place the ceramic or wooden piece on white seamless. Surface texture, glaze, or grain clearly visible. Soft studio lighting, accurate color rendering.",
    },
    "Jewellery": {
      "Ethnic & Traditional": "Place jewellery on white seamless or white velvet surface. Metal finish — gold, oxidised silver — and stone colors must render accurately. Macro-level detail of craftsmanship visible.",
      "Western Pieces": "Place jewellery on white seamless. Clean reflective surfaces, accurate metal and gemstone rendering. Minimalist presentation, sharp focus on design details.",
    },
  },

  white_bg_dims: {
    default: "Place the product on a pure white seamless background with professional dimension indicators. Clean orthographic-style shot — perfectly front-facing or top-down. Product centered with generous margin on all sides for dimension line overlays. No props, no shadows except a faint base shadow. This image will have dimension lines added by post-processing.",
    "Home Furnishing": {
      "Living Decor": "Photograph the cushion, curtain, or rug flat on white, perfectly squared to camera. Full product visible with 15% margin on all sides for dimension overlay. Neutral flat lighting.",
      "Bed & Bath": "Lay the product flat, fully unfolded if possible, shot perfectly top-down on white. Even flat lighting, no shadows at edges. Dimension overlay will be added.",
      "Table Linens": "Lay the mat or runner perfectly flat top-down on white. Full product in frame with margin for dimension lines.",
    },
    "Cosmetics": {
      "Fragrances & Essential Oils": "Front-facing upright bottle on white, perfectly squared. Height and width clearly readable. No tilt.",
      "Haircare & Treatment": "Product upright, front-facing on white. Label forward. Clean margin around product for dimension lines.",
      "Skincare & Wellness": "Product upright front-facing on white with equal margin all sides.",
    },
    "Apparels": {
      "Men": "Garment flat on white, perfectly top-down. Fully spread showing max dimensions. Even flat lighting.",
      "Women": "Garment flat on white top-down, fully spread. True to size appearance.",
      "Ethnic — Juttis & Kolhapuri": "Top-down perfectly flat on white, full product visible with margin.",
    },
    "Footwear": {
      "Active & Casual": "Side-profile perfectly orthographic shot on white. Full shoe length visible, clean margin.",
      "Heels, Flats & Loafers": "Perfect side profile on white showing true heel height and length.",
      "Ethnic — Juttis & Kolhapuri": "Top-down or side profile on white, full product in frame.",
    },
    "Bags & Accessories": {
      "Wallets, Belts & Scarves": "Front-facing flat on white. Full product dimensions visible with margin.",
    },
    "Food & Beverages": {
      "Frozen Fruits": "Top-down on white, product fully visible with margin for dimension overlay.",
    },
    "Handicraft & Export": {
      "Dining & Kitchen": "Front-facing or top-down on white, full product with margin for dimensions.",
    },
    "Jewellery": {
      "Ethnic & Traditional": "Flat top-down on white velvet or white surface, full piece visible with margin.",
      "Western Pieces": "Flat top-down on white, full piece visible with clean margin.",
    },
  },

  with_model: {
    default: "Show the product being naturally used or worn by a person in a realistic Indian home or lifestyle setting. Model should look like a real Indian consumer — natural expression, not posed stiffly. Warm natural lighting. Product clearly visible and in focus.",
    "Home Furnishing": {
      "Living Decor": "A person is relaxing on a sofa in a warm Indian living room. The cushion is naturally placed on the sofa or being held. Afternoon natural light from a window. Warm neutral tones — beige, cream, wood furniture. The product is the clear focal point.",
      "Bed & Bath": "A person in comfortable home clothes is sitting or lying on a neatly made bed in a modern Indian bedroom. The linen or quilt is the hero. Soft morning light. Clutter-free room.",
    },
    "Cosmetics": {
      "Haircare & Treatment": "A young Indian woman with healthy hair is shown in a bright bathroom or vanity setting, naturally holding or using the product. Clean background, soft daylight.",
      "Skincare & Wellness": "A young Indian woman with clear glowing skin is shown at a vanity or bathroom counter, naturally holding the product. Soft diffused light, clean modern Indian bathroom aesthetic.",
    },
    "Apparels": {
      "Kids Wear": "A happy Indian child aged 4-10 is wearing the garment in a bright home or outdoor setting. Natural joyful expression. Warm natural lighting.",
      "Men": "A well-groomed Indian man in his 25-35s is wearing the garment in a modern Indian context — home, cafe, or office corridor. Natural confident posture. Soft natural light.",
      "Women": "An Indian woman in her 20s-30s is wearing the garment in a relatable Indian lifestyle setting — home, terrace, or market. Natural elegant posture. Warm natural light.",
      "Sustainable & Handlooms": "An Indian woman or man wearing the handloom garment in a natural earthy setting — terrace, garden, or heritage interior. The fabric drape and texture is the hero.",
    },
    "Footwear": {
      "Active & Casual": "An Indian person in their 20s-30s wearing the footwear while walking or standing in a casual urban Indian setting. Shoes clearly visible, natural stride.",
      "Heels, Flats & Loafers": "An Indian woman wearing the footwear in an elegant urban setting — cafe, office, or city street. Feet and footwear clearly in focus.",
      "Ethnic — Juttis & Kolhapuri": "An Indian woman or man wearing the ethnic footwear with traditional or fusion outfit. Feet visible, cultural context natural and authentic.",
    },
    "Bags & Accessories": {
      "Wallets, Belts & Scarves": "An Indian person naturally wearing or using the accessory in a lifestyle setting. Product clearly visible and in focus. Natural lighting.",
    },
    "Jewellery": {
      "Ethnic & Traditional": "An Indian woman wearing the ethnic jewellery with a traditional outfit — saree or salwar. Close-up showing jewellery detail. Warm skin tone, natural expression.",
      "Western Pieces": "An Indian woman wearing the jewellery with contemporary western outfit. Clean background, soft natural light, jewellery clearly the focal point.",
    },
  },

  professional: {
    default: "Dramatic high-end studio product photography. Dark or deep-toned background — charcoal, deep navy, or rich brown. Single strong directional key light creating defined shadows and highlights. Premium luxury feel. Product is the absolute hero.",
    "Home Furnishing": {
      "Living Decor": "The cushion, curtain, or rug is styled in a premium Indian interior — dark wood furniture, ambient warm lighting, dramatic moody atmosphere. Shot like a luxury home decor magazine spread. Deep warm tones.",
      "Bed & Bath": "Premium bedroom or bathroom setting. Deep toned walls, luxury hotel aesthetic. Crisp white linen or plush towel against dark background. Dramatic single light source.",
      "Table Linens": "Elegant dining table setup with the mat or runner as hero. Dark wood table, dramatic overhead light, minimal props — a single glass or candle.",
    },
    "Cosmetics": {
      "Fragrances & Essential Oils": "Dark luxurious background — black or deep purple. Single hard light creating dramatic specular highlights on the glass bottle. Smoke or mist effect optional. Ultra-premium feel.",
      "Skincare & Wellness": "Clean minimalist luxury aesthetic. Pale marble or soft grey background. Precise soft-box lighting. Premium skincare brand feel — like Forest Essentials or Clinique.",
    },
    "Footwear": {
      "Active & Casual": "Dark studio background, dramatic side lighting highlighting the shoe silhouette and material texture. Sports or streetwear brand campaign feel.",
      "Heels, Flats & Loafers": "Elegant dark or marble background, soft directional light from above highlighting the shoe profile. High-fashion editorial feel.",
    },
    "Food & Beverages": {
      "Fresh Vegetables & Fruits": "Dark moody food photography background — slate, dark wood, or black marble. Dramatic overhead light, water droplets visible for freshness. Restaurant-quality presentation.",
      "Frozen Fruits": "Dark background with ice elements. Dramatic backlit or side-lit. Frost and freshness premium feel.",
    },
    "Handicraft & Export": {
      "Artisanal Decor & Wall Art": "Dark or richly textured background — deep teal wall, dark stone surface. Dramatic spotlight on the handcrafted object. Museum-quality presentation of Indian craft.",
      "Dining & Kitchen": "Dark wood or slate surface, moody dramatic lighting. Premium restaurant prop styling. The ceramic or wood piece feels like a luxury brand product.",
    },
    "Jewellery": {
      "Ethnic & Traditional": "Deep rich background — black velvet or dark burgundy. Single spotlight on the jewellery. Gold and stones catching light dramatically. Luxury jewellery brand aesthetic.",
      "Western Pieces": "Clean dark or marble background. Precise single light source creating crisp reflections on metal and stones. Minimalist luxury.",
    },
    "Apparels": {
      "Sustainable & Handlooms": "Rich heritage aesthetic. Deep warm background — terracotta, indigo, or burnt sienna. Dramatic window-style lighting. The handloom fabric texture is a work of art.",
    },
  },

  flat_lay: {
    default: "Perfectly top-down flat lay composition. Product is the hero, surrounded by carefully chosen complementary props that tell a story. Clean surface — white marble, light wood, or linen texture. Even soft overhead lighting, no harsh shadows.",
    "Home Furnishing": {
      "Living Decor": "Top-down flat lay on a light wood or neutral linen surface. The cushion or rug is the center. Props: a small indoor plant, a ceramic mug, a book with neutral cover. Warm morning light feel.",
      "Bed & Bath": "Top-down on a bed surface or clean white surface. The towel or linen folded neatly as hero. Props: a small soap bar, dried flowers, a candle. Spa-like serene aesthetic.",
      "Table Linens": "Top-down on the mat or runner itself as the surface. Minimal props — a ceramic plate, cutlery, a glass. Clean Indian dining aesthetic.",
    },
    "Cosmetics": {
      "Fragrances & Essential Oils": "Top-down on white marble or soft grey surface. The bottle as hero. Props: dried botanicals, a few petals, a small crystal. Luxury apothecary feel.",
      "Haircare & Treatment": "Top-down on light surface. Product as hero with props: a wooden comb, a few botanicals, clean white towel fold. Natural beauty brand aesthetic.",
      "Skincare & Wellness": "Top-down on white or pale pink marble. Product as hero with minimal props — a jade roller, rose petals, clean white cloth. Clean-beauty aesthetic.",
    },
    "Apparels": {
      "Kids Wear": "Top-down flat lay on white surface. Garment neatly spread. Props: small toy, colorful pencils, a tiny pair of shoes. Cheerful warm tones.",
      "Men": "Top-down on neutral surface — grey linen or white marble. Garment as hero. Props: a watch, wallet, minimal accessories. Clean modern masculine aesthetic.",
      "Women": "Top-down on soft pastel or white surface. Garment as hero with feminine props — a small pouch, bangles, flowers. Warm lifestyle feel.",
      "Sustainable & Handlooms": "Top-down on natural jute or earthy linen surface. Garment as hero. Props: dried wheat, natural stone, terracotta element. Craft and nature story.",
    },
    "Footwear": {
      "Ethnic — Juttis & Kolhapuri": "Top-down flat lay on earthy natural surface — jute mat or stone. Footwear as hero with ethnic props: marigold petals, bindi, a dupatta corner.",
    },
    "Bags & Accessories": {
      "Wallets, Belts & Scarves": "Top-down on neutral surface. Accessory as hero with minimal complementary props — keys, coins for wallet; a white shirt fold for belt; fabric swatches for scarf.",
    },
    "Food & Beverages": {
      "Fresh Vegetables & Fruits": "Top-down on rustic wood or marble surface. Produce arranged artfully with props: a cutting board, knife, small bowl, herb sprigs. Fresh market to kitchen story.",
      "Frozen Fruits": "Top-down on white or ice-blue surface. Frozen fruits arranged with ice cubes and mint leaves. Fresh and cold aesthetic.",
    },
    "Handicraft & Export": {
      "Artisanal Decor & Wall Art": "Top-down on natural surface — jute, stone, or dark wood. The craft piece as hero. Minimal Indian cultural props: incense, marigold petals, a small diya.",
      "Dining & Kitchen": "Top-down dining setup. The ceramic or wood piece as hero with food styling props — ingredients, spices in small bowls, a cloth napkin. Indian kitchen warmth.",
    },
    "Jewellery": {
      "Ethnic & Traditional": "Top-down on dark velvet or silk fabric surface. Jewellery spread artfully. Props: rose petals, a small mirror, silk thread. Bridal or festive feel.",
      "Western Pieces": "Top-down on white marble or clean surface. Jewellery as hero. Minimal props — a single flower, clean cloth. Modern jewellery brand aesthetic.",
    },
  },
};

const CLIENT_STYLE_PROMPTS = {
  client_cushion: "Professional product photography of a decorative cushion leaning against the armrest of a sofa, positioned in the corner where the armrest meets the seat. Cushion is slanted at a 45-degree angle, resting and leaning against the armrest for support — not lying flat on the seat. Shot from a slight front-angle view showing the cushion face clearly. Photorealistic, 8K quality, extreme detail on fabric texture, stitching, and pattern. Soft natural light. Shallow depth of field, sofa slightly blurred in background. No people, no clutter.",
  client_carpet: "Professional product photography of a carpet or rug lying completely flat on a clean hardwood or neutral floor. Camera positioned at a 45-degree elevated angle looking down toward the carpet, showing the full carpet surface with its pattern, texture, and border clearly visible. The carpet fills the majority of the frame. Even, diffused studio lighting from overhead — no harsh shadows, no hotspots — so the full pattern and color render accurately across the entire surface. Photorealistic, 8K quality, extreme detail on weave texture, pile, pattern, and fringe or border. No people, no props, no clutter around the carpet.",
};

const CLIENT_STYLE_NON_NEGOTIABLE = {
  client_cushion: "Cushion must be leaning against the sofa armrest in the corner, tilted at 45 degrees using the armrest as support. Not lying flat. Not floating. Not propped in open air. Face of cushion must be fully visible and sharp.",
  client_carpet: "Carpet must be lying completely flat on the floor — no curling edges, no folds, no bunching. Camera angle must be 45 degrees elevated, not top-down and not eye-level. Full carpet surface must be visible and sharp edge to edge. Pattern, texture, and border must be rendered with full detail across the entire carpet. No props on top of the carpet. No people.",
};

const PRODUCT_FIDELITY_NON_NEGOTIABLE = `The uploaded product is the SINGLE source of truth. Reproduce it with 100% fidelity — exact shape, exact design, exact details, exact proportions. Do not redesign, simplify, smooth out, or reinterpret any part of it.

If the product has an irregular or unique shape (animal shape, character, sculptural form) — preserve that shape exactly. Do not replace it with a generic version.

If the product has engravings, cutouts, patterns, texture, gemstones, or decorative elements — reproduce every single one exactly as shown.

The output product must be immediately recognizable as the same item from the input image. If in doubt, err toward MORE detail not less.`;

const VARIANT_SEED_PHRASES = [
  'primary composition, standard framing',
  'rotated perspective, shifted light source',
  'macro detail emphasis, extreme close crop',
  'dynamic three-quarter angular view',
];

function isSmallJewelryItem(cat) {
  const c = (cat || '').toLowerCase();
  // Necklace SET or necklace + earrings combo must be detected first
  if (/necklace.{0,30}(set|with earring|earring)|jewellery set|jewelry set|(set|combo).{0,30}necklace/.test(c)) return 'necklace_set';
  if (/earring|ear stud|ear drop|ear cuff/.test(c)) return 'earring';
  if (/anklet|payal/.test(c)) return 'anklet';
  if (/toe ring/.test(c)) return 'toe_ring';
  if (/\bring\b|signet/.test(c)) return 'ring';
  if (/bracelet|bangle/.test(c)) return 'bracelet';
  if (/\bnecklace\b/.test(c)) return 'necklace';
  if (/\bpendant\b/.test(c)) return 'pendant';
  return null;
}

async function analyzeProductAndBuildPrompt(
  imageUrl, styleKey, industry, category, variantIndex, options = {}, brandContext = {}
) {
  const isJewellery = category?.toLowerCase().includes('jewel')
    || category?.toLowerCase().includes('jewelry')
    || industry?.toLowerCase().includes('jewel');

  const allImageUrls = options.referenceImages?.length > 0
    ? options.referenceImages
    : [imageUrl];

  const imageContents = await Promise.all(
    allImageUrls.slice(0, 5).map(async (url) => {
      try {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = res.headers.get('content-type') || 'image/jpeg';
        return {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64}`,
            detail: 'high',
          },
        };
      } catch {
        return null;
      }
    })
  );

  const validImageContents = imageContents.filter(Boolean);

  const { brandName = '', productName = '' } = brandContext;

  const brandLine = brandName
    ? `Brand: "${brandName}". Product: "${productName}". Use this to infer the target lifestyle, consumer demographic, and appropriate home/indoor setting.`
    : '';

  const transformationDirective = STYLE_TRANSFORMATION_DIRECTIVE[styleKey]?.[variantIndex] 
    ?? STYLE_TRANSFORMATION_DIRECTIVE[styleKey]?.[0] 
    ?? '';

  const jewelleryAccuracyBlock = `
JEWELLERY ACCURACY REQUIREMENTS (non-negotiable):
- Preserve every design detail of the original piece exactly: number of stones, stone cuts, metal type, setting style, chain link pattern, pendant shape
- Do not simplify, merge, or omit any design element visible in the source image
- Describe the piece as if writing insurance documentation: precise, exhaustive, factual
- The generated image must be indistinguishable in design from the source — only lighting, angle, and background change

CONSISTENCY & FIDELITY (non-negotiable):
ORIENTATION: Match the orientation of the product exactly as shown in the input image. If the ring face points left in the input, it must point left in the output. Do not mirror, rotate, or flip the product orientation.
SIZE ACCURACY: Reproduce the product at true-to-life scale. Do not enlarge or exaggerate the size of beads, stones, links, or any component. If the necklace has small delicate beads in the input, they must appear small and delicate in the output. Scale must match real-world proportions.
SET DETAIL CONSISTENCY: Both pieces must receive equal detail rendering. Earrings must exactly match the input image — same number of beads, same design, same size, same shape. Do not simplify, summarize, or redesign the earrings. Treat earrings as a separate hero product, not a supporting accessory.
`;

  let systemMessage = '';

  function getModelInteractionDirective(cat, pName) {
    const c = (cat || '').toLowerCase();
    const smallItem = isSmallJewelryItem(c) || isSmallJewelryItem(pName);
    if (smallItem === 'necklace_set')
      return `Professional model wearing the jewelry. Model wearing BOTH the necklace AND earrings simultaneously. Half body portrait, face and chest visible clearly. Model looking straight or slightly angled toward camera. Editorial fashion photography style. The jewelry must be clearly visible and sharp on the model.`;
    if (smallItem === 'earring')
      return `Professional model wearing the jewelry. Face clearly visible, ears prominent in frame. Model looking straight or slightly angled toward camera. Editorial fashion photography style. The jewelry must be clearly visible and sharp on the model.`;
    if (smallItem === 'anklet')
      return `Professional model wearing the jewelry. Full body shot showing face and feet both. Model looking straight or slightly angled toward camera. Editorial fashion photography style. The jewelry must be clearly visible and sharp on the model.`;
    if (smallItem === 'toe_ring')
      return `Professional model wearing the jewelry. Full body shot showing face and feet both. Model looking straight or slightly angled toward camera. Editorial fashion photography style. The jewelry must be clearly visible and sharp on the model.`;
    if (smallItem === 'ring')
      return `Professional model wearing the jewelry. Hand visible but face also in shot, 3/4 body or portrait shot. Model looking straight or slightly angled toward camera. Editorial fashion photography style. The jewelry must be clearly visible and sharp on the model.`;
    if (smallItem === 'bracelet')
      return `Professional model wearing the jewelry. Wrist visible, half body or portrait shot. Model looking straight or slightly angled toward camera. Editorial fashion photography style. The jewelry must be clearly visible and sharp on the model.`;
    if (smallItem === 'necklace')
      return `Professional model wearing the jewelry. Half body portrait, face and chest visible clearly. Model looking straight or slightly angled toward camera. Editorial fashion photography style. The jewelry must be clearly visible and sharp on the model.`;
    if (smallItem === 'pendant')
      return `Professional model wearing the jewelry. Half body portrait, face and chest visible clearly. Model looking straight or slightly angled toward camera. Editorial fashion photography style. The jewelry must be clearly visible and sharp on the model.`;
    if (/apparel|kids wear|men|women|sustainable|handloom|t.?shirt|shirt|dress|jacket|hoodie|top|kurta|saree|suit/.test(c))
      return `The model must be WEARING the product on their body — fitted, styled, and photographed fashion-editorial style. Do NOT show the model holding the product away from their body.`;
    if (/jewel|necklace|bracelet|ring|earring|watch|pendant|bangle/.test(c))
      return `The model must have the product ON their body — worn as intended (around neck, on wrist, on finger, on ears). Do NOT show the model holding the jewellery in their hand away from their body.`;
    if (/footwear|shoe|sneaker|boot|heel|flat|loafer|jutti|kolhapuri/.test(c))
      return `The model must be WEARING the product on their feet — full or half body shot showing the footwear clearly worn. Do NOT show the model holding the shoes.`;
    if (/bag|handbag|wallet|belt|scarf|accessory|accessories/.test(c))
      return `The model must be CARRYING or WEARING the product naturally — bag over shoulder or in hand in use, belt fastened, scarf draped on body. Do NOT display it as a prop held out toward the camera.`;
    if (/candle|vase|decor|figurine|statue|pot|planter|frame|bowl|tray|diffuser|holder|stand/.test(c))
      return `EXTREME CLOSE-UP of hands only interacting with the product naturally — e.g. hands lighting a candle, hands holding a vase from below, hands arranging flowers, hands placing a frame. The product must fill the majority of the frame and be the dominant subject; hands are supporting context only. No full body, no face, no room scene. Do NOT show a person sitting or standing with the product in a room setting.`;
    return `The model must be using or wearing the product as intended in real life. Do NOT show the model holding the product away from their body or displaying it like a prop.`;
  }

  const modelInteractionDirective = getModelInteractionDirective(category, brandContext.productName);
  // Also check productName so "Gold Necklace Set with Earrings" triggers necklace_set even if category is generic
  const smallJewelryType = isSmallJewelryItem(category) || isSmallJewelryItem(brandContext.productName);

  const isHomeDecor = /candle|vase|decor|figurine|statue|pot|planter|frame|bowl|tray|diffuser|holder|stand/.test((category || '').toLowerCase());

  if (styleKey === 'with_model') {
    const SMALL_JEWELRY_NON_NEGOTIABLE = {
      necklace_set: '\\n- Model wearing necklace AND earrings simultaneously. Both pieces clearly visible and sharp. Product must be the hero of the image.\\n- PLACEMENT: Necklace must drape naturally on the collarbone and chest, not floating or too high on neck.\\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\\n- SIZE ACCURACY: Reproduce all beads, stones, and links at true-to-life scale — do not exaggerate size.\\n- SET DETAIL: Both necklace and earrings receive equal detail rendering. Earrings must exactly match input — same number of beads, same design, same size, same shape. Treat earrings as a separate hero product.',
      earring:      '\\n- Earring must be the hero of the image, clearly visible on earlobe.\\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\\n- SIZE ACCURACY: Reproduce earring at true-to-life scale — do not exaggerate the size of beads, stones, or drops.',
      anklet:       '\\n- Anklet/payal must be the hero of the image, clearly visible.\\n- PLACEMENT: Anklet must sit exactly on the ankle bone, not on the foot or above the calf.\\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\\n- SIZE ACCURACY: Reproduce at true-to-life scale — do not exaggerate bead or charm size.',
      toe_ring:     '\\n- Toe ring must be the hero of the image, clearly visible on toe.\\n- PLACEMENT: Toe ring must sit at the base of the toe, not the tip.\\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.',
      ring:         '\\n- Ring must be the hero of the image, clearly visible on finger.\\n- PLACEMENT: Ring must sit on the middle section of the finger, not at fingertip or base.\\n- ORIENTATION: Match product orientation exactly from the input image. If the ring face points left in the input, it must point left in the output — do not mirror or flip.\\n- SIZE ACCURACY: Reproduce ring at true-to-life scale — do not exaggerate stone or band size.',
      bracelet:     '\\n- Bracelet/bangle must be the hero of the image, clearly visible on wrist.\\n- PLACEMENT: Must sit on the wrist joint, not forearm or palm.\\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\\n- SIZE ACCURACY: Reproduce at true-to-life scale — do not exaggerate bead, link, or charm size.',
      necklace:     '\\n- Necklace must be the hero of the image, clearly visible.\\n- PLACEMENT: Must drape naturally on the collarbone and chest, not floating or too high on neck.\\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\\n- SIZE ACCURACY: Reproduce all beads, stones, and links at true-to-life scale — do not exaggerate size.',
      pendant:      '\\n- Pendant must be the hero of the image, clearly visible.\\n- PLACEMENT: Must drape naturally on the collarbone, not floating or too high on neck.\\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\\n- SIZE ACCURACY: Reproduce pendant at true-to-life scale — do not exaggerate the pendant or stone size.',
    };

    const SMALL_JEWELRY_BODY_PART = {
      necklace_set: 'face and chest',
      earring:      'face and ears',
      anklet:       'face and feet',
      toe_ring:     'face and feet',
      ring:         'hand and face',
      bracelet:     'wrist and face',
      necklace:     'face and chest',
      pendant:      'face and chest',
    };

    const smallJewelryNonNegotiable = smallJewelryType ? (SMALL_JEWELRY_NON_NEGOTIABLE[smallJewelryType] || '') : '';

    const outputInstruction = isHomeDecor
      ? 'Start with the hands and their interaction with the product, describe the product as the dominant subject filling the frame, end with the lighting. No full body, no face, no room scene.'
      : isJewellery
      ? 'Start with the model wearing the jewelry, describe the framing, pose, and lighting, and ensure the jewelry is sharp and prominent on the model.'
      : smallJewelryType
      ? `Start with the close-up body part (${SMALL_JEWELRY_BODY_PART[smallJewelryType] || 'relevant body part'}) and the product worn on it, describe the tight framing and lighting. No unnecessary body parts, no environment.`
      : 'Start with the model and their interaction with the product, end with the environment and lighting.';

    const jewelryDrapeBlock = isJewellery ? `

JEWELRY MATERIAL BEHAVIOR (non-negotiable):
The jewelry should look natural and true to its material — not stiff, rigid, or plastic. Reproduce the physical behavior of the material:
- Chain necklaces → drape naturally with slight gravity, links flow freely
- Fabric/thread/beaded bracelets → soft, slightly loose on wrist, natural drape, not rigid like a bangle
- Metal bangles → solid and rigid is correct, slight reflection on skin
- Beaded jewelry → individual beads have slight movement, string has natural curve
- Delicate chains → fine and light, catching light naturally
- Coin/charm jewelry → charms hang at natural angles with slight sway` : '';

    systemMessage = `You are a professional advertising photographer. Your job is to write a precise shot description for a lifestyle photo that MUST include a real human model physically interacting with this product.

NON-NEGOTIABLE: A real human being must appear in this image — hands, arms, or full body. ${modelInteractionDirective}${isJewellery ? '\n- Earrings are worn on ears only — never interpret earrings as rings worn on fingers. Identify each accessory type precisely: necklace=neck, earrings=ears, bracelet=wrist, ring=finger. Do not substitute one accessory type for another.\n- Jewelry must look physically natural on the body — not like a 3D render or sticker placed on top. It should interact with skin, light, and gravity naturally. Avoid over-rigidity unless the piece is genuinely a solid metal cuff or bangle.' : ''}${smallJewelryNonNegotiable}${jewelryDrapeBlock}

PRODUCT FIDELITY (non-negotiable): ${PRODUCT_FIDELITY_NON_NEGOTIABLE}

Scene directive: "${transformationDirective}"

Model appearance rules:
- Natural skin with visible pores, texture, and subtle imperfections — not AI-smoothed
- The model is physically embedded in the scene — same lighting on skin as on background
- No background blur/bokeh separation — the model exists in a real space
- Clothing should be casual and match the product's lifestyle context
- Model ethnicity, age, and style should feel authentic to an everyday person, not a commercial model

Product fidelity: describe every visible design detail of the product from the source image — colors, patterns, materials, textures — and place it on/with the model exactly as it appears.

${brandLine}

${variantIndex > 0 ? `Variant ${variantIndex}: Change the ${isHomeDecor || (smallJewelryType && !isJewellery) ? 'hand/body-part angle, grip, and lighting direction' : 'model pose, body framing, and room location'} distinctly from variant 0.` : ''}

Output: 2-3 sentences. ${outputInstruction} No bullet points.`;
  } else if (styleKey === 'professional') {
    const angles = [
      'front-facing, straight-on, eye-level with the product',
      '45-degree angle, slightly elevated, three-quarter view',
      'top-down overhead shot, flat-lay perspective',
      'side profile, 90-degree lateral view',
    ];
    const lightingSetups = [
      'soft diffused studio light from directly above, even illumination with gentle fill shadows',
      'dramatic side lighting from camera-left, strong shadow casting across the surface to sculpt texture',
      'backlit with rim/edge lighting, creating a halo around the product and emphasizing silhouette and material finish',
    ];
    const angle = angles[variantIndex % angles.length];
    const lighting = lightingSetups[variantIndex % lightingSetups.length];

    const professionalRecreateDirective = `Generate a completely new professional product photograph. Do NOT replicate or copy the composition, background, lighting, or framing of the input image. The input image is only a reference for the product's appearance — recreate the product in a fresh studio setting with new angle, new lighting, and new composition.`;

    const JEWELRY_PROP_RULE = {
      necklace_set: 'velvet necklace bust — necklace draped naturally on the bust neck, earrings clipped to the sides of the bust',
      necklace:     'velvet necklace bust, chain and pendant draped naturally with correct fall and drape',
      earring:      'small earring stand or both earrings laid flat on satin cloth, pair displayed together',
      ring:         'ring cone, ring cushion, or standing upright on velvet',
      bracelet:     'bracelet stand or coiled on velvet pillow',
      anklet:       'draped on a smooth stone or folded satin cloth',
      toe_ring:     'laid flat on satin or marble surface',
      pendant:      'velvet necklace bust or satin cloth, pendant hanging or resting to show the design clearly',
    };

    const propRule = JEWELRY_PROP_RULE[smallJewelryType] || 'appropriate jewelry display prop — stand, cushion, or velvet surface';

    if (isJewellery) {
      systemMessage = `You are a luxury jewelry product photographer. Write a precise shot description for a professional display photograph of this jewelry piece on an elegant prop.

Professional jewelry product photography. The piece is displayed on an elegant prop appropriate to its type: ${propRule}. Background is luxurious fabric — satin, velvet, or silk — in neutral tones (cream, ivory, dusty rose, charcoal, or black).

NON-NEGOTIABLE:
- No human body parts. No models. No hands. Product displayed on correct jewelry prop only.
- Background must be luxury fabric or clean neutral surface.
- Every detail of the jewelry must be sharp and accurately reproduced.
- Output must look visibly different from the input image in composition and lighting. Same product, completely new photograph.

PRODUCT FIDELITY (non-negotiable): ${PRODUCT_FIDELITY_NON_NEGOTIABLE}

${professionalRecreateDirective}

Camera angle for this variant: ${angle}
Lighting for this variant: ${lighting}

${jewelleryAccuracyBlock}

Output: 2-3 sentences. Describe the prop the jewelry is displayed on, the jewelry itself, the background fabric, and the lighting. No bullet points.`;
    } else {
      systemMessage = `You are a luxury commercial product photographer specialising in macro/detail photography. Write a precise close-up shot description that shows the product's texture, material, finish, and craftsmanship.

NON-NEGOTIABLE:
- Close-up macro framing — tight crop that fills the frame with the product or a key detail section
- No mannequins, no stands, no holders
- The product must have physical presence: contact shadow, weight on surface, realistic material rendering
- Show all accessories or components present in the source image
- Output must look visibly different from the input image in composition and lighting. Same product, completely new photograph.

PRODUCT FIDELITY (non-negotiable): ${PRODUCT_FIDELITY_NON_NEGOTIABLE}

${professionalRecreateDirective}

Camera angle for this variant: ${angle}
Lighting for this variant: ${lighting}

Product fidelity: reproduce every design detail exactly — colors, patterns, materials, print designs, textures, stitching, hardware.

${brandLine}

Output: 2-3 sentences describing the exact close-up scene — what detail is shown, the angle, the surface, and the lighting. No bullet points.`;
    }
  } else if (styleKey === 'white_bg_dims') {
    const dims = options.dimensions;
    const dimsString = (dims && dims.length && dims.width && dims.height)
      ? `${dims.length} × ${dims.width} × ${dims.height} ${dims.unit || 'cm'} (L × W × H)`
      : null;

    systemMessage = `You are a professional product photographer and technical illustrator. Write a precise shot description for a white background product image WITH dimension annotation overlays.

NON-NEGOTIABLE:
- Pure white seamless background — no props, no shadows except a faint base shadow directly beneath
- Product perfectly centered, slight 15-degree elevated front angle, orthographic-style
- The image MUST include dimension annotation lines drawn directly onto the image: thin ruled lines with arrows indicating the product's length, width, and height measurements
- Dimension labels must appear in a clean sans-serif font alongside each measurement line
- Annotation style: technical product diagram — ruled lines extending outside the product silhouette, with arrowheads and measurement text
${dimsString ? `- Exact dimensions to annotate: ${dimsString}` : '- Annotate with visible dimension lines for length, width, and height — even if exact values are not specified, the lines and arrows must appear'}

PRODUCT FIDELITY (non-negotiable): ${PRODUCT_FIDELITY_NON_NEGOTIABLE}

Product fidelity: reproduce every design detail exactly — colors, materials, textures, shape.

Output: 2-3 sentences describing the white background setup, the product positioning, and the dimension annotation lines. No bullet points.`;
  } else {
    systemMessage = `You are a professional product photographer writing camera-ready shot descriptions.

STEP 1 — PRODUCT INVENTORY (observe the source image precisely):
List every visible design element: exact stone colors, stone cuts (round brilliant, pear, baguette, emerald-cut etc), metal color and finish, setting types (pavé, bezel, prong), structural elements (hoops, chains, pendants, drops), approximate stone count per section. Be exhaustive.

STEP 2 — SCENE DESCRIPTION (write this as your output):
Place this EXACT product — with every detail from Step 1 preserved — into this specific scene:
"${transformationDirective}"

The scene MUST be completely different from the source image's background. The product design must remain 100% identical — only the environment, lighting, angle, and surface change.

PRODUCT FIDELITY (non-negotiable): ${PRODUCT_FIDELITY_NON_NEGOTIABLE}

${isJewellery ? `JEWELLERY FIDELITY RULES:
- Count and describe stones by section — do not generalize ("many stones" is forbidden)
- Name every structural component you see
- The output image must look like the same piece photographed in a new studio setup, not a similar piece` : ''}

Output format: 2-3 sentences describing the complete scene with the product in it. Start with the product description, end with the lighting and background. No bullet points, no explanations.`;
  }

  const visionResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemMessage },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are analyzing ${validImageContents.length} reference photo(s) of the same product from different angles. Image 1 is the primary reference. Analyze ALL images together to build a complete understanding of the product's shape, size, proportions, colors, materials, and design details from every visible angle. Then write the scene description as instructed.`,
          },
          ...validImageContents,
        ],
      },
    ],
    max_tokens: 400,
  });

  return visionResponse.choices[0].message.content.trim();
}

async function createImageFile(imageUrl, filename) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const imageBlob = blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" });

  return new File([imageBlob], filename, { type: "image/png" });
}

export async function generateVariant(styleKey, uploadedImageUrl, userPrompt, options = {}, variantIndex = 0) {
  const { industry, category } = options;

  // Client-specific style keys bypass the standard STYLE_PROMPTS lookup
  if (CLIENT_STYLE_PROMPTS[styleKey]) {
    const clientBasePrompt = CLIENT_STYLE_PROMPTS[styleKey];
    const clientNonNegotiable = CLIENT_STYLE_NON_NEGOTIABLE[styleKey] || "";

    const editPrompt = `Professional product photography. ${clientBasePrompt} NON-NEGOTIABLE: ${clientNonNegotiable} NON-NEGOTIABLE PRODUCT FIDELITY: ${PRODUCT_FIDELITY_NON_NEGOTIABLE} The product in the output must be identical to the reference product image — same shape, color, texture, and proportions. Do not invent or alter the product in any way.`;

    const finalPass = options.finalPass === true;
    const quality = finalPass ? "high" : "low";

    const productFile = await createImageFile(uploadedImageUrl, "product.png");

    const imageResponse = await openai.images.edit({
      model: "gpt-image-2",
      image: productFile,
      prompt: editPrompt,
      n: 1,
      size: "1024x1024",
      quality,
    });

    const item = imageResponse.data?.[0];
    if (!item?.b64_json) throw new Error("image response did not include b64_json output");

    return {
      success: true,
      variant: styleKey,
      outputUrl: "data:image/png;base64," + item.b64_json,
      seed: null,
      provider: "openai",
      metadata: {
        prompt_used: editPrompt,
        model: "gpt-image-2",
        quality,
      },
    };
  }

  const styleGroup = STYLE_PROMPTS[styleKey];
  if (!styleGroup) throw new Error(`unsupported style: ${styleKey}`);

  const isJewellery = category?.toLowerCase().includes('jewel')
    || category?.toLowerCase().includes('jewelry')
    || industry?.toLowerCase().includes('jewel');

  const jewelleryPromptSuffix = isJewellery
    ? ' Maintain 100% design fidelity to the source product image. Every stone, setting, and metal detail must match exactly.'
    : '';

  const sceneDescription = options.scenePrompt
    || await analyzeProductAndBuildPrompt(
        uploadedImageUrl, styleKey, industry, category, variantIndex, options,
        { brandName: options.brandName, productName: options.productName }
      );

  const dynamicScenePrompt = sceneDescription + jewelleryPromptSuffix;

  const finalPrompt = `You are a professional Amazon.in product photographer.
Task: Generate a photorealistic Amazon-ready product listing image.
Style instruction: ${dynamicScenePrompt}
Product: ${options.productName || "the product in the reference image"}
Brand: ${options.brandName || ""}
Category: ${category || ""}
CRITICAL: The product in the output must be identical to the reference product image — same shape, color, texture, logo, and proportions. Do not invent or alter the product in any way.`;

  const styleEnforcement = styleKey === 'with_model'
    ? ' A real human model with natural skin must be visibly present in this image, physically holding or interacting with the product. This is non-negotiable.'
    : styleKey === 'professional'
    ? ' The product must be photographed at the exact angle and tilt described, with dramatic directional lighting and deep shadows. Do not produce a flat front-facing product shot.'
    : styleKey === 'white_bg_dims'
    ? (() => {
        const dims = options.dimensions;
        const dimsString = (dims && dims.length && dims.width && dims.height)
          ? `${dims.length} × ${dims.width} × ${dims.height} ${dims.unit || 'cm'} (L × W × H)`
          : null;
        return ` CRITICAL: This image MUST show dimension annotation lines drawn onto the image — thin ruled lines with arrowheads indicating the product dimensions, with measurement labels in a clean sans-serif font.${dimsString ? ` The exact measurements to annotate are: ${dimsString}.` : ''} Pure white background. No decorative props.`;
      })()
    : '';

  const editPrompt = `Professional product photography. ${finalPrompt}${styleEnforcement} NON-NEGOTIABLE PRODUCT FIDELITY: ${PRODUCT_FIDELITY_NON_NEGOTIABLE} Reproduce the product's design, colors, and details with 100% accuracy from the reference image.`;

  const finalPass = options.finalPass === true;
  const quality = finalPass ? "high" : "low";
  const n = 1;

  const productFile = await createImageFile(uploadedImageUrl, "product.png");

  const [imageResponse, copy] = await Promise.all([
    openai.images.edit({
      model: "gpt-image-2",
      image: productFile,
      prompt: editPrompt,
      n,
      size: "1024x1024",
      quality,
    }),
    generateCopyContent({
      productName: options.productName,
      brandName: options.brandName,
      category,
      industry,
      styleKey,
    }),
  ]);

  const item = imageResponse.data?.[0];
  if (!item?.b64_json) throw new Error("image response did not include b64_json output");

  return {
    success: true,
    variant: styleKey,
    outputUrl: "data:image/png;base64," + item.b64_json,
    seed: null,
    provider: "openai",
    metadata: {
      prompt_used: editPrompt,
      scene_prompt: sceneDescription,
      model: "gpt-image-2",
      quality,
    },
    copy,
  };
}

async function generateCopyContent({ productName, brandName, category, industry, styleKey }) {
  try {
    const styleLabel = styleKey.replace(/_/g, ' ');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an e-commerce copywriter. Return only valid JSON, no markdown.",
        },
        {
          role: "user",
          content: `Product: "${productName || 'product'}", Brand: "${brandName || ''}", Category: "${category || ''}", Industry: "${industry || ''}", Shot style: "${styleLabel}". Return JSON: {"description": "2-3 sentence product description for e-commerce listing", "seo_keywords": ["keyword1", "keyword2", ...8-10 keywords]}`,
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("generateCopyContent failed:", err);
    return null;
  }
}
