import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, Play, RefreshCw, Upload, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProductFormData } from "./CreationWizard";
import { getPromptCatalog, getPromptIndustries } from "@/lib/api";
import { writeActiveBatchRun } from "@/lib/active-runs";
import { setTransientBatchFiles } from "@/lib/batch-transient-files";
import { useAuth } from "@/contexts/AuthContext";
import { industries } from "@/lib/industries";
import sampleSheetUrl from "../../sample.xlsx?url";
import styleSampleSheetUrl from "../../style_sample.xlsx?url";

const industryLabelMap = new Map<string, string>(industries.map((item) => [item.id, item.label]));

const formatIndustryLabel = (industryId: string): string =>
  industryId
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

type BatchMode = "images" | "video";
type BatchSourceType = "image_link" | "drive_folder" | "folder_upload";

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
  styleNumber: string;
  imageLink: string;
  additionalInfo: Record<string, string>;
};

type BatchJob = BatchRowInput & {
  id: string;
  rowNumber: number;
  errors: string[];
  rawValues: Record<string, string>;
  folderFiles?: File[];
};

type BatchJobRunPayload = {
  id: string;
  mode: BatchMode;
  sourceType: BatchSourceType;
  productData: ProductFormData;
  folderUploadKey?: string;
  batch_id?: string;
  batch_name?: string;
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
  "style no.",
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
  "styleNumber",
  "imageLink",
];

const STYLE_NO_NORMALIZED_HEADERS = new Set(["styleno", "stylenumber"]);

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
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const headers: string[] = [];

  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
    const cell = sheet[cellAddress] as XLSX.CellObject | undefined;
    headers.push(safeString(cell?.v));
  }

  const records: Record<string, unknown>[] = [];
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const record: Record<string, unknown> = {};
    let hasValue = false;

    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const header = headers[col - range.s.c];
      if (!header) continue;

      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress] as (XLSX.CellObject & { l?: { Target?: string } }) | undefined;
      const hyperlinkTarget = cell?.l?.Target;
      const value = hyperlinkTarget ?? safeString(cell?.v);
      record[header] = value;
      if (safeString(value).length > 0) {
        hasValue = true;
      }
    }

    if (hasValue) {
      records.push(record);
    }
  }

  return records;
}

function parseRecordsToJobs(records: Record<string, unknown>[], requireStyleNumber: boolean): BatchJob[] {
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
    styleno: "styleNumber",
    stylenumber: "styleNumber",
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
      styleNumber: "",
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
    if (requireStyleNumber && !initial.styleNumber) errors.push("Missing style no.");

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
      !initial.styleNumber &&
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

function getWebkitRelativePath(file: File): string {
  const withRelativePath = file as File & { webkitRelativePath?: string };
  return (withRelativePath.webkitRelativePath ?? file.name).trim();
}

function buildFolderUploadJobs(
  files: File[],
  defaults: { brandName: string; brandWebsite: string; productCategory: string },
): BatchJob[] {
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length === 0) {
    return [];
  }

  const fileEntries = imageFiles.map((file) => {
    const relativePath = getWebkitRelativePath(file);
    const segments = relativePath.split("/").filter(Boolean);
    return { file, relativePath, segments };
  });

  const hasSubfolders = fileEntries.some(({ segments }) => segments.length >= 3);
  const jobs: BatchJob[] = [];

  if (hasSubfolders) {
    const grouped = new Map<string, File[]>();
    fileEntries.forEach(({ file, segments }) => {
      if (segments.length < 3) {
        return;
      }
      const groupName = segments[1];
      const existing = grouped.get(groupName) ?? [];
      existing.push(file);
      grouped.set(groupName, existing);
    });

    let rowNumber = 1;
    Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([groupName, groupFiles]) => {
        const pickedFiles = [...groupFiles].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5);
        jobs.push({
          id: `folder-${rowNumber}-${Date.now()}`,
          rowNumber,
          brandName: defaults.brandName,
          brandWebsite: defaults.brandWebsite,
          productName: groupName,
          productCategory: defaults.productCategory,
          productDescription: "",
          socialLinkInstagram: "",
          socialLinkFacebook: "",
          socialLinkLinkedin: "",
          socialLinkX: "",
          styleNumber: "",
          imageLink: groupName,
          additionalInfo: {
            folder_upload_group: groupName,
          },
          errors: pickedFiles.length === 0 ? ["No valid images found in this subfolder"] : [],
          rawValues: {
            "folder name": groupName,
            "images picked": String(pickedFiles.length),
          },
          folderFiles: pickedFiles,
        });
        rowNumber += 1;
      });
    return jobs;
  }

  const sortedFiles = [...imageFiles].sort((a, b) => a.name.localeCompare(b.name));
  return sortedFiles.map((file, index) => ({
    id: `folder-${index + 1}-${Date.now()}`,
    rowNumber: index + 1,
    brandName: defaults.brandName,
    brandWebsite: defaults.brandWebsite,
    productName: file.name,
    productCategory: defaults.productCategory,
    productDescription: "",
    socialLinkInstagram: "",
    socialLinkFacebook: "",
    socialLinkLinkedin: "",
    socialLinkX: "",
    styleNumber: "",
    imageLink: file.name,
    additionalInfo: {
      folder_upload_group: file.name,
    },
    errors: [],
    rawValues: {
      "image file": file.name,
      "images picked": "1",
    },
    folderFiles: [file],
  }));
}

export default function BatchCreationWizard({
  mode,
  onBack,
}: {
  mode: BatchMode;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sourceType, setSourceType] = useState<BatchSourceType>("image_link");
  const [requestedImageCount, setRequestedImageCount] = useState(4);
  const [addStyleNumber, setAddStyleNumber] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(user?.industry ?? "jewelry");
  const [industryOptions, setIndustryOptions] = useState<{ id: string; label: string }[]>([]);
  const [jobThumbnailUrls, setJobThumbnailUrls] = useState<Record<string, string>>({});
  const [selectedPromptCategory, setSelectedPromptCategory] = useState("default");
  const [selectedShotKeys, setSelectedShotKeys] = useState<string[]>([]);
  const [promptCategories, setPromptCategories] = useState<
    { category_key: string; category_label: string; shot_prompts: { key: string; label: string; prompt: string }[] }[]
  >([]);
  const isRunning = false;

  useEffect(() => {
    void (async () => {
      try {
        const availableIndustries = await getPromptIndustries();
        if (!availableIndustries.length) {
          setIndustryOptions([]);
          return;
        }

        const nextOptions = availableIndustries.map((industryId) => ({
          id: industryId,
          label: industryLabelMap.get(industryId) ?? formatIndustryLabel(industryId),
        }));
        setIndustryOptions(nextOptions);

        const nextIndustry =
          nextOptions.find((item) => item.id === selectedIndustry)?.id ??
          nextOptions.find((item) => item.id === (user?.industry ?? ""))?.id ??
          nextOptions[0]?.id ??
          "";
        if (nextIndustry && nextIndustry !== selectedIndustry) {
          setSelectedIndustry(nextIndustry);
        }
      } catch {
        setIndustryOptions([]);
      }
    })();
  }, [selectedIndustry, user?.industry]);

  useEffect(() => {
    void (async () => {
      try {
        const catalog = await getPromptCatalog(selectedIndustry);
        const categories = catalog.categories ?? [];
        setPromptCategories(categories);
        const nextCategory = categories.find((item) => item.category_key === selectedPromptCategory)
          ? selectedPromptCategory
          : categories[0]?.category_key ?? "default";
        setSelectedPromptCategory(nextCategory);
        const category = categories.find((item) => item.category_key === nextCategory);
        const nextShots = (category?.shot_prompts ?? []).slice(0, requestedImageCount).map((item) => item.key);
        setSelectedShotKeys(nextShots);
      } catch {
        setPromptCategories([]);
      }
    })();
  }, [selectedIndustry]);

  useEffect(() => {
    if (!folderInputRef.current) return;
    folderInputRef.current.setAttribute("webkitdirectory", "");
    folderInputRef.current.setAttribute("directory", "");
  }, []);

  const validJobs = useMemo(() => jobs.filter((j) => j.errors.length === 0), [jobs]);
  const invalidCount = useMemo(() => jobs.filter((j) => j.errors.length > 0).length, [jobs]);

  const selectedJobs = useMemo(
    () => validJobs.filter((j) => selectedIds.has(j.id)),
    [selectedIds, validJobs],
  );

  const showFolderThumbnails = useMemo(
    () =>
      sourceType === "folder_upload" &&
      jobs.length > 0 &&
      jobs.every((job) => (job.folderFiles?.length ?? 0) === 1),
    [jobs, sourceType],
  );

  useEffect(() => {
    if (!showFolderThumbnails) {
      setJobThumbnailUrls({});
      return;
    }

    const nextThumbnailUrls: Record<string, string> = {};
    jobs.forEach((job) => {
      const firstFile = job.folderFiles?.[0];
      if (!firstFile) return;
      nextThumbnailUrls[job.id] = URL.createObjectURL(firstFile);
    });
    setJobThumbnailUrls(nextThumbnailUrls);

    return () => {
      Object.values(nextThumbnailUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [jobs, showFolderThumbnails]);

  const resolveCategoryForJob = (rawCategory: string) => {
    const normalizedInput = normalizeHeaderKey(rawCategory || "");
    if (!normalizedInput) {
      return null;
    }
    return (
      promptCategories.find(
        (item) =>
          normalizeHeaderKey(item.category_key) === normalizedInput ||
          normalizeHeaderKey(item.category_label) === normalizedInput,
      ) ?? null
    );
  };

  const allValidSelected = validJobs.length > 0 && selectedIds.size === validJobs.length;
  const anySelected = selectedIds.size > 0;
  const previewGridTemplateColumns = `42px 72px ${showFolderThumbnails ? "120px " : ""}repeat(${columnHeaders.length}, minmax(220px, 1fr)) minmax(260px, 1.2fr)`;

  const resetAll = () => {
    setFileName(null);
    setParseError(null);
    setJobs([]);
    setColumnHeaders([]);
    setSelectedIds(new Set());
    if (inputRef.current) inputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const url = addStyleNumber ? styleSampleSheetUrl : sampleSheetUrl;
    const a = document.createElement("a");
    a.href = url;
    a.download = addStyleNumber ? "style_sample.xlsx" : "sample.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
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

      const headers = Array.from(
        records.reduce((acc, record) => {
          Object.keys(record).forEach((key) => {
            if (key.trim()) acc.add(key);
          });
          return acc;
        }, new Set<string>()),
      );
      if (addStyleNumber) {
        const hasStyleHeader = headers.some((header) => STYLE_NO_NORMALIZED_HEADERS.has(normalizeHeaderKey(header)));
        if (!hasStyleHeader) {
          throw new Error('Style number is enabled. Uploaded file must include a "style no." column.');
        }
      }

      const parsedJobs = parseRecordsToJobs(records, addStyleNumber);
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

  const handleFolderFiles = (files: FileList | null) => {
    setParseError(null);
    setSelectedIds(new Set());

    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) {
      setParseError("Please choose a folder with image files.");
      return;
    }

    const defaultBrandName = user?.name?.trim() || "Batch Upload";
    const folderJobs = buildFolderUploadJobs(selectedFiles, {
      brandName: defaultBrandName,
      brandWebsite: "https://example.com",
      productCategory: selectedPromptCategory || "default",
    });

    if (folderJobs.length === 0) {
      setFileName(null);
      setJobs([]);
      setColumnHeaders([]);
      setSelectedIds(new Set());
      setParseError("No image files found in the selected folder.");
      return;
    }

    const headers = Array.from(
      folderJobs.reduce((acc, job) => {
        Object.keys(job.rawValues).forEach((key) => acc.add(key));
        return acc;
      }, new Set<string>()),
    );

    const rootFolderName = getWebkitRelativePath(selectedFiles[0]).split("/").filter(Boolean)[0] || "Folder Upload";
    setFileName(rootFolderName);
    setJobs(folderJobs);
    setColumnHeaders(headers);
    setSelectedIds(new Set(folderJobs.filter((j) => j.errors.length === 0).map((j) => j.id)));
  };

  const runBatch = async () => {
    if (selectedJobs.length === 0) return;

    if (sourceType === "folder_upload" && selectedShotKeys.length !== requestedImageCount) {
      setParseError(`Select exactly ${requestedImageCount} shot prompt(s).`);
      return;
    }

    if (sourceType !== "folder_upload") {
      const defaultCategory =
        promptCategories.find((item) => item.category_key === "default") ??
        promptCategories[0] ??
        null;
      const invalidCategoryRows = selectedJobs.filter((job) => {
        const matchedCategory = resolveCategoryForJob(job.productCategory);
        const effectiveCategory = matchedCategory ?? defaultCategory;
        return !effectiveCategory || (effectiveCategory.shot_prompts ?? []).length < requestedImageCount;
      });
      if (invalidCategoryRows.length > 0) {
        setParseError(
          `Missing default/matched category configuration or enough shot prompts for ${invalidCategoryRows.length} selected row(s).`,
        );
        return;
      }
    }

    const styleEnabled = sourceType !== "folder_upload" && addStyleNumber;

    if (sourceType === "folder_upload") {
      const missingFolderJobs = selectedJobs.filter((job) => !job.folderFiles || job.folderFiles.length === 0);
      if (missingFolderJobs.length > 0) {
        setParseError(`Selected ${missingFolderJobs.length} job(s) without folder images. Please re-upload the folder.`);
        return;
      }
    }

    if (styleEnabled) {
      const hasStyleHeader = columnHeaders.some((header) => STYLE_NO_NORMALIZED_HEADERS.has(normalizeHeaderKey(header)));
      if (!hasStyleHeader) {
        setParseError('Style number is enabled. Uploaded file must include a "style no." column.');
        return;
      }

      const missingStyleRows = selectedJobs.filter((job) => !job.styleNumber.trim());
      if (missingStyleRows.length > 0) {
        setParseError(`Style number is enabled. Missing style no. in ${missingStyleRows.length} selected row(s).`);
        return;
      }
    }

    const batch_id = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const batch_name = fileName || "Batch Generation";
    const folderFileMap: Record<string, File[]> = {};

    const payload: BatchJobRunPayload[] = selectedJobs.map((j) => {
      let folderUploadKey: string | undefined;
      if (sourceType === "folder_upload") {
        const files = j.folderFiles ?? [];
        if (files.length === 0) {
          throw new Error(`Folder upload job ${j.rowNumber} has no image files.`);
        }
        folderUploadKey = `folder-upload-${Date.now()}-${j.rowNumber}-${Math.random().toString(36).slice(2, 8)}`;
        folderFileMap[folderUploadKey] = files;
      }

      const productData: ProductFormData = {
        ...(() => {
          if (sourceType === "folder_upload") {
            return {
              promptCategory: selectedPromptCategory,
              selectedShotKeys,
            };
          }
          const defaultCategory =
            promptCategories.find((item) => item.category_key === "default") ??
            promptCategories[0] ??
            null;
          const matchedCategory = resolveCategoryForJob(j.productCategory);
          const effectiveCategory = matchedCategory ?? defaultCategory;
          const categoryShotKeys = (effectiveCategory?.shot_prompts ?? [])
            .slice(0, requestedImageCount)
            .map((item) => item.key);
          return {
            promptCategory: effectiveCategory?.category_key ?? "default",
            selectedShotKeys: categoryShotKeys,
          };
        })(),
        brandName: j.brandName,
        brandWebsite: j.brandWebsite,
        productName: j.productName,
        productCategory: j.productCategory,
        industry: selectedIndustry,
        socialLinkInstagram: j.socialLinkInstagram,
        socialLinkFacebook: j.socialLinkFacebook,
        socialLinkLinkedin: j.socialLinkLinkedin,
        socialLinkX: j.socialLinkX,
        dimensionUnit: "cm",
        dimensionLength: "",
        dimensionBreadth: "",
        dimensionHeight: "",
        productDescription: j.productDescription,
        requestedImageCount,
        addStyleNumber: styleEnabled,
        styleNumber: styleEnabled ? j.styleNumber : "",
        productImages: sourceType === "folder_upload" ? [] : [j.imageLink],
        additionalInfo: styleEnabled
          ? {
              ...j.additionalInfo,
              "add_style_number": "true",
              "style no.": j.styleNumber,
            }
          : {
              ...j.additionalInfo,
            },
      };

      return {
        id: j.id,
        mode,
        sourceType,
        productData,
        folderUploadKey,
        batch_id,
        batch_name,
      };
    });

    if (sourceType === "folder_upload") {
      setTransientBatchFiles(folderFileMap);
    }

    writeActiveBatchRun({
      mode,
      jobs: payload,
      activeJobId: payload[0]?.id ?? null,
      jobStates: payload.map((job) => ({
        ...job,
        backendJobId: null,
        status: "queued",
        stage: "queued",
        message: "Waiting to start.",
        generatedImages: [],
        error: null,
      })),
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
              {sourceType === "folder_upload"
                ? "Upload a folder, review jobs, select jobs, and run generation on the batch."
                : "Upload a CSV/XLSX, review rows, select jobs, and run generation on the batch."}
            </p>
          </div>
        </div>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <p className="text-sm font-medium mb-3">Batch Source Type</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              resetAll();
              setParseError(null);
              setSourceType("image_link");
            }}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
              sourceType === "image_link"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-secondary"
            }`}
          >
            Image Links
          </button>
          <button
            type="button"
            onClick={() => {
              resetAll();
              setParseError(null);
              setSourceType("drive_folder");
            }}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
              sourceType === "drive_folder"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-secondary"
            }`}
          >
            Google Drive Folder Links
          </button>
          <button
            type="button"
            onClick={() => {
              resetAll();
              setParseError(null);
              setAddStyleNumber(false);
              setSourceType("folder_upload");
            }}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
              sourceType === "folder_upload"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-secondary"
            }`}
          >
            Folder Upload
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {sourceType === "drive_folder"
            ? 'Each row should contain a public Google Drive folder link in the "image link" column. The first 5 images will be used.'
            : sourceType === "folder_upload"
              ? "Upload one folder directly. If subfolders exist, each subfolder becomes one job and the first 5 images are used."
            : 'Each row should contain one direct image link in the "image link" column.'}
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Number of Images</p>
          <select
            value={String(requestedImageCount)}
            onChange={(e) => {
              const nextCount = Number(e.target.value);
              setRequestedImageCount(nextCount);
              const category = promptCategories.find((item) => item.category_key === selectedPromptCategory);
              const available = (category?.shot_prompts ?? []).map((item) => item.key);
              const nextSelected = selectedShotKeys.filter((key) => available.includes(key)).slice(0, nextCount);
              for (const key of available) {
                if (nextSelected.length >= nextCount) break;
                if (!nextSelected.includes(key)) nextSelected.push(key);
              }
              setSelectedShotKeys(nextSelected);
            }}
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          >
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Industry</span>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            >
              {industryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {sourceType === "folder_upload" ? (
            <label className="space-y-2">
              <span className="text-sm font-medium">Folder Upload Category</span>
              <select
                value={selectedPromptCategory}
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  setSelectedPromptCategory(nextCategory);
                  const category = promptCategories.find((item) => item.category_key === nextCategory);
                  setSelectedShotKeys((category?.shot_prompts ?? []).slice(0, requestedImageCount).map((item) => item.key));
                }}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              >
                {promptCategories.map((item) => (
                  <option key={item.category_key} value={item.category_key}>
                    {item.category_label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {sourceType === "folder_upload" ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Shot prompts (select exactly {requestedImageCount})</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(promptCategories.find((item) => item.category_key === selectedPromptCategory)?.shot_prompts ?? []).map((shot) => {
                const checked = selectedShotKeys.includes(shot.key);
                return (
                  <label key={shot.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = [...selectedShotKeys];
                        if (e.target.checked) {
                          if (next.length >= requestedImageCount) return;
                          next.push(shot.key);
                        } else {
                          const index = next.indexOf(shot.key);
                          if (index >= 0) next.splice(index, 1);
                        }
                        setSelectedShotKeys(next);
                      }}
                    />
                    <span>{shot.label || shot.key}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
        {user?.enableStyleNumber && sourceType !== "folder_upload" ? (
          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={addStyleNumber}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setAddStyleNumber(checked);
                  setParseError(null);
                }}
              />
              Add style number
            </label>
            {addStyleNumber ? (
              <p className="text-xs text-muted-foreground">
                When enabled, uploaded file must include a <span className="font-medium">style no.</span> column.
              </p>
            ) : null}
          </div>
        ) : null}
        {sourceType === "folder_upload" ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Style number is disabled for folder upload.
          </p>
        ) : null}
      </div>

      {/* Upload box */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              {sourceType === "folder_upload" ? "Upload folder" : "Upload batch file"}
            </p>
            <p className="text-xs text-muted-foreground">
              {sourceType === "folder_upload" ? (
                "Choose a folder with images."
              ) : (
                <>
                  The first row must be headers. Supported formats: <span className="font-medium">.csv</span>,{" "}
                  <span className="font-medium">.xlsx</span>.
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sourceType !== "folder_upload" && (
              <button
                onClick={downloadTemplate}
                disabled={isRunning}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5" />
                {addStyleNumber ? "Style sample" : "Sample sheet"}
              </button>
            )}
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
              onClick={() => (sourceType === "folder_upload" ? folderInputRef.current?.click() : inputRef.current?.click())}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4" /> {sourceType === "folder_upload" ? "Choose folder" : "Choose file"}
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
            <input
              ref={folderInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                handleFolderFiles(e.target.files);
              }}
              className="hidden"
            />
          </div>
        </div>

        {sourceType !== "folder_upload" ? (
          <div className="text-xs text-muted-foreground">
            Expected columns (case/spacing tolerant):{" "}
            <span className="font-medium text-foreground/90">{TEMPLATE_HEADERS.join(", ")}</span>
          </div>
        ) : null}

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
          <div className="sticky top-20 z-20 -mx-5 -mt-5 mb-4 flex items-center justify-between gap-4 border-b border-border bg-card/95 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/85">
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
                  gridTemplateColumns: previewGridTemplateColumns,
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
                  {showFolderThumbnails ? <div className="p-3">Thumbnail</div> : null}
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
                          gridTemplateColumns: previewGridTemplateColumns,
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
                        {showFolderThumbnails ? (
                          <div className="p-2">
                            {jobThumbnailUrls[j.id] ? (
                              <img
                                src={jobThumbnailUrls[j.id]}
                                alt={`Row ${j.rowNumber} preview`}
                                className="h-14 w-14 rounded-md border border-border object-cover"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        ) : null}
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
