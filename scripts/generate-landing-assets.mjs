#!/usr/bin/env node

/**
 * Generate landing page visual assets using Google Imagen 4 and Veo 3.
 *
 * Usage:
 *   GEMINI_API_KEY=your-key node scripts/generate-landing-assets.mjs
 *   GEMINI_API_KEY=your-key node scripts/generate-landing-assets.mjs --video
 *   GEMINI_API_KEY=your-key node scripts/generate-landing-assets.mjs --only hero-bg
 */

import fs from "fs";
import path from "path";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}

const OUTPUT_DIR = "public/images/landing";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// ---------------------------------------------------------------------------
// Image prompts — specific to avoid generic AI-look
// ---------------------------------------------------------------------------

const imageAssets = [
  {
    name: "hero-bg",
    prompt: [
      "Dark minimal architectural photograph,",
      "a single corridor of smooth dark concrete with precise geometric lines,",
      "one narrow beam of cool blue-white light cutting diagonally across the space,",
      "deep black shadows, extremely high contrast,",
      "no text, no people, no furniture,",
      "monochrome with subtle cold blue undertones,",
      "shot on Hasselblad medium format, editorial architecture photography,",
      "16:9 aspect ratio",
    ].join(" "),
  },
  {
    name: "trust-texture",
    prompt: [
      "Extreme close-up macro photograph of dark brushed stainless steel surface,",
      "fine parallel grain lines catching minimal ambient light,",
      "completely dark palette with subtle metallic highlights,",
      "no text, no reflections of objects, abstract material study,",
      "shot on macro lens, shallow depth of field,",
      "clean industrial minimalism, 16:9 aspect ratio",
    ].join(" "),
  },
  {
    name: "cta-bg",
    prompt: [
      "Aerial bird's-eye photograph of dark geometric rooftop architecture at night,",
      "repeating rectangular concrete forms creating shadow grid pattern,",
      "extremely minimal, completely dark palette with faint cool ambient glow,",
      "no text, no people, no vegetation,",
      "abstract architectural minimalism, shot on drone camera, 16:9 aspect ratio",
    ].join(" "),
  },
];

// ---------------------------------------------------------------------------
// Video prompt (Veo 3)
// ---------------------------------------------------------------------------

const videoAsset = {
  name: "hero-video",
  prompt: [
    "Slow steady camera push through a dark minimal concrete corridor,",
    "geometric walls with sharp edges and precise angles,",
    "a single beam of cool white light gradually revealing the space,",
    "extremely cinematic, dark palette with subtle blue tones,",
    "no text, no people, smooth camera movement,",
    "architectural visualization, moody atmosphere,",
    "4K quality, 24fps cinematic",
  ].join(" "),
};

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiCall(url, body) {
  const res = await fetch(`${url}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Generate image via Gemini native image generation (generateContent)
async function generateImageGemini(asset) {
  console.log(`\n  Generating image: ${asset.name}`);
  console.log(`  Prompt: ${asset.prompt.slice(0, 80)}...`);

  const data = await apiCall(
    `${BASE_URL}/gemini-2.5-flash-preview-05-20:generateContent`,
    {
      contents: [
        {
          parts: [{ text: `Generate an image: ${asset.prompt}` }],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    }
  );

  if (data.error) {
    console.error(`  API Error: ${data.error.message}`);
    return null;
  }

  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      const buf = Buffer.from(part.inlineData.data, "base64");
      const ext = part.inlineData.mimeType?.includes("png") ? "png" : "webp";
      const outputPath = path.join(OUTPUT_DIR, `${asset.name}.${ext}`);
      fs.writeFileSync(outputPath, buf);
      console.log(`  Saved: ${outputPath} (${Math.round(buf.length / 1024)}KB)`);
      return outputPath;
    }
  }

  console.error(`  No image in response. Trying Imagen 4 fallback...`);
  return generateImageImagen(asset);
}

// Generate image via Imagen 4 (predict API)
async function generateImageImagen(asset) {
  const data = await apiCall(
    `${BASE_URL}/imagen-4.0-generate-001:predict`,
    {
      instances: [{ prompt: asset.prompt }],
      parameters: { sampleCount: 1, aspectRatio: "16:9" },
    }
  );

  if (data.error) {
    console.error(`  Imagen 4 Error: ${data.error.message}`);
    return null;
  }

  if (!data.predictions?.[0]?.bytesBase64Encoded) {
    console.error(`  No image data in Imagen response`);
    return null;
  }

  const buf = Buffer.from(data.predictions[0].bytesBase64Encoded, "base64");
  const outputPath = path.join(OUTPUT_DIR, `${asset.name}.png`);
  fs.writeFileSync(outputPath, buf);
  console.log(`  Saved: ${outputPath} (${Math.round(buf.length / 1024)}KB)`);
  return outputPath;
}

// Generate video via Veo 3 (long-running operation)
async function generateVideo(asset) {
  console.log(`\n  Generating video: ${asset.name}`);
  console.log(`  Prompt: ${asset.prompt.slice(0, 80)}...`);
  console.log(`  This may take several minutes...`);

  const data = await apiCall(
    `${BASE_URL}/veo-3.0-generate-001:predictLongRunning`,
    {
      instances: [{ prompt: asset.prompt }],
      parameters: {
        sampleCount: 1,
        durationSeconds: 6,
        aspectRatio: "16:9",
      },
    }
  );

  if (data.error) {
    console.error(`  API Error: ${data.error.message}`);
    return null;
  }

  const opName = data.name;
  if (!opName) {
    console.error(`  No operation name returned`);
    return null;
  }

  // Poll for completion
  let attempts = 0;
  while (attempts < 60) {
    await new Promise((r) => setTimeout(r, 10000));
    attempts++;
    process.stdout.write(`  Polling (${attempts * 10}s)...\r`);

    const status = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${API_KEY}`
    ).then((r) => r.json());

    if (status.error) {
      console.error(`\n  Poll Error: ${status.error.message}`);
      return null;
    }

    if (status.done) {
      const videos = status.response?.generatedVideos || [];
      if (videos.length === 0) {
        console.error(`\n  No video in response`);
        return null;
      }

      const videoData = videos[0].video?.videoBytes;
      if (!videoData) {
        console.error(`\n  No video bytes in response`);
        return null;
      }

      const buf = Buffer.from(videoData, "base64");
      const outputPath = path.join(OUTPUT_DIR, `${asset.name}.mp4`);
      fs.writeFileSync(outputPath, buf);
      console.log(`\n  Saved: ${outputPath} (${Math.round(buf.length / 1024)}KB)`);
      return outputPath;
    }
  }

  console.error(`\n  Timed out after ${attempts * 10}s`);
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const includeVideo = args.includes("--video");
  const onlyAsset = args.find((a) => !a.startsWith("--"));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Cortex Landing Page Asset Generator");
  console.log("====================================");
  console.log(`Output: ${OUTPUT_DIR}/`);
  console.log(`Models: Gemini 2.5 Flash (images) + Veo 3 (video)`);

  const imagesToGenerate = onlyAsset
    ? imageAssets.filter((a) => a.name === onlyAsset)
    : imageAssets;

  if (imagesToGenerate.length === 0 && !includeVideo) {
    console.error(`No asset found: ${onlyAsset}`);
    console.error(
      `Available: ${imageAssets.map((a) => a.name).join(", ")}, hero-video (--video)`
    );
    process.exit(1);
  }

  const results = [];

  for (const asset of imagesToGenerate) {
    const result = await generateImageGemini(asset);
    results.push({ name: asset.name, path: result, type: "image" });
    // Small delay between requests
    if (imagesToGenerate.indexOf(asset) < imagesToGenerate.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (includeVideo && (!onlyAsset || onlyAsset === "hero-video")) {
    const result = await generateVideo(videoAsset);
    results.push({ name: videoAsset.name, path: result, type: "video" });
  }

  console.log("\n====================================");
  console.log("Results:");
  for (const r of results) {
    const status = r.path ? "OK" : "FAILED";
    console.log(`  [${status}] ${r.name} (${r.type})`);
  }

  const failed = results.filter((r) => !r.path);
  if (failed.length > 0) {
    process.exit(1);
  }
  console.log("\nDone. Integrate into landing page components.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
