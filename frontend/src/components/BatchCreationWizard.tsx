import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, Play, RefreshCw, Upload, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProductFormData } from "./CreationWizard";

type BatchMode = "images" | "video";

type BatchRowInput = {
  brandName: string;
  brandWebsite: string;
  productName: string;
  productCategory: string;
  productDescription: string;
  socialLinkInstagram: string;
  socialLinkFacebook: string;
  socialLinkLinkedin: string;
  socialLinkX: string;
  imageLink: string;
  additionalInfo: Record<string, string>;
};

type BatchJob = BatchRowInput & {
  id: string;
  rowNumber: number;
  errors: string[];
  rawValues: Record<string, string>;
};

type BatchJobRunPayload = {
  id: string;
  mode: BatchMode;
  productData: ProductFormData;
};

const TEMPLATE_HEADERS = [
  "image link",
  "brand name",
  "brand website",
  "product name",
  "product category",
  "short description",
  "instagram",
  "facebook",
  "linkedin",
  "x",
] as const;

const CORE_FIELDS = [
  "brandName",
  "brandWebsite",
  "productName",
  "productCategory",
  "productDescription",
  "socialLinkInstagram",
  "socialLinkFacebook",
  "socialLinkLinkedin",
  "socialLinkX",
  "imageLink",
];

function normalizeHeaderKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");
}

function safeString(v: unknown) {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v).trim();
  if (typeof v === "boolean") return String(v).trim();
  return "";
}

function toTemplateCsv() {
  const rows = [TEMPLATE_HEADERS.join(",")];
  rows.push(
    [
      "https://drive.google.com/file/d/...",
      "Tatsya",
      "https://tatsya.com",
      "Premium Marble Cake Stand",
      "Kitchen & Dining",
      "Short product description (optional)",
      "https://instagram.com/tatsya",
      "",
      "",
      "",
    ].join(","),
  );
  return rows.join("\n");
}

async function readFileAsArrayBuffer(file: File) {
  return await file.arrayBuffer();
}

async function parseCsv(file: File): Promise<Record<string, unknown>[]> {
  const text = await file.text();
  return await new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h?.trim?.() ?? h,
      complete: (result) => {
        if (result.errors?.length) {
          reject(new Error(result.errors[0]?.message || "Failed to parse CSV"));
          return;
        }
        resolve(result.data ?? []);
      },
      error: (err) => reject(err),
    });
  });
}

async function parseXlsx(file: File): Promise<Record<string, unknown>[]> {
  const buf = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(buf, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

function parseRecordsToJobs(records: Record<string, unknown>[]): BatchJob[] {
  const keyMap: Record<string, keyof Omit<BatchRowInput, "additionalInfo">> = {
    brandname: "brandName",
    brand: "brandName",
    brandwebsite: "brandWebsite",
    website: "brandWebsite",
    productname: "productName",
    product: "productName",
    productcategory: "productCategory",
    category: "productCategory",
    shortdescription: "productDescription",
    description: "productDescription",
    instagram: "socialLinkInstagram",
    sociallinkinstagram: "socialLinkInstagram",
    facebook: "socialLinkFacebook",
    sociallinkfacebook: "socialLinkFacebook",
    linkedin: "socialLinkLinkedin",
    sociallinklinkedin: "socialLinkLinkedin",
    x: "socialLinkX",
    twitter: "socialLinkX",
    sociallinkx: "socialLinkX",
    imagelink: "imageLink",
    image: "imageLink",
  };

  const jobs: BatchJob[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i] ?? {};

    const initial: BatchRowInput = {
      brandName: "",
      brandWebsite: "",
      productName: "",
      productCategory: "",
      productDescription: "",
      socialLinkInstagram: "",
      socialLinkFacebook: "",
      socialLinkLinkedin: "",
      socialLinkX: "",
      imageLink: "",
      additionalInfo: {},
    };
    const rawValues: Record<string, string> = {};

    for (const [rawKey, rawValue] of Object.entries(rec)) {
      rawValues[rawKey] = safeString(rawValue);
      const normalized = normalizeHeaderKey(rawKey);
      const target = keyMap[normalized];
      if (target) {
        initial[target] = safeString(rawValue);
      } else {
        // Any column that doesn't match a core field is additional info
        initial.additionalInfo[rawKey] = safeString(rawValue);
      }
    }

    const errors: string[] = [];
    if (!initial.brandName) errors.push("Missing brand name");
    if (!initial.brandWebsite) errors.push("Missing brand website");
    if (!initial.productName) errors.push("Missing product name");
    if (!initial.productCategory) errors.push("Missing product category");
    if (!initial.imageLink) errors.push("Missing image link");

    const isAllBlank =
      !initial.brandName &&
      !initial.brandWebsite &&
      !initial.productName &&
      !initial.productCategory &&
      !initial.productDescription &&
      !initial.socialLinkInstagram &&
      !initial.socialLinkFacebook &&
      !initial.socialLinkLinkedin &&
      !initial.socialLinkX &&
      !initial.imageLink &&
      Object.keys(initial.additionalInfo).length === 0;

    if (isAllBlank) continue;

    jobs.push({
      ...initial,
      id: `row-${i + 1}-${Date.now()}`,
      rowNumber: i + 1,
      errors,
      rawValues,
    });
  }

  return jobs;
}

export default function BatchCreationWizard({
  mode,
  onBack,
}: {
  mode: BatchMode;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isRunning = false;

  const validJobs = useMemo(() => jobs.filter((j) => j.errors.length === 0), [jobs]);
  const invalidCount = useMemo(() => jobs.filter((j) => j.errors.length > 0).length, [jobs]);

  const selectedJobs = useMemo(
    () => validJobs.filter((j) => selectedIds.has(j.id)),
    [selectedIds, validJobs],
  );

  const allValidSelected = validJobs.length > 0 && selectedIds.size === validJobs.length;
  const anySelected = selectedIds.size > 0;

  const resetAll = () => {
    setFileName(null);
    setParseError(null);
    setJobs([]);
    setColumnHeaders([]);
    setSelectedIds(new Set());
    if (inputRef.current) inputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csv = toTemplateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contentpro_batch_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(validJobs.map((j) => j.id)));
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setSelectedIds(new Set());

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const records =
        ext === "csv" ? await parseCsv(file) : ext === "xlsx" || ext === "xls" ? await parseXlsx(file) : null;

      if (!records) {
        throw new Error("Unsupported file type. Please upload a .csv or .xlsx file.");
      }

      const parsedJobs = parseRecordsToJobs(records);
      const headers = Array.from(
        records.reduce((acc, record) => {
          Object.keys(record).forEach((key) => {
            if (key.trim()) acc.add(key);
          });
          return acc;
        }, new Set<string>()),
      );
      if (parsedJobs.length === 0) {
        throw new Error("No valid rows found. Make sure the first sheet has headers and at least one row.");
      }

      setFileName(file.name);
      setJobs(parsedJobs);
      setColumnHeaders(headers);
      setSelectedIds(new Set(parsedJobs.filter((j) => j.errors.length === 0).map((j) => j.id)));
    } catch (e) {
      setFileName(file.name);
      setJobs([]);
      setColumnHeaders([]);
      setSelectedIds(new Set());
      setParseError(e instanceof Error ? e.message : "Failed to parse file");
    }
  };

  const runBatch = async () => {
    if (selectedJobs.length === 0) return;

    const payload: BatchJobRunPayload[] = selectedJobs.map((j) => {
      const productData: ProductFormData = {
        brandName: j.brandName,
        brandWebsite: j.brandWebsite,
        productName: j.productName,
        productCategory: j.productCategory,
        socialLinkInstagram: j.socialLinkInstagram,
        socialLinkFacebook: j.socialLinkFacebook,
        socialLinkLinkedin: j.socialLinkLinkedin,
        socialLinkX: j.socialLinkX,
        dimensionUnit: "cm",
        dimensionLength: "",
        dimensionBreadth: "",
        dimensionHeight: "",
        productDescription: j.productDescription,
        productImages: [j.imageLink],
        additionalInfo: j.additionalInfo,
      };

      return {
        id: j.id,
        mode,
        productData,
      };
    });

    navigate("/batch-run", {
      state: {
        mode,
        jobs: payload,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-display text-2xl md:text-3xl font-bold">
            {mode === "images" ? "Batch: Generate A+ Images" : "Batch: Generate Video"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload a CSV/XLSX, review rows, select jobs, and run generation on the batch.
          </p>
        </div>
      </div>

      {/* Upload box */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Upload batch file
            </p>
            <p className="text-xs text-muted-foreground">
              The first row must be headers. Supported formats: <span className="font-medium">.csv</span>,{" "}
              <span className="font-medium">.xlsx</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {jobs.length > 0 && (
              <button
                onClick={resetAll}
                disabled={isRunning}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4" /> Choose file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
              className="hidden"
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Expected columns (case/spacing tolerant):{" "}
          <span className="font-medium text-foreground/90">{TEMPLATE_HEADERS.join(", ")}</span>
        </div>

        {fileName && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/40 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {jobs.length > 0 ? (
                  <>
                    {jobs.length} rows parsed ·{" "}
                    <span className="text-primary font-medium">{validJobs.length} valid</span>
                    {invalidCount > 0 && (
                      <>
                        {" "}
                        · <span className="text-destructive font-medium">{invalidCount} invalid</span>
                      </>
                    )}
                  </>
                ) : (
                  "No rows parsed"
                )}
              </p>
            </div>
            <button
              onClick={resetAll}
              disabled={isRunning}
              className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Clear file"
              title="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {parseError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {parseError}
          </div>
        )}
      </div>

      {/* Row preview */}
      {jobs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Jobs</p>
              <p className="text-xs text-muted-foreground">
                Select which rows to run. Invalid rows are excluded automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={runBatch}
                disabled={!anySelected}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Play className="h-4 w-4" /> Run batch ({selectedJobs.length})
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <div
                className="grid gap-0 min-w-max"
                style={{
                  gridTemplateColumns: `42px 72px repeat(${columnHeaders.length}, minmax(220px, 1fr)) minmax(260px, 1.2fr)`,
                }}
              >
                <div className="contents bg-secondary/50 text-xs font-medium text-muted-foreground">
                  <div className="p-3 flex items-center justify-center">
                    <Checkbox
                      checked={allValidSelected}
                      onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                      aria-label="Select all valid rows"
                    />
                  </div>
                  <div className="p-3">Row</div>
                  {columnHeaders.map((header) => (
                    <div key={header} className="p-3 whitespace-nowrap">
                      {header}
                    </div>
                  ))}
                  <div className="p-3">Validation</div>
                </div>

                <div className="divide-y divide-border">
                  {jobs.map((j) => {
                    const isValid = j.errors.length === 0;
                    const isChecked = selectedIds.has(j.id);
                    return (
                      <div
                        key={j.id}
                        className={`grid gap-0 text-sm ${
                          isValid ? "bg-card" : "bg-destructive/5"
                        }`}
                        style={{
                          gridTemplateColumns: `42px 72px repeat(${columnHeaders.length}, minmax(220px, 1fr)) minmax(260px, 1.2fr)`,
                        }}
                      >
                        <div className="p-3 flex items-start justify-center">
                          <Checkbox
                            disabled={!isValid}
                            checked={isChecked}
                            onCheckedChange={(v) => toggleSelect(j.id, Boolean(v))}
                            aria-label={`Select row ${j.rowNumber}`}
                          />
                        </div>
                        <div className="p-3 text-xs text-muted-foreground">{j.rowNumber}</div>
                        {columnHeaders.map((header) => {
                          const value = j.rawValues[header] ?? "";
                          const maybeUrl = /^https?:\/\//i.test(value);
                          return (
                            <div key={`${j.id}-${header}`} className="p-3">
                              {value ? (
                                maybeUrl ? (
                                  <a
                                    href={value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline break-all block"
                                    title={value}
                                  >
                                    {value}
                                  </a>
                                ) : (
                                  <p className="text-sm break-words">{value}</p>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          );
                        })}
                        <div className="p-3">
                          {j.errors.length > 0 ? (
                            <p className="text-xs text-destructive break-words">{j.errors.join(" · ")}</p>
                          ) : (
                            <span className="text-xs text-primary">Ready</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
