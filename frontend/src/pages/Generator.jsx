import { useState } from 'react';
import UploadBox from '../components/UploadBox.jsx';
import { generateVariant } from '@ai-services/imageService.js';

const TEMPLATE_CATALOGUE = {
    "Bags & Accessories": {
      "Essentials": [
        { id: "ba_es_01", label: "Wallet Flat Lay", thumbnail: "https://picsum.photos/seed/ba_es_01/400/400" },
        { id: "ba_es_02", label: "Belt Studio Shot", thumbnail: "https://picsum.photos/seed/ba_es_02/400/400" },
        { id: "ba_es_03", label: "Scarf Lifestyle", thumbnail: "https://picsum.photos/seed/ba_es_03/400/400" },
        { id: "ba_es_04", label: "Wallet on Marble", thumbnail: "https://picsum.photos/seed/ba_es_04/400/400" },
        { id: "ba_es_05", label: "Belt Hanging Shot", thumbnail: "https://picsum.photos/seed/ba_es_05/400/400" },
        { id: "ba_es_06", label: "Scarf Drape Close-up", thumbnail: "https://picsum.photos/seed/ba_es_06/400/400" },
        { id: "ba_es_07", label: "Accessories Flat Lay", thumbnail: "https://picsum.photos/seed/ba_es_07/400/400" },
        { id: "ba_es_08", label: "White Background Studio", thumbnail: "https://picsum.photos/seed/ba_es_08/400/400" },
      ],
    },
    "Cosmetics": {
      "Fragrances & Essential Oils": [
        { id: "co_fr_01", label: "Perfume Bottle Hero", thumbnail: "https://picsum.photos/seed/co_fr_01/400/400" },
        { id: "co_fr_02", label: "Oil Dropper Closeup", thumbnail: "https://picsum.photos/seed/co_fr_02/400/400" },
        { id: "co_fr_03", label: "Fragrance Lifestyle", thumbnail: "https://picsum.photos/seed/co_fr_03/400/400" },
        { id: "co_fr_04", label: "Flat Lay with Florals", thumbnail: "https://picsum.photos/seed/co_fr_04/400/400" },
        { id: "co_fr_05", label: "Dark Moody Studio", thumbnail: "https://picsum.photos/seed/co_fr_05/400/400" },
        { id: "co_fr_06", label: "Minimalist White", thumbnail: "https://picsum.photos/seed/co_fr_06/400/400" },
        { id: "co_fr_07", label: "Bottle on Petals", thumbnail: "https://picsum.photos/seed/co_fr_07/400/400" },
        { id: "co_fr_08", label: "Gifting Context", thumbnail: "https://picsum.photos/seed/co_fr_08/400/400" },
      ],
      "Haircare & Treatment": [
        { id: "co_hc_01", label: "Shampoo Bottle Studio", thumbnail: "https://picsum.photos/seed/co_hc_01/400/400" },
        { id: "co_hc_02", label: "Hair Oil Dropper", thumbnail: "https://picsum.photos/seed/co_hc_02/400/400" },
        { id: "co_hc_03", label: "Bathroom Shelf Context", thumbnail: "https://picsum.photos/seed/co_hc_03/400/400" },
        { id: "co_hc_04", label: "Flat Lay with Ingredients", thumbnail: "https://picsum.photos/seed/co_hc_04/400/400" },
        { id: "co_hc_05", label: "Model Hair Lifestyle", thumbnail: "https://picsum.photos/seed/co_hc_05/400/400" },
        { id: "co_hc_06", label: "White Background Hero", thumbnail: "https://picsum.photos/seed/co_hc_06/400/400" },
        { id: "co_hc_07", label: "Before After Split", thumbnail: "https://picsum.photos/seed/co_hc_07/400/400" },
        { id: "co_hc_08", label: "Ayurvedic Ingredient Context", thumbnail: "https://picsum.photos/seed/co_hc_08/400/400" },
      ],
      "Skincare & Wellness": [
        { id: "co_sk_01", label: "Moisturiser Flat Lay", thumbnail: "https://picsum.photos/seed/co_sk_01/400/400" },
        { id: "co_sk_02", label: "Serum Dropper Hero", thumbnail: "https://picsum.photos/seed/co_sk_02/400/400" },
        { id: "co_sk_03", label: "Morning Routine Context", thumbnail: "https://picsum.photos/seed/co_sk_03/400/400" },
        { id: "co_sk_04", label: "Marble Surface Studio", thumbnail: "https://picsum.photos/seed/co_sk_04/400/400" },
        { id: "co_sk_05", label: "Botanical Ingredients", thumbnail: "https://picsum.photos/seed/co_sk_05/400/400" },
        { id: "co_sk_06", label: "Gifting Lifestyle", thumbnail: "https://picsum.photos/seed/co_sk_06/400/400" },
        { id: "co_sk_07", label: "Minimalist White Hero", thumbnail: "https://picsum.photos/seed/co_sk_07/400/400" },
        { id: "co_sk_08", label: "Spa Wellness Context", thumbnail: "https://picsum.photos/seed/co_sk_08/400/400" },
      ],
    },
    "Food & Beverages": {
      "Fresh Vegetables & Fruits": [
        { id: "fb_fv_01", label: "Produce Flat Lay", thumbnail: "https://picsum.photos/seed/fb_fv_01/400/400" },
        { id: "fb_fv_02", label: "Basket Context", thumbnail: "https://picsum.photos/seed/fb_fv_02/400/400" },
        { id: "fb_fv_03", label: "Close-up Texture", thumbnail: "https://picsum.photos/seed/fb_fv_03/400/400" },
        { id: "fb_fv_04", label: "White Background Hero", thumbnail: "https://picsum.photos/seed/fb_fv_04/400/400" },
        { id: "fb_fv_05", label: "Farm Fresh Context", thumbnail: "https://picsum.photos/seed/fb_fv_05/400/400" },
        { id: "fb_fv_06", label: "Kitchen Counter", thumbnail: "https://picsum.photos/seed/fb_fv_06/400/400" },
        { id: "fb_fv_07", label: "Wooden Board Rustic", thumbnail: "https://picsum.photos/seed/fb_fv_07/400/400" },
        { id: "fb_fv_08", label: "Half-cut Detail", thumbnail: "https://picsum.photos/seed/fb_fv_08/400/400" },
      ],
      "Frozen Fruits": [
        { id: "fb_ff_01", label: "Frozen Pack Hero", thumbnail: "https://picsum.photos/seed/fb_ff_01/400/400" },
        { id: "fb_ff_02", label: "Ice Context Studio", thumbnail: "https://picsum.photos/seed/fb_ff_02/400/400" },
        { id: "fb_ff_03", label: "Smoothie Ready Context", thumbnail: "https://picsum.photos/seed/fb_ff_03/400/400" },
        { id: "fb_ff_04", label: "Flat Lay on Ice", thumbnail: "https://picsum.photos/seed/fb_ff_04/400/400" },
        { id: "fb_ff_05", label: "White Background Pack", thumbnail: "https://picsum.photos/seed/fb_ff_05/400/400" },
        { id: "fb_ff_06", label: "Bowl Serving Lifestyle", thumbnail: "https://picsum.photos/seed/fb_ff_06/400/400" },
        { id: "fb_ff_07", label: "Ingredient Closeup", thumbnail: "https://picsum.photos/seed/fb_ff_07/400/400" },
        { id: "fb_ff_08", label: "Freezer Context", thumbnail: "https://picsum.photos/seed/fb_ff_08/400/400" },
      ],
    },
    "Apparels": {
      "Kids Wear": [
        { id: "ap_kw_01", label: "Flat Lay Pastel", thumbnail: "https://picsum.photos/seed/ap_kw_01/400/400" },
        { id: "ap_kw_02", label: "Hanger Shot", thumbnail: "https://picsum.photos/seed/ap_kw_02/400/400" },
        { id: "ap_kw_03", label: "Styled on Bed", thumbnail: "https://picsum.photos/seed/ap_kw_03/400/400" },
        { id: "ap_kw_04", label: "White Background Ghost", thumbnail: "https://picsum.photos/seed/ap_kw_04/400/400" },
        { id: "ap_kw_05", label: "Playroom Context", thumbnail: "https://picsum.photos/seed/ap_kw_05/400/400" },
        { id: "ap_kw_06", label: "Detail Closeup", thumbnail: "https://picsum.photos/seed/ap_kw_06/400/400" },
        { id: "ap_kw_07", label: "Festival Occasion", thumbnail: "https://picsum.photos/seed/ap_kw_07/400/400" },
        { id: "ap_kw_08", label: "Gifting Fold", thumbnail: "https://picsum.photos/seed/ap_kw_08/400/400" },
      ],
      "Men": [
        { id: "ap_mn_01", label: "Shirt Flat Lay", thumbnail: "https://picsum.photos/seed/ap_mn_01/400/400" },
        { id: "ap_mn_02", label: "Hanger Studio", thumbnail: "https://picsum.photos/seed/ap_mn_02/400/400" },
        { id: "ap_mn_03", label: "Ghost Mannequin", thumbnail: "https://picsum.photos/seed/ap_mn_03/400/400" },
        { id: "ap_mn_04", label: "Office Lifestyle", thumbnail: "https://picsum.photos/seed/ap_mn_04/400/400" },
        { id: "ap_mn_05", label: "Fabric Detail Closeup", thumbnail: "https://picsum.photos/seed/ap_mn_05/400/400" },
        { id: "ap_mn_06", label: "Folded Stack", thumbnail: "https://picsum.photos/seed/ap_mn_06/400/400" },
        { id: "ap_mn_07", label: "Ethnic Occasion", thumbnail: "https://picsum.photos/seed/ap_mn_07/400/400" },
        { id: "ap_mn_08", label: "Casual Outdoors", thumbnail: "https://picsum.photos/seed/ap_mn_08/400/400" },
      ],
      "Women": [
        { id: "ap_wm_01", label: "Saree Drape Studio", thumbnail: "https://picsum.photos/seed/ap_wm_01/400/400" },
        { id: "ap_wm_02", label: "Kurti Flat Lay", thumbnail: "https://picsum.photos/seed/ap_wm_02/400/400" },
        { id: "ap_wm_03", label: "Hanger Lifestyle", thumbnail: "https://picsum.photos/seed/ap_wm_03/400/400" },
        { id: "ap_wm_04", label: "Ghost Mannequin", thumbnail: "https://picsum.photos/seed/ap_wm_04/400/400" },
        { id: "ap_wm_05", label: "Festival Context", thumbnail: "https://picsum.photos/seed/ap_wm_05/400/400" },
        { id: "ap_wm_06", label: "Embroidery Closeup", thumbnail: "https://picsum.photos/seed/ap_wm_06/400/400" },
        { id: "ap_wm_07", label: "Gifting Fold", thumbnail: "https://picsum.photos/seed/ap_wm_07/400/400" },
        { id: "ap_wm_08", label: "Casual Outdoors", thumbnail: "https://picsum.photos/seed/ap_wm_08/400/400" },
      ],
      "Sustainable & Handlooms": [
        { id: "ap_sh_01", label: "Handloom Texture Hero", thumbnail: "https://picsum.photos/seed/ap_sh_01/400/400" },
        { id: "ap_sh_02", label: "Natural Props Flat Lay", thumbnail: "https://picsum.photos/seed/ap_sh_02/400/400" },
        { id: "ap_sh_03", label: "Artisan Context", thumbnail: "https://picsum.photos/seed/ap_sh_03/400/400" },
        { id: "ap_sh_04", label: "Earthy Tones Studio", thumbnail: "https://picsum.photos/seed/ap_sh_04/400/400" },
        { id: "ap_sh_05", label: "Weave Closeup", thumbnail: "https://picsum.photos/seed/ap_sh_05/400/400" },
        { id: "ap_sh_06", label: "Heritage Lifestyle", thumbnail: "https://picsum.photos/seed/ap_sh_06/400/400" },
        { id: "ap_sh_07", label: "Hanger Natural Light", thumbnail: "https://picsum.photos/seed/ap_sh_07/400/400" },
        { id: "ap_sh_08", label: "Gifting Fold", thumbnail: "https://picsum.photos/seed/ap_sh_08/400/400" },
      ],
    },
    "Footwear": {
      "Active & Casual": [
        { id: "fw_ac_01", label: "Pair Studio Hero", thumbnail: "https://picsum.photos/seed/fw_ac_01/400/400" },
        { id: "fw_ac_02", label: "Single Side Profile", thumbnail: "https://picsum.photos/seed/fw_ac_02/400/400" },
        { id: "fw_ac_03", label: "Flat Lay Top Down", thumbnail: "https://picsum.photos/seed/fw_ac_03/400/400" },
        { id: "fw_ac_04", label: "Outdoor Lifestyle", thumbnail: "https://picsum.photos/seed/fw_ac_04/400/400" },
        { id: "fw_ac_05", label: "Sole Detail", thumbnail: "https://picsum.photos/seed/fw_ac_05/400/400" },
        { id: "fw_ac_06", label: "White Background Clean", thumbnail: "https://picsum.photos/seed/fw_ac_06/400/400" },
        { id: "fw_ac_07", label: "On-foot Lifestyle", thumbnail: "https://picsum.photos/seed/fw_ac_07/400/400" },
        { id: "fw_ac_08", label: "Box and Shoe Context", thumbnail: "https://picsum.photos/seed/fw_ac_08/400/400" },
      ],
      "Heels, Flats & Loafers": [
        { id: "fw_hf_01", label: "Single Shoe Hero", thumbnail: "https://picsum.photos/seed/fw_hf_01/400/400" },
        { id: "fw_hf_02", label: "Pair Angled Studio", thumbnail: "https://picsum.photos/seed/fw_hf_02/400/400" },
        { id: "fw_hf_03", label: "Marble Surface Lifestyle", thumbnail: "https://picsum.photos/seed/fw_hf_03/400/400" },
        { id: "fw_hf_04", label: "Flat Lay with Bag", thumbnail: "https://picsum.photos/seed/fw_hf_04/400/400" },
        { id: "fw_hf_05", label: "Detail Strap Closeup", thumbnail: "https://picsum.photos/seed/fw_hf_05/400/400" },
        { id: "fw_hf_06", label: "White Background Clean", thumbnail: "https://picsum.photos/seed/fw_hf_06/400/400" },
        { id: "fw_hf_07", label: "On-foot Editorial", thumbnail: "https://picsum.photos/seed/fw_hf_07/400/400" },
        { id: "fw_hf_08", label: "Occasion Context", thumbnail: "https://picsum.photos/seed/fw_hf_08/400/400" },
      ],
      "Ethnic - Juttis & Kolhapuri": [
        { id: "fw_et_01", label: "Jutti Pair Flat Lay", thumbnail: "https://picsum.photos/seed/fw_et_01/400/400" },
        { id: "fw_et_02", label: "Embroidery Detail", thumbnail: "https://picsum.photos/seed/fw_et_02/400/400" },
        { id: "fw_et_03", label: "Heritage Context", thumbnail: "https://picsum.photos/seed/fw_et_03/400/400" },
        { id: "fw_et_04", label: "Festive Occasion", thumbnail: "https://picsum.photos/seed/fw_et_04/400/400" },
        { id: "fw_et_05", label: "Studio White Hero", thumbnail: "https://picsum.photos/seed/fw_et_05/400/400" },
        { id: "fw_et_06", label: "Wooden Surface Rustic", thumbnail: "https://picsum.photos/seed/fw_et_06/400/400" },
        { id: "fw_et_07", label: "Pair Angled Side", thumbnail: "https://picsum.photos/seed/fw_et_07/400/400" },
        { id: "fw_et_08", label: "Ethnic Outfit Context", thumbnail: "https://picsum.photos/seed/fw_et_08/400/400" },
      ],
    },
    "Handicraft & Export": {
      "Artisanal Decor": [
        { id: "hc_ad_01", label: "Hero Pedestal Shot", thumbnail: "https://picsum.photos/seed/hc_ad_01/400/400" },
        { id: "hc_ad_02", label: "Living Room Context", thumbnail: "https://picsum.photos/seed/hc_ad_02/400/400" },
        { id: "hc_ad_03", label: "Craft Detail Closeup", thumbnail: "https://picsum.photos/seed/hc_ad_03/400/400" },
        { id: "hc_ad_04", label: "Flat Lay Earthy Props", thumbnail: "https://picsum.photos/seed/hc_ad_04/400/400" },
        { id: "hc_ad_05", label: "White Background Clean", thumbnail: "https://picsum.photos/seed/hc_ad_05/400/400" },
        { id: "hc_ad_06", label: "Festival Gifting", thumbnail: "https://picsum.photos/seed/hc_ad_06/400/400" },
        { id: "hc_ad_07", label: "Artisan Hands Context", thumbnail: "https://picsum.photos/seed/hc_ad_07/400/400" },
        { id: "hc_ad_08", label: "Export Premium Dark BG", thumbnail: "https://picsum.photos/seed/hc_ad_08/400/400" },
      ],
      "Sculptures & Wall Art": [
        { id: "hc_wa_01", label: "Wall Mounted Hero", thumbnail: "https://picsum.photos/seed/hc_wa_01/400/400" },
        { id: "hc_wa_02", label: "Studio White BG", thumbnail: "https://picsum.photos/seed/hc_wa_02/400/400" },
        { id: "hc_wa_03", label: "Living Room Styled", thumbnail: "https://picsum.photos/seed/hc_wa_03/400/400" },
        { id: "hc_wa_04", label: "Detail Texture Closeup", thumbnail: "https://picsum.photos/seed/hc_wa_04/400/400" },
        { id: "hc_wa_05", label: "Flat Lay Top Down", thumbnail: "https://picsum.photos/seed/hc_wa_05/400/400" },
        { id: "hc_wa_06", label: "Dark Moody Premium", thumbnail: "https://picsum.photos/seed/hc_wa_06/400/400" },
        { id: "hc_wa_07", label: "Gifting Context", thumbnail: "https://picsum.photos/seed/hc_wa_07/400/400" },
        { id: "hc_wa_08", label: "Scale Reference Shot", thumbnail: "https://picsum.photos/seed/hc_wa_08/400/400" },
      ],
      "Ceramic & Woodware": [
        { id: "hc_cw_01", label: "Dining Table Context", thumbnail: "https://picsum.photos/seed/hc_cw_01/400/400" },
        { id: "hc_cw_02", label: "Studio White Hero", thumbnail: "https://picsum.photos/seed/hc_cw_02/400/400" },
        { id: "hc_cw_03", label: "Rustic Wood Surface", thumbnail: "https://picsum.photos/seed/hc_cw_03/400/400" },
        { id: "hc_cw_04", label: "Food Styling Context", thumbnail: "https://picsum.photos/seed/hc_cw_04/400/400" },
        { id: "hc_cw_05", label: "Craft Detail Closeup", thumbnail: "https://picsum.photos/seed/hc_cw_05/400/400" },
        { id: "hc_cw_06", label: "Flat Lay Set", thumbnail: "https://picsum.photos/seed/hc_cw_06/400/400" },
        { id: "hc_cw_07", label: "Gifting Premium", thumbnail: "https://picsum.photos/seed/hc_cw_07/400/400" },
        { id: "hc_cw_08", label: "Export Dark BG", thumbnail: "https://picsum.photos/seed/hc_cw_08/400/400" },
      ],
    },
    "Home Furnishing": {
      "Bed & Bath": [
        { id: "hf_bb_01", label: "Bed Made Up Hero", thumbnail: "https://picsum.photos/seed/hf_bb_01/400/400" },
        { id: "hf_bb_02", label: "Folded Stack Studio", thumbnail: "https://picsum.photos/seed/hf_bb_02/400/400" },
        { id: "hf_bb_03", label: "Texture Closeup", thumbnail: "https://picsum.photos/seed/hf_bb_03/400/400" },
        { id: "hf_bb_04", label: "Bathroom Towel Context", thumbnail: "https://picsum.photos/seed/hf_bb_04/400/400" },
        { id: "hf_bb_05", label: "Morning Light Lifestyle", thumbnail: "https://picsum.photos/seed/hf_bb_05/400/400" },
        { id: "hf_bb_06", label: "Flat Lay Top Down", thumbnail: "https://picsum.photos/seed/hf_bb_06/400/400" },
        { id: "hf_bb_07", label: "Gifting Fold", thumbnail: "https://picsum.photos/seed/hf_bb_07/400/400" },
        { id: "hf_bb_08", label: "White Background Clean", thumbnail: "https://picsum.photos/seed/hf_bb_08/400/400" },
      ],
      "Living Decor": [
        { id: "hf_ld_01", label: "Sofa Styled Hero", thumbnail: "https://picsum.photos/seed/hf_ld_01/400/400" },
        { id: "hf_ld_02", label: "Cushion Flat Lay", thumbnail: "https://picsum.photos/seed/hf_ld_02/400/400" },
        { id: "hf_ld_03", label: "Curtain Window Light", thumbnail: "https://picsum.photos/seed/hf_ld_03/400/400" },
        { id: "hf_ld_04", label: "Rug Room Context", thumbnail: "https://picsum.photos/seed/hf_ld_04/400/400" },
        { id: "hf_ld_05", label: "Texture Detail Closeup", thumbnail: "https://picsum.photos/seed/hf_ld_05/400/400" },
        { id: "hf_ld_06", label: "Earthy Tones Vignette", thumbnail: "https://picsum.photos/seed/hf_ld_06/400/400" },
        { id: "hf_ld_07", label: "Festival Home Styling", thumbnail: "https://picsum.photos/seed/hf_ld_07/400/400" },
        { id: "hf_ld_08", label: "White Background Clean", thumbnail: "https://picsum.photos/seed/hf_ld_08/400/400" },
      ],
      "Table Linens": [
        { id: "hf_tl_01", label: "Dining Table Set Hero", thumbnail: "https://picsum.photos/seed/hf_tl_01/400/400" },
        { id: "hf_tl_02", label: "Runner Close-up", thumbnail: "https://picsum.photos/seed/hf_tl_02/400/400" },
        { id: "hf_tl_04", label: "Mat Stack Fold", thumbnail: "https://picsum.photos/seed/hf_tl_04/400/400" },
        { id: "hf_tl_05", label: "Texture Detail", thumbnail: "https://picsum.photos/seed/hf_tl_05/400/400" },
        { id: "hf_tl_06", label: "Festive Table Context", thumbnail: "https://picsum.photos/seed/hf_tl_06/400/400" },
        { id: "hf_tl_07", label: "White Background Clean", thumbnail: "https://picsum.photos/seed/hf_tl_07/400/400" },
        { id: "hf_tl_08", label: "Earthy Rustic Setup", thumbnail: "https://picsum.photos/seed/hf_tl_08/400/400" },
      ],
    },
    "Jewellery": {
      "Ethnic & Traditional": [
        { id: "jw_et_01", label: "Flat Lay Velvet Base", thumbnail: "https://picsum.photos/seed/jw_et_01/400/400" },
        { id: "jw_et_02", label: "Close-up Detail Hero", thumbnail: "https://picsum.photos/seed/jw_et_02/400/400" },
        { id: "jw_et_03", label: "Festive Outfit Context", thumbnail: "https://picsum.photos/seed/jw_et_03/400/400" },
        { id: "jw_et_04", label: "Jewellery Box Styled", thumbnail: "https://picsum.photos/seed/jw_et_04/400/400" },
        { id: "jw_et_05", label: "White Background Clean", thumbnail: "https://picsum.photos/seed/jw_et_05/400/400" },
        { id: "jw_et_06", label: "On-model Closeup", thumbnail: "https://picsum.photos/seed/jw_et_06/400/400" },
        { id: "jw_et_07", label: "Marble Surface Hero", thumbnail: "https://picsum.photos/seed/jw_et_07/400/400" },
        { id: "jw_et_08", label: "Gifting Premium Dark", thumbnail: "https://picsum.photos/seed/jw_et_08/400/400" },
      ],
      "Western Pieces": [
        { id: "jw_wp_01", label: "Minimalist Flat Lay", thumbnail: "https://picsum.photos/seed/jw_wp_01/400/400" },
        { id: "jw_wp_02", label: "Close-up Detail Hero", thumbnail: "https://picsum.photos/seed/jw_wp_02/400/400" },
        { id: "jw_wp_03", label: "Dark Moody Studio", thumbnail: "https://picsum.photos/seed/jw_wp_03/400/400" },
        { id: "jw_wp_04", label: "On-model Lifestyle", thumbnail: "https://picsum.photos/seed/jw_wp_04/400/400" },
        { id: "jw_wp_05", label: "White Background Clean", thumbnail: "https://picsum.photos/seed/jw_wp_05/400/400" },
        { id: "jw_wp_06", label: "Marble Surface Minimal", thumbnail: "https://picsum.photos/seed/jw_wp_06/400/400" },
        { id: "jw_wp_07", label: "Gifting Box Context", thumbnail: "https://picsum.photos/seed/jw_wp_07/400/400" },
        { id: "jw_wp_08", label: "Editorial Dark BG", thumbnail: "https://picsum.photos/seed/jw_wp_08/400/400" },
      ],
    },
  };


const CARD = 'rounded-2xl border border-white/10 bg-white/[0.03] p-6';
const INPUT = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#9db8ff]';
const SELECT = `${INPUT} [&>option]:bg-[#071a2f] [&>option]:text-white`;

function StepIndicator({ active }) {
  const steps = [
    { n: 1, label: 'Product Info' },
    { n: 2, label: 'Upload & Settings' },
    { n: 3, label: 'Generate' },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                active === step.n
                  ? 'bg-[#9db8ff] text-black'
                  : active > step.n
                  ? 'bg-[#9db8ff]/30 text-[#9db8ff]'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              {active > step.n ? '✓' : step.n}
            </div>
            <span className={`text-[10px] font-medium whitespace-nowrap ${active === step.n ? 'text-[#9db8ff]' : 'text-white/40'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-2 mb-4 h-px w-10 ${active > step.n ? 'bg-[#9db8ff]' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Generator() {
  const VARIANTS = ['white_background', 'professional', 'with_model', 'with_box'];
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [category, setCategory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState([]);
  const [finalizedVariants, setFinalizedVariants] = useState({});
  const [finalizingVariants, setFinalizingVariants] = useState(new Set());
  const [rerollingVariants, setRerollingVariants] = useState({});
  const [finalizeErrors, setFinalizeErrors] = useState({});
  const [mode, setMode] = useState('create');
  const [selectedTemplates, setSelectedTemplates] = useState({
    with_model: [],
    with_box: [],
    on_stand: [],
    white_background: [],
  });
  const [platform, setPlatform] = useState('');
  const [size, setSize] = useState('');
  const [description, setDescription] = useState('');
  const [productName, setProductName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandWebsite, setBrandWebsite] = useState('');
  const [scratchMode, setScratchMode] = useState(false);

  const activeTemplates = (industry && category)
    ? TEMPLATE_CATALOGUE[industry]?.[category] ?? []
    : [];

  async function handleGenerate() {
    if (!uploadedImageUrl) return;

    setIsGenerating(true);
    setErrorMessage('');
    setResults([]);
    setFinalizedVariants({});
    setFinalizingVariants(new Set());
    setRerollingVariants({});
    setFinalizeErrors({});

    try {
      const settled = await Promise.all(
        VARIANTS.map((v) => generateVariant(v, uploadedImageUrl, category, {
          productName,
          brandName,
          brandWebsite,
          description,
          industry,
          category,
          scratchMode,
          selectedTemplates: selectedTemplates['main'] || []
        }))
      );
      setResults(settled);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleFinalize(variant) {
    setFinalizeErrors((current) => {
      const next = { ...current };
      delete next[variant];
      return next;
    });
    setFinalizingVariants((current) => new Set(current).add(variant));

    try {
      const result = await generateVariant(variant, uploadedImageUrl, category, { finalPass: true });
      if (!result.success) throw new Error(result.error || 'Failed to finalize variant');
      setFinalizedVariants((current) => ({
        ...current,
        [variant]: { outputUrl: result.outputUrl, metadata: result.metadata },
      }));
    } catch (error) {
      setFinalizeErrors((current) => ({ ...current, [variant]: error.message }));
    } finally {
      setFinalizingVariants((current) => {
        const next = new Set(current);
        next.delete(variant);
        return next;
      });
    }
  }

  async function handleReroll(variant) {
    setFinalizeErrors((current) => {
      const next = { ...current };
      delete next[variant];
      return next;
    });
    setFinalizedVariants((current) => {
      const next = { ...current };
      delete next[variant];
      return next;
    });
    setRerollingVariants((current) => ({ ...current, [variant]: true }));

    try {
      const result = await generateVariant(variant, uploadedImageUrl, category, { finalPass: false });
      if (!result.success) throw new Error(result.error || 'Failed to re-roll variant');
      setResults((current) =>
        current.map((item) => (item.variant === variant ? result : item))
      );
    } catch (error) {
      setFinalizeErrors((current) => ({ ...current, [variant]: error.message }));
    } finally {
      setRerollingVariants((current) => {
        const next = { ...current };
        delete next[variant];
        return next;
      });
    }
  }


  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-[#050814] via-[#071a2f] to-[#050814] text-white">
      {/* Top Nav Bar */}
      <div className="flex flex-none items-center justify-between border-b border-white/10 px-6 py-4 lg:px-12">
        <div className="text-lg font-semibold">ContentPro</div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setMode('create')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              mode === 'create' ? 'bg-[#9db8ff] text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              mode === 'batch' ? 'bg-[#9db8ff] text-black' : 'text-white/70 hover:text-white'
            }`}
          >
            Batch Run
          </button>
        </div>
        <div className="text-sm text-white/70">
          Credits: <span className="font-medium text-white">24</span>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT COLUMN */}
        <div className="flex-1 overflow-y-auto px-8 py-8 lg:px-12">
          {results.length > 0 ? (
            /* Results view */
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setResults([])}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  ← Back
                </button>
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.02em]">Generated Images</h1>
                  <p className="text-sm text-white/50">Your product variations</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {results.map((result) => {
                  const finalizedResult = finalizedVariants[result.variant];
                  const isFinalizing = finalizingVariants.has(result.variant);
                  const isRerolling = Boolean(rerollingVariants[result.variant]);
                  const cardError = finalizeErrors[result.variant];
                  const outputUrl = finalizedResult?.outputUrl || result.outputUrl;
                  return (
                    <div key={result.variant} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium capitalize text-white">{result.variant.replace(/_/g, ' ')}</p>
                        {finalizedResult && (
                          <span className="rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400">✓ Finalized</span>
                        )}
                      </div>
                      {result.success ? (
                        <>
                          <div className="relative">
                            <img src={outputUrl} alt={result.variant} className="aspect-square w-full rounded-xl object-cover" />
                            {(isFinalizing || isRerolling) && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/70 text-sm font-medium text-white">
                                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                <span>{isFinalizing ? 'Finalizing...' : 'Re-rolling...'}</span>
                              </div>
                            )}
                          </div>
                          {cardError && <p className="text-sm text-red-400">{cardError}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleReroll(result.variant)}
                              disabled={isRerolling || isFinalizing}
                              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/30"
                            >
                              Re-roll
                            </button>
                            {!finalizedResult && (
                              <button
                                type="button"
                                onClick={() => handleFinalize(result.variant)}
                                disabled={isFinalizing || isRerolling}
                                className="flex-1 rounded-lg bg-[#9db8ff] px-4 py-2 text-sm font-medium text-black transition-all hover:bg-[#8da7ef] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
                              >
                                Finalize
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-red-400">{result.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Form view */
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] lg:text-4xl">
                  Generate A+ Images
                </h1>
                <p className="mt-2 text-base text-white/60">Enter your product details to get started</p>
              </div>

              <StepIndicator active={!uploadedImageUrl ? 1 : ((selectedTemplates['main'] || []).length < 8 ? 2 : 3)} />

              {/* Step 1 card: Brand + Product + KYC */}
              <div className={CARD}>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Brand Details</p>
                      <h3 className="mt-1 text-base font-semibold">Tell us about your brand</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input type="text" placeholder="Brand Name" value={brandName} onChange={e => setBrandName(e.target.value)} className={INPUT} />
                      <input type="text" placeholder="Brand Website" value={brandWebsite} onChange={e => setBrandWebsite(e.target.value)} className={INPUT} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Product Details</p>
                      <h3 className="mt-1 text-base font-semibold">Describe your product</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <input type="text" placeholder="Product Name" value={productName} onChange={e => setProductName(e.target.value)} className={INPUT} />
                      <select
                        value={industry}
                        onChange={e => { setIndustry(e.target.value); setCategory(''); }}
                        className={SELECT}
                      >
                        <option value="">Select Industry</option>
                        {Object.keys(TEMPLATE_CATALOGUE).map((ind) => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <select
                        onChange={e => setCategory(e.target.value)}
                        className={SELECT}
                        disabled={!industry}
                      >
                        <option value="">Select Category</option>
                        {industry && Object.keys(TEMPLATE_CATALOGUE[industry]).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button className="w-full rounded-xl bg-[#9db8ff] py-3 font-semibold text-black transition hover:bg-white">
                    Generate KYC
                  </button>
                </div>
              </div>

              {/* Step 2 card: Dimensions + Upload + Description */}
              <div className={CARD}>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Product Dimensions (Optional)</p>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <select className={SELECT}>
                        <option>cm</option>
                        <option>in</option>
                        <option>m</option>
                      </select>
                      <input type="number" placeholder="Length" className={INPUT} />
                      <input type="number" placeholder="Breadth" className={INPUT} />
                      <input type="number" placeholder="Height" className={INPUT} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Upload Product Image</p>
                    <UploadBox onUploadComplete={setUploadedImageUrl} />
                    {uploadedImageUrl && <p className="break-all text-xs text-white/40">{uploadedImageUrl}</p>}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Short Product Description (Optional)</p>
                    <textarea
                      rows="3"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your product..."
                      className={INPUT}
                    />
                  </div>
                </div>
              </div>

              {/* Step 3 card: Output Settings + Generate */}
              <div className={CARD}>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Output Settings</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={SELECT}>
                        <option value="">Select Platform</option>
                        <option value="amazon">Amazon</option>
                        <option value="instagram">Instagram</option>
                        <option value="shopify">Shopify</option>
                      </select>
                      <select value={size} onChange={(e) => setSize(e.target.value)} className={SELECT}>
                        <option value="">Select Size</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="4:5">4:5 (Portrait)</option>
                        <option value="16:9">16:9 (Landscape)</option>
                      </select>
                    </div>
                  </div>

                  {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={
                      isGenerating ||
                      !uploadedImageUrl ||
                      (!scratchMode && (!selectedTemplates['main'] || selectedTemplates['main'].length === 0))
                    }
                    className="w-full rounded-xl bg-[#9db8ff] px-6 py-3.5 text-sm font-semibold text-black transition-all hover:bg-[#8da7ef] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                  >
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Template Library */}
        <div className="relative flex w-[52%] flex-col border-l border-white/10">
          <div className="flex-1 overflow-y-auto px-8 py-8 pb-28 lg:px-10">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Template Library</p>
              <h3 className="mt-1 text-base font-semibold">Choose your styles</h3>
              <p className="mt-1 text-sm text-white/40">Select templates for generation</p>
            </div>
            {activeTemplates.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {activeTemplates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplates(prev => {
                        const current = prev['main'] || [];
                        const exists = current.find(t => t.id === template.id);
                        return {
                          ...prev,
                          main: exists
                            ? current.filter(t => t.id !== template.id)
                            : [...current, template]
                        };
                      });
                    }}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      (selectedTemplates['main'] || []).find(t => t.id === template.id)
                        ? 'border-blue-500 ring-2 ring-blue-500'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={template.thumbnail}
                      alt={template.label}
                      className="w-full aspect-square object-cover"
                    />
                    <p className="text-xs text-center p-1 truncate">{template.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-white/40 text-sm">
                {industry && category
                  ? 'No templates found.'
                  : 'Select an industry and category to see templates.'}
              </div>
            )}
            <button
              onClick={() => { setScratchMode(prev => !prev); setSelectedTemplates({}); }}
              className={`mt-3 w-full text-sm py-2 rounded-lg border transition-all ${
                scratchMode
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
              }`}
            >
              {scratchMode ? '✓ Generating from Scratch' : '+ Generate from Scratch (skip templates)'}
            </button>
          </div>

          {/* Sticky bottom bar */}
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-12 bg-gradient-to-t from-[#050814] to-transparent" />
            <div className="border-t border-white/10 bg-[#050814]/95 px-8 py-4 backdrop-blur-sm lg:px-10">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-white/50">
                  <span className="font-semibold text-white">{(selectedTemplates['main'] || []).length}</span>/8 templates selected
                </span>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={
                    isGenerating ||
                    !uploadedImageUrl ||
                    (!scratchMode && (!selectedTemplates['main'] || selectedTemplates['main'].length === 0))
                  }
                  className="rounded-xl bg-[#9db8ff] px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-[#8da7ef] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button> 
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
