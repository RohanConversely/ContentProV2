import OpenAI from 'openai';

// ── Product fidelity block (shared with batchWorker edit prompt) ─────────────

export const PRODUCT_FIDELITY_NON_NEGOTIABLE = `The uploaded product is the SINGLE source of truth. Reproduce it with 100% fidelity — exact shape, exact design, exact details, exact proportions. Do not redesign, simplify, smooth out, or reinterpret any part of it.

If the product has an irregular or unique shape (animal shape, character, sculptural form) — preserve that shape exactly. Do not replace it with a generic version.

If the product has engravings, cutouts, patterns, texture, gemstones, or decorative elements — reproduce every single one exactly as shown.

WATCH/DISPLAY FACES: Preserve all text, numerals, hands, and display elements exactly as in the reference. Do not alter, blur, or reimagine the watch face under any circumstances.

The output product must be immediately recognizable as the same item from the input image. If in doubt, err toward MORE detail not less.`;

// ── Style transformation directives (4 composition variants per style) ────────

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
    'perfectly overhead 90-degree bird\'s-eye flat lay on warm white linen, camera pointing straight down, soft diffused window light, product centered. All straps and appendages lie fully extended and flat in their natural direction.',
    'perfectly overhead 90-degree bird\'s-eye flat lay on dark slate stone surface, camera pointing straight down, hard directional light from upper-right, strong shadow extending left. All straps and appendages lie fully extended and flat in their natural direction.',
    'perfectly overhead 90-degree bird\'s-eye flat lay on blush pink silk fabric with natural wrinkles, camera pointing straight down, soft even studio light, product slightly rotated 20 degrees. All straps and appendages lie fully extended and flat in their natural direction.',
    'perfectly overhead 90-degree bird\'s-eye flat lay on aged white marble with natural veining, camera pointing straight down, dual softbox lighting, product dead center. All straps and appendages lie fully extended and flat in their natural direction.',
  ],
  white_bg: [
    'pure white seamless background, product upright and perfectly centered with soft drop shadow directly beneath, even studio lighting, 15-degree elevated front angle',
    'pure white seamless background, product upright at 25-degree clockwise rotation, longer asymmetric shadow to the lower-right, even studio lighting',
    'pure white seamless background, product upright at a slight side angle showing depth and dimension, soft shadow at base, clean studio lighting',
    'pure white seamless background, product at 3/4 front angle with slight perspective showing depth, upright, shadow at lower-left, professional e-commerce standard',
  ],
};

// ── Jewelry type detection ────────────────────────────────────────────────────

function isSmallJewelryItem(cat) {
  const c = (cat || '').toLowerCase();
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

// ── Model interaction directive ───────────────────────────────────────────────

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

// ── Core prompt builder ───────────────────────────────────────────────────────

/**
 * Builds a GPT-4o vision scene description for the given style.
 * Pure Node.js — no Vite, no import.meta.env, no browser APIs.
 *
 * @param {object} params
 * @param {string} params.productName
 * @param {string} [params.brandName]
 * @param {string} [params.category]
 * @param {string} [params.industry]
 * @param {string} params.styleKey
 * @param {number} [params.variantIndex=0]
 * @param {string[]} params.imageUrls  — first URL is primary; remainder are reference angles
 * @param {string} params.openaiApiKey
 * @returns {Promise<string>} scene description
 */
export async function buildPromptForWorker({
  productName,
  brandName,
  category,
  industry,
  styleKey,
  variantIndex = 0,
  imageUrls,
  openaiApiKey,
}) {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const isJewellery = category?.toLowerCase().includes('jewel')
    || category?.toLowerCase().includes('jewelry')
    || industry?.toLowerCase().includes('jewel');

  // Fetch all reference images as base64
  const imageContents = await Promise.all(
    (imageUrls || []).slice(0, 5).map(async (url) => {
      try {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = res.headers.get('content-type') || 'image/jpeg';
        return { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } };
      } catch {
        return null;
      }
    })
  );
  const validImageContents = imageContents.filter(Boolean);

  const brandLine = brandName
    ? `Brand: "${brandName}". Product: "${productName || 'the product'}". Use this to infer the target lifestyle, consumer demographic, and appropriate home/indoor setting.`
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

  const modelInteractionDirective = getModelInteractionDirective(category, productName);
  const smallJewelryType = isSmallJewelryItem(category) || isSmallJewelryItem(productName);
  const isHomeDecor = /candle|vase|decor|figurine|statue|pot|planter|frame|bowl|tray|diffuser|holder|stand/.test((category || '').toLowerCase());
  const isWatch = /watch|timepiece|chrono/.test(((category || '') + ' ' + (productName || '')).toLowerCase());

  let systemMessage = '';

  if (styleKey === 'with_model') {
    const SMALL_JEWELRY_NON_NEGOTIABLE = {
      necklace_set: '\n- Model wearing necklace AND earrings simultaneously. Both pieces clearly visible and sharp. Product must be the hero of the image.\n- PLACEMENT: Necklace must drape naturally on the collarbone and chest, not floating or too high on neck.\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\n- SIZE ACCURACY: Reproduce all beads, stones, and links at true-to-life scale — do not exaggerate size.\n- SET DETAIL: Both necklace and earrings receive equal detail rendering. Earrings must exactly match input — same number of beads, same design, same size, same shape. Treat earrings as a separate hero product.',
      earring:      '\n- Earring must be the hero of the image, clearly visible on earlobe.\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\n- SIZE ACCURACY: Reproduce earring at true-to-life scale — do not exaggerate the size of beads, stones, or drops.',
      anklet:       '\n- Anklet/payal must be the hero of the image, clearly visible.\n- PLACEMENT: Anklet must sit exactly on the ankle bone, not on the foot or above the calf.\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\n- SIZE ACCURACY: Reproduce at true-to-life scale — do not exaggerate bead or charm size.',
      toe_ring:     '\n- Toe ring must be the hero of the image, clearly visible on toe.\n- PLACEMENT: Toe ring must sit at the base of the toe, not the tip.\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.',
      ring:         '\n- Ring must be the hero of the image, clearly visible on finger.\n- PLACEMENT: Ring must sit on the middle section of the finger, not at fingertip or base.\n- ORIENTATION: Match product orientation exactly from the input image. If the ring face points left in the input, it must point left in the output — do not mirror or flip.\n- SIZE ACCURACY: Reproduce ring at true-to-life scale — do not exaggerate stone or band size.',
      bracelet:     '\n- Bracelet/bangle must be the hero of the image, clearly visible on wrist.\n- PLACEMENT: Must sit on the wrist joint, not forearm or palm.\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\n- SIZE ACCURACY: Reproduce at true-to-life scale — do not exaggerate bead, link, or charm size.',
      necklace:     '\n- Necklace must be the hero of the image, clearly visible.\n- PLACEMENT: Must drape naturally on the collarbone and chest, not floating or too high on neck.\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\n- SIZE ACCURACY: Reproduce all beads, stones, and links at true-to-life scale — do not exaggerate size.',
      pendant:      '\n- Pendant must be the hero of the image, clearly visible.\n- PLACEMENT: Must drape naturally on the collarbone, not floating or too high on neck.\n- ORIENTATION: Match product orientation exactly from the input image — do not mirror or flip.\n- SIZE ACCURACY: Reproduce pendant at true-to-life scale — do not exaggerate the pendant or stone size.',
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

    const jewelryDrapeBlock = isJewellery ? `

JEWELRY MATERIAL BEHAVIOR (non-negotiable):
The jewelry should look natural and true to its material — not stiff, rigid, or plastic. Reproduce the physical behavior of the material:
- Chain necklaces → drape naturally with slight gravity, links flow freely
- Fabric/thread/beaded bracelets → soft, slightly loose on wrist, natural drape, not rigid like a bangle
- Metal bangles → solid and rigid is correct, slight reflection on skin
- Beaded jewelry → individual beads have slight movement, string has natural curve
- Delicate chains → fine and light, catching light naturally
- Coin/charm jewelry → charms hang at natural angles with slight sway` : '';

    const outputInstruction = isHomeDecor
      ? 'Start with the hands and their interaction with the product, describe the product as the dominant subject filling the frame, end with the lighting. No full body, no face, no room scene.'
      : isJewellery
      ? 'Start with the model wearing the jewelry, describe the framing, pose, and lighting, and ensure the jewelry is sharp and prominent on the model.'
      : smallJewelryType
      ? `Start with the close-up body part (${SMALL_JEWELRY_BODY_PART[smallJewelryType] || 'relevant body part'}) and the product worn on it, describe the tight framing and lighting. No unnecessary body parts, no environment.`
      : 'Start with the model and their interaction with the product, end with the environment and lighting.';

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
    systemMessage = `You are a professional product photographer and technical illustrator. Write a precise shot description for a white background product image WITH dimension annotation overlays.

NON-NEGOTIABLE:
- Pure white seamless background — no props, no shadows except a faint base shadow directly beneath
- Product perfectly centered, slight 15-degree elevated front angle, orthographic-style
- The image MUST include dimension annotation lines drawn directly onto the image: thin ruled lines with arrows indicating the product's length, width, and height measurements
- Dimension labels must appear in a clean sans-serif font alongside each measurement line
- Annotation style: technical product diagram — ruled lines extending outside the product silhouette, with arrowheads and measurement text
- Annotate with visible dimension lines for length, width, and height — even if exact values are not specified, the lines and arrows must appear

PRODUCT FIDELITY (non-negotiable): ${PRODUCT_FIDELITY_NON_NEGOTIABLE}

Product fidelity: reproduce every design detail exactly — colors, materials, textures, shape.

Output: 2-3 sentences describing the white background setup, the product positioning, and the dimension annotation lines. No bullet points.`;

  } else if (styleKey === 'flat_lay') {
    systemMessage = `You are a professional lifestyle product photographer. Write a precise shot description for a perfectly overhead flat lay composition.

CAMERA (non-negotiable): Exactly 90-degree overhead bird's-eye view. Camera points straight down at the surface. This is NOT a 45-degree angle. Zero perspective distortion — the surface appears completely flat in frame.

SURFACE (non-negotiable): Use a styled surface with visible texture — white marble with natural veining, warm linen, dark slate, blush silk, or light wood grain. NOT plain white. Surface texture must be visible around the product.

PRODUCT PLACEMENT:
- Product is the absolute hero, centered in the composition
- STRAPS & APPENDAGES (all products): All straps, handles, ties, laces, or flexible appendages must lie fully extended and flat in their natural direction. No overlapping, folding, or tucking. Each component should be clearly visible and separated.
- STRAP TAIL: The loose strap tail must be fully extended flat and straight, not tucked through the keeper loop or folded over. No part of the strap should overlap or intrude on top of another part.
${isWatch ? `- WATCH ORIENTATION: Watch must be oriented vertically (12 o'clock at top, 6 o'clock at bottom). Applies to digital watches too. Both straps extend straight up and straight down from the case, lying flat in the same axis as the watch body. Straps must never cross or be perpendicular to the watch case.` : ''}

PROPS: ${isWatch ? 'One subtle prop in a corner — a small crown piece, a folded leather strap swatch, or a minimal piece of jewelry. Must not overlap the watch.' : 'One or two carefully chosen complementary props in a corner — a natural element, minimal accessory, or small decorative object matching the product lifestyle. Must not overlap the hero product.'}

LIGHTING: Soft even overhead lighting. No harsh shadows. Full surface texture must render clearly.

PRODUCT FIDELITY (non-negotiable): ${PRODUCT_FIDELITY_NON_NEGOTIABLE}

Scene for this variant: "${transformationDirective}"

${isJewellery ? `JEWELLERY FIDELITY RULES:
- Count and describe stones by section — do not generalize ("many stones" is forbidden)
- Name every structural component you see
- The output image must look like the same piece photographed in a new studio setup, not a similar piece` : ''}

Output: 2-3 sentences. Start with the surface and strict overhead camera angle, describe the product layout and strap/prop positioning, end with the lighting. No bullet points.`;

  } else if (styleKey === 'white_bg') {
    systemMessage = `You are a professional product photographer. Write a precise shot description for a clean white background studio product shot.

NON-NEGOTIABLE:
- Pure white seamless background — no props, no surface texture, no styled surfaces, no marble or linen
- Product must be upright or at a slight angle — NOT flat, NOT top-down, NOT overhead
- Camera angle: 15-30 degree elevated front angle, or slight 3/4 angle — professional e-commerce standard
- No surface materials visible — clean white only with a faint base shadow directly beneath the product

PRODUCT FIDELITY (non-negotiable): ${PRODUCT_FIDELITY_NON_NEGOTIABLE}

Scene for this variant: "${transformationDirective}"

${isJewellery ? `JEWELLERY FIDELITY RULES:
- Count and describe stones by section — do not generalize ("many stones" is forbidden)
- Name every structural component you see
- The output image must look like the same piece photographed in a new studio setup, not a similar piece` : ''}

Output: 2-3 sentences. Start with the product's upright position and angle on the white background, describe the lighting, end with any distinguishing product details. No bullet points.`;

  } else {
    // fallback for any future style keys
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

  const userText = validImageContents.length > 1
    ? `You are analyzing ${validImageContents.length} reference photo(s) of the same product from different angles. Image 1 is the primary reference. Analyze ALL images together to build a complete understanding of the product's shape, size, proportions, colors, materials, and design details from every visible angle. Then write the scene description as instructed.`
    : 'Analyse this product image and write the scene description as instructed. No bullet points, no explanations — just the scene description.';

  const visionResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: [{ type: 'text', text: userText }, ...validImageContents] },
    ],
    max_tokens: 400,
  });

  return visionResponse.choices[0].message.content.trim();
}
