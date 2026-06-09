import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return Response.json(
        { success: false, content: null },
        { headers: CORS_HEADERS },
      );
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentPro/1.0)" },
    });

    if (!res.ok) {
      return Response.json(
        { success: false, content: null },
        { headers: CORS_HEADERS },
      );
    }

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
      return Response.json(
        { success: false, content: null },
        { headers: CORS_HEADERS },
      );
    }

    const metaDesc =
      doc.querySelector('meta[name="description"]')?.getAttribute("content") ??
        "";
    const metaKeywords =
      doc.querySelector('meta[name="keywords"]')?.getAttribute("content") ?? "";
    const headings = [...doc.querySelectorAll("h1, h2, h3")]
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
      .join(" ");
    const bodyText = (doc.querySelector("body")?.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    const content = [metaDesc, metaKeywords, headings, bodyText]
      .filter(Boolean)
      .join(" ")
      .replace(/<[^>]*>/g, "")
      .trim();

    return Response.json(
      { success: true, content: content || null },
      { headers: CORS_HEADERS },
    );
  } catch {
    return Response.json(
      { success: false, content: null },
      { headers: CORS_HEADERS },
    );
  }
});
