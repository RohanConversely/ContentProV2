import { motion } from "framer-motion";
import { Building2, Globe, Instagram, Facebook, Linkedin, Twitter, Hash, Tags } from "lucide-react";

export const industries = [
  { id: "fashion", label: "Fashion & Apparel", emoji: "👗" },
  { id: "electronics", label: "Electronics & Tech", emoji: "💻" },
  { id: "beauty", label: "Beauty & Skincare", emoji: "💄" },
  { id: "food", label: "Food & Beverage", emoji: "🍽️" },
  { id: "home", label: "Home & Living", emoji: "🏡" },
  { id: "sports", label: "Sports & Fitness", emoji: "🏋️" },
  { id: "jewelry", label: "Jewelry & Accessories", emoji: "💎" },
  { id: "health", label: "Health & Wellness", emoji: "🌿" },
];

export interface ClientKycData {
  companyName: string;
  website: string;
  industry: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  twitter: string;
  productCategory: string;
}

interface ClientKycStepProps {
  data: ClientKycData;
  onChange: (data: ClientKycData) => void;
}

const ClientKycStep = ({ data, onChange }: ClientKycStepProps) => {
  const update = (field: keyof ClientKycData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-xl font-semibold mb-1">Client & Product Info</h3>
        <p className="text-sm text-muted-foreground">
          Tell us about the brand so we can tailor imagery to match
        </p>
      </div>

      {/* Company Name & Website */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Company / Brand Name
          </label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="e.g., Tatsya Home"
            maxLength={100}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Website URL
          </label>
          <input
            type="url"
            value={data.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://example.com"
            maxLength={255}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Product Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Tags className="h-4 w-4 text-primary" />
          Product Category
        </label>
        <input
          type="text"
          value={data.productCategory}
          onChange={(e) => update("productCategory", e.target.value)}
          placeholder="e.g., Premium Kitchenware, Organic Skincare"
          maxLength={150}
          className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
        />
      </div>

      {/* Industry */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          Industry
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {industries.map((ind, i) => (
            <motion.button
              key={ind.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              type="button"
              onClick={() => update("industry", ind.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all duration-200 ${
                data.industry === ind.id
                  ? "border-primary bg-primary/10 shadow-glow font-medium"
                  : "border-border bg-card hover:border-primary/30 hover:bg-secondary"
              }`}
            >
              <span>{ind.emoji}</span>
              <span className="truncate">{ind.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Social Media Links</label>
        <p className="text-xs text-muted-foreground -mt-1">Optional — helps us match your brand identity</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: "instagram" as const, icon: Instagram, placeholder: "https://instagram.com/brand" },
            { key: "facebook" as const, icon: Facebook, placeholder: "https://facebook.com/brand" },
            { key: "linkedin" as const, icon: Linkedin, placeholder: "https://linkedin.com/company/brand" },
            { key: "twitter" as const, icon: Twitter, placeholder: "https://x.com/brand" },
          ].map(({ key, icon: Icon, placeholder }) => (
            <div key={key} className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="url"
                value={data[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                maxLength={255}
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientKycStep;
