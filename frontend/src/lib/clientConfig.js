import { useState, useEffect } from "react";

const STORAGE_KEY = "clientCode";

export const CLIENT_CONFIGS = {
  "KRISHNA": {
    clientName: "Krishna Client",
    productLabel: "Product Name",
    brandLabel: "Brand Name",
    showSequenceNumber: true,
    sequenceLabel: "Image Number",
    imagesPerGeneration: 1,
    styleOptions: [
      { label: "Cushion", promptKey: "client_cushion" },
      { label: "Carpet", promptKey: "client_carpet" },
    ],
    hiddenFields: ["category", "industry", "styleSelect"],
  },
};

export function getClientConfig(code) {
  if (!code || !CLIENT_CONFIGS[code]) return null;
  return CLIENT_CONFIGS[code];
}

export function useClientMode() {
  const [clientCode, setClientCodeState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );

  const config = getClientConfig(clientCode);
  const isClientMode = config !== null;

  function setCode(code) {
    if (!getClientConfig(code)) return false;
    localStorage.setItem(STORAGE_KEY, code);
    setClientCodeState(code);
    return true;
  }

  function clearCode() {
    localStorage.removeItem(STORAGE_KEY);
    setClientCodeState(null);
  }

  return { isClientMode, config, setCode, clearCode };
}
