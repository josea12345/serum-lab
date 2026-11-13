import { createFileRoute } from "@tanstack/react-router";
import { SerumLab } from "@/components/serum/SerumLab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Serum Lab — Describe a sound, design a Serum 2 patch" },
      { name: "description", content: "Turn a sound description into an editable Xfer Serum 2 patch design: oscillators, filter, envelopes, LFOs and FX." },
      { property: "og:title", content: "Serum Lab — Serum 2 patch designer" },
      { property: "og:description", content: "Describe a sound and get an editable Serum 2 patch design you can refine and export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SerumLab,
});