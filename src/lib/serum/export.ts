import type { Patch } from "./types";

export interface Exporter {
  id: string;
  label: string;
  extension: string;
  mime: string;
  available: boolean;
  verified: boolean;
  unavailableReason?: string;
  serialize?: (p: Patch) => Blob;
}

export function buildSpec(p: Patch, exportedAt = new Date().toISOString()) {
  return {
    format: "serumlab.patch-spec",
    formatVersion: 1,
    target: "Xfer Serum 2",
    nativePresetFormat: false,
    note: "Patch specification only. This is NOT a .SerumPreset file — recreate these values manually in Serum 2.",
    exportedAt,
    patch: p,
  };
}

export const EXPORTERS: Exporter[] = [
  {
    id: "json-spec",
    label: "JSON patch specification",
    extension: "json",
    mime: "application/json",
    available: true,
    verified: true,
    serialize: (p) => new Blob([JSON.stringify(buildSpec(p), null, 2)], { type: "application/json" }),
  },
  {
    id: "serum2-native",
    label: "Native .SerumPreset",
    extension: "SerumPreset",
    mime: "application/octet-stream",
    available: false,
    verified: false,
    unavailableReason: "Export format not yet verified. No reliable Serum 2 preset schema is available, so native export is disabled.",
  },
];

export const fileName = (p: Patch, ext: string) =>
  `${p.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "patch"}.serumlab.${ext}`;

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}