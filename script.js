const menuButton = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");

function setMenuOpen(isOpen) {
  if (!menuButton || !navLinks) return;
  navLinks.classList.toggle("mobile-open", isOpen);
  document.body.classList.toggle("nav-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  menuButton.textContent = isOpen ? "✕" : "☰";
}

if (menuButton && navLinks) {
  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setMenuOpen(!navLinks.classList.contains("mobile-open"));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  document.addEventListener("click", (event) => {
    if (!navLinks.classList.contains("mobile-open")) return;
    if (navLinks.contains(event.target) || menuButton.contains(event.target)) return;
    setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 850) setMenuOpen(false);
  });
}

document.querySelectorAll("form.form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const button = form.querySelector("button[type='submit'], button");
    if (button) {
      button.textContent = "Message Sent";
      button.disabled = true;
    }

    const success = form.querySelector(".form-success");
    if (success) success.classList.add("visible");
  });
});

const greeting = document.querySelector("#dashGreeting");
if (greeting) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  greeting.textContent = `${hello}, Alex`;
}

const LABEL = {
  OTHER: 0,
  SKIN: 1,
  RED: 2,
  SLOUGH: 3,
  NECROTIC: 4,
  DRESSING: 5,
  UNRELATED: 6,
};

function isWoundLabel(label) {
  return label === LABEL.RED || label === LABEL.SLOUGH || label === LABEL.NECROTIC;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;

  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function isSkinTone(r, g, b, y, cb, cr, h, s) {
  const ycbcrSkin = y > 40 && cb > 77 && cb < 135 && cr > 133 && cr < 180;
  const darkSkin =
    y > 16 &&
    y < 90 &&
    cr > 115 &&
    cr < 178 &&
    cb > 70 &&
    cb < 145 &&
    r >= g - 10 &&
    r > b;
  const rgbRule =
    r > 60 &&
    g > 20 &&
    b > 8 &&
    r >= g &&
    r > b &&
    r - g > 8 &&
    Math.max(r, g, b) - Math.min(r, g, b) > 12 &&
    y < 245;
  const warmHue = (h < 50 || h > 340) && s > 0.08 && s < 0.72 && y > 28 && y < 235 && r > b + 6;

  return ycbcrSkin || darkSkin || (rgbRule && cr > 118) || warmHue;
}

function seedLabel(r, g, b) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const hsv = rgbToHsv(r, g, b);

  if (y > 238 && hsv.s < 0.12) return LABEL.DRESSING;
  if (hsv.h >= 185 && hsv.h < 265 && hsv.s > 0.3 && hsv.v > 0.28) return LABEL.UNRELATED;
  if (hsv.h >= 80 && hsv.h < 170 && hsv.s > 0.34 && hsv.v > 0.22) return LABEL.UNRELATED;
  if (isSkinTone(r, g, b, y, cb, cr, hsv.h, hsv.s)) return LABEL.SKIN;
  return LABEL.OTHER;
}

function classifyAgainstSkin(r, g, b, skin) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const hsv = rgbToHsv(r, g, b);
  const rg = r - g;
  const yb = (r + g) / 2 - b;

  if (y > 238 && hsv.s < 0.12) return LABEL.DRESSING;
  if (hsv.h >= 185 && hsv.h < 265 && hsv.s > 0.3 && hsv.v > 0.28) return LABEL.UNRELATED;
  if (hsv.h >= 80 && hsv.h < 170 && hsv.s > 0.34 && hsv.v > 0.22) return LABEL.UNRELATED;

  const shadow =
    y < skin.y - 38 &&
    y > 12 &&
    Math.abs(rg - skin.rg) < 20 &&
    hsv.s < 0.5;

  const necrotic =
    y < 52 &&
    y < skin.y - 48 &&
    !shadow &&
    (Math.abs(rg - skin.rg) > 10 || y < 26) &&
    r < 120 &&
    g < 100 &&
    b < 95;

  if (necrotic) return LABEL.NECROTIC;

  const slough =
    hsv.h >= 30 &&
    hsv.h <= 76 &&
    hsv.s >= 0.18 &&
    y > 72 &&
    yb > skin.yb + 10 &&
    g + 6 >= b &&
    r > 70;

  if (slough) return LABEL.SLOUGH;

  const red =
    (rg > skin.rg + 24 && r > g + 14 && r > b + 10 && y > 32 && hsv.s > 0.18) ||
    ((hsv.h < 22 || hsv.h > 345) && hsv.s > 0.36 && r > g + 22 && r > b + 18);

  if (red) return LABEL.RED;
  if (shadow) return LABEL.SKIN;
  if (isSkinTone(r, g, b, y, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b, hsv.h, hsv.s)) {
    return LABEL.SKIN;
  }
  return LABEL.OTHER;
}

function erodeSpeckle(labels, w, h) {
  const next = new Uint8Array(labels);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      if (!isWoundLabel(labels[i])) continue;
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          if (isWoundLabel(labels[i + dy * w + dx])) neighbors += 1;
        }
      }
      if (neighbors < 3) next[i] = LABEL.OTHER;
    }
  }
  return next;
}

function findWoundRegions(labels, w, h) {
  const seen = new Uint8Array(w * h);
  const regions = [];

  for (let start = 0; start < labels.length; start += 1) {
    if (seen[start] || !isWoundLabel(labels[start])) continue;

    const pixels = [start];
    seen[start] = 1;
    let cursor = 0;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let red = 0;
    let slough = 0;
    let necrotic = 0;
    let skinTouch = 0;

    while (cursor < pixels.length) {
      const p = pixels[cursor];
      cursor += 1;
      const x = p % w;
      const y = (p - x) / w;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (labels[p] === LABEL.RED) red += 1;
      else if (labels[p] === LABEL.SLOUGH) slough += 1;
      else necrotic += 1;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (labels[n] === LABEL.SKIN) skinTouch += 1;
          if (seen[n] || !isWoundLabel(labels[n])) continue;
          seen[n] = 1;
          pixels.push(n);
        }
      }
    }

    regions.push({
      count: pixels.length,
      minX,
      minY,
      maxX,
      maxY,
      red,
      slough,
      necrotic,
      skinTouch,
      pixels,
    });
  }

  return regions.sort((a, b) => b.count - a.count);
}

function likelyBackground(region, w, h, total) {
  const fill = region.count / Math.max(1, (region.maxX - region.minX + 1) * (region.maxY - region.minY + 1));
  const onBorder =
    region.minX <= 1 ||
    region.minY <= 1 ||
    region.maxX >= w - 2 ||
    region.maxY >= h - 2;
  const mostlyDark = region.necrotic / region.count > 0.72;
  if (region.count / total > 0.28 && mostlyDark) return true;
  if (onBorder && mostlyDark && region.count / total > 0.1 && fill > 0.45) return true;
  return false;
}

function blankResult(overrides) {
  return Object.assign(
    {
      status: "rejected",
      title: "Could not verify image",
      summary: "Please upload a close-up PNG, JPG, or WEBP photo of the wound.",
      quality: 0,
      redness: 0,
      slough: 0,
      necrotic: 0,
      area: 0,
      confidence: 0,
      findings: [],
      labels: new Uint8Array(1),
      width: 1,
      height: 1,
      box: null,
      woundDetected: false,
    },
    overrides
  );
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        img: bitmap,
        close: () => {
          if (bitmap.close) bitmap.close();
        },
      };
    } catch (_error) {
      /* Fall back to Image for browsers that reject the orientation option. */
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ img, close() {} });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

function analyzeWoundImage(img) {
  const maxSize = 320;
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(32, Math.round(img.width * scale));
  const h = Math.max(32, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return blankResult({
      title: "Analysis unavailable",
      summary: "This browser could not read pixel data from the image.",
    });
  }

  ctx.drawImage(img, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const total = w * h;
  const lum = new Float32Array(total);
  const seed = new Uint8Array(total);
  const skinR = [];
  const skinG = [];
  const skinB = [];

  let sumY = 0;
  let sumY2 = 0;
  let dark = 0;
  let bright = 0;

  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[p] = y;
    sumY += y;
    sumY2 += y * y;
    if (y < 22) dark += 1;
    if (y > 245) bright += 1;
    const label = seedLabel(r, g, b);
    seed[p] = label;
    if (label === LABEL.SKIN && skinR.length < 8000) {
      skinR.push(r);
      skinG.push(g);
      skinB.push(b);
    }
  }

  const skin = {
    r: median(skinR) || 168,
    g: median(skinG) || 126,
    b: median(skinB) || 108,
  };
  skin.y = 0.299 * skin.r + 0.587 * skin.g + 0.114 * skin.b;
  skin.rg = skin.r - skin.g;
  skin.yb = (skin.r + skin.g) / 2 - skin.b;
  const hasSkinSample = skinR.length > total * 0.04;

  let labels = new Uint8Array(total);
  const counts = {
    skin: 0,
    red: 0,
    slough: 0,
    necrotic: 0,
    dressing: 0,
    unrelated: 0,
    other: 0,
  };

  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const label = hasSkinSample
      ? classifyAgainstSkin(r, g, b, skin)
      : seed[p];
    labels[p] = label;
    if (label === LABEL.SKIN) counts.skin += 1;
    else if (label === LABEL.RED) counts.red += 1;
    else if (label === LABEL.SLOUGH) counts.slough += 1;
    else if (label === LABEL.NECROTIC) counts.necrotic += 1;
    else if (label === LABEL.DRESSING) counts.dressing += 1;
    else if (label === LABEL.UNRELATED) counts.unrelated += 1;
    else counts.other += 1;
  }

  labels = erodeSpeckle(labels, w, h);

  const mean = sumY / total;
  const contrast = Math.sqrt(Math.max(0, sumY2 / total - mean * mean));
  let edge = 0;
  let edgeCount = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      edge += Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + w] - lum[i - w]);
      edgeCount += 1;
    }
  }
  const sharpness = edge / Math.max(1, edgeCount);
  const sharpnessScore = clamp((sharpness / 28) * 100, 0, 100);
  const contrastScore = clamp((contrast / 54) * 100, 0, 100);
  const darkRatio = dark / total;
  const brightRatio = bright / total;
  let exposureScore = 100;
  if (mean < 50) exposureScore -= (50 - mean) * 1.4;
  if (mean > 210) exposureScore -= (mean - 210) * 1.6;
  exposureScore -= darkRatio * 120 + brightRatio * 140;
  exposureScore = clamp(exposureScore, 0, 100);

  let quality = sharpnessScore * 0.4 + contrastScore * 0.3 + exposureScore * 0.3;
  const issues = [];
  if (img.width < 240 || img.height < 240) {
    issues.push("Resolution is low. Use a higher-resolution photo.");
    quality -= 12;
  }
  if (mean < 40) issues.push("The photo is too dark for reliable screening.");
  if (mean > 225 || brightRatio > 0.22) {
    issues.push("The photo is overexposed. Recapture with even lighting.");
  }
  if (contrastScore < 26) {
    issues.push("Contrast is low, so tissue edges are hard to separate.");
  }
  if (sharpnessScore < 30) {
    issues.push("The photo looks blurry. Hold the camera steady and recapture.");
  }
  if (darkRatio > 0.28) issues.push("Large underexposed regions were found.");
  quality = Math.round(clamp(quality, 8, 99));

  const regions = findWoundRegions(labels, w, h);
  const minRegion = Math.max(22, Math.round(total * 0.0035));
  const kept = [];
  const keepMask = new Uint8Array(total);

  regions.forEach((region) => {
    if (region.count < minRegion) return;
    if (likelyBackground(region, w, h, total)) return;
    const closeUp = region.count / total >= 0.05;
    const nearSkin = region.skinTouch >= Math.min(16, region.count * 0.04);
    if (!nearSkin && !closeUp && counts.skin / total < 0.08) return;
    kept.push(region);
    region.pixels.forEach((p) => {
      keepMask[p] = 1;
    });
  });

  const overlay = new Uint8Array(total);
  let red = 0;
  let slough = 0;
  let necrotic = 0;
  for (let i = 0; i < total; i += 1) {
    if (keepMask[i] && isWoundLabel(labels[i])) {
      overlay[i] = labels[i];
      if (labels[i] === LABEL.RED) red += 1;
      else if (labels[i] === LABEL.SLOUGH) slough += 1;
      else necrotic += 1;
    } else if (labels[i] === LABEL.SKIN || labels[i] === LABEL.UNRELATED || labels[i] === LABEL.DRESSING) {
      overlay[i] = labels[i];
    }
  }

  const woundCount = red + slough + necrotic;
  const skinRatio = counts.skin / total;
  const woundRatio = woundCount / total;
  const unrelatedRatio = counts.unrelated / total;
  const dressingRatio = counts.dressing / total;
  const primary = kept[0] || null;
  let box = null;
  let clusterFill = 0;
  let centerBias = 0;

  if (primary) {
    box = {
      x: primary.minX,
      y: primary.minY,
      w: Math.max(1, primary.maxX - primary.minX + 1),
      h: Math.max(1, primary.maxY - primary.minY + 1),
    };
    clusterFill = primary.count / (box.w * box.h);
    const cx = (primary.minX + primary.maxX) / 2 / w;
    const cy = (primary.minY + primary.maxY) / 2 / h;
    centerBias = 1 - Math.min(1, Math.hypot(cx - 0.5, cy - 0.5) / 0.72);
  }

  const looksLikeScene = unrelatedRatio > 0.24 && woundRatio < 0.04 && skinRatio < 0.12;
  const tooLittleTissue = skinRatio < 0.06 && woundRatio < 0.02;
  const faceLike =
    skinRatio > 0.38 &&
    woundRatio < 0.025 &&
    red > slough + necrotic &&
    (!primary || primary.red / primary.count > 0.82);
  const woundDetected =
    Boolean(primary) &&
    !faceLike &&
    woundRatio >= 0.004 &&
    (skinRatio >= 0.05 || woundRatio >= 0.045);
  const clustered = clusterFill > 0.1 && box && box.w * box.h < total * 0.9;

  let status = "verified";
  let title = "Image verified";
  let summary = "This looks like a usable close-up medical photo. Tissue coloring was screened from the pixels in the image.";

  if (looksLikeScene) {
    status = "rejected";
    title = "Not a medical wound photo";
    summary = "Sky, landscape, or other unrelated coloring dominates this image. Please upload a close-up of the wound.";
  } else if (tooLittleTissue) {
    status = "rejected";
    title = "Wound or skin not detected";
    summary = "Not enough skin or wound-like tissue was found. Move closer and fill more of the frame with the affected area.";
  } else if (!woundDetected && skinRatio >= 0.16) {
    status = "recapture";
    title = "No clear wound region";
    summary = "Skin was detected, but a distinct wound bed was not. Capture a closer photo centered on the wound.";
  } else if (quality < 42 || issues.length >= 3) {
    status = "recapture";
    title = "Photo quality is too low";
    summary = "The file is an image, but lighting, blur, or contrast make screening unreliable. Please recapture.";
  } else if (woundDetected && !clustered && woundRatio > 0.2) {
    status = "review";
    title = "Needs clinician review";
    summary = "Wound-like coloring is widespread rather than localized. Compare with previous photos and share with your care team.";
  } else if (woundDetected && (necrotic / total > 0.035 || (red / total > 0.1 && slough / total > 0.05))) {
    status = "review";
    title = "Verified — review recommended";
    summary = "The photo is usable. Notable tissue coloring was found and should be reviewed with a qualified clinician.";
  } else if (!woundDetected) {
    status = "rejected";
    title = "Could not confirm a wound photo";
    summary = "The image did not contain a concentrated wound-like region next to skin. Upload a well-lit close-up of the affected area.";
  }

  const redness = Math.round(clamp((red / total) * 480, 0, 100));
  const sloughScore = Math.round(clamp((slough / total) * 580, 0, 100));
  const necroticScore = Math.round(clamp((necrotic / total) * 740, 0, 100));
  const area = Math.round(clamp(woundRatio * 100, 0, 100));
  let confidence = quality * 0.45;
  if (woundDetected) confidence += 22;
  if (skinRatio > 0.12) confidence += 12;
  if (clustered) confidence += 10;
  confidence += centerBias * 8;
  if (status === "rejected") confidence = Math.min(confidence, 28);
  if (status === "recapture") confidence = Math.min(confidence, 48);
  confidence = Math.round(clamp(confidence, 6, 96));

  const findings = [];
  if (status === "verified" || status === "review") {
    findings.push({
      text: `Estimated affected region: ${area}% of the frame${kept.length > 1 ? ` across ${kept.length} clusters` : ""}.`,
      tone: area > 45 ? "warn" : "",
    });
  }
  if (redness >= 26) {
    findings.push({
      text: "Elevated redness was detected. Watch for spreading, warmth, swelling, or increasing pain.",
      tone: redness >= 55 ? "alert" : "warn",
    });
  }
  if (sloughScore >= 20) {
    findings.push({
      text: "Yellow or fibrinous coloring is present. Keep the area clean as advised by your care team.",
      tone: "warn",
    });
  }
  if (necroticScore >= 16) {
    findings.push({
      text: "Dark tissue coloring was detected. Share this photo with a clinician promptly.",
      tone: "alert",
    });
  }
  if (dressingRatio > 0.18) {
    findings.push({
      text: "Bright dressing or glare covers part of the view. Fold back the dressing only if your clinician has said it is safe.",
      tone: "warn",
    });
  }
  issues.forEach((text) => findings.push({ text, tone: "warn" }));
  if (!findings.length && status === "verified") {
    findings.push({
      text: "Image quality is acceptable and tissue coloring is within a typical monitoring range. Continue regular check-ins.",
      tone: "",
    });
  }
  if (status === "rejected" || status === "recapture") {
    findings.push({
      text: "Tips: use daylight or a side lamp, hold 15–25 cm away, keep the camera parallel to the skin, and include a little surrounding skin.",
      tone: "",
    });
  }

  return {
    status,
    title,
    summary,
    quality,
    redness,
    slough: sloughScore,
    necrotic: necroticScore,
    area,
    confidence,
    findings,
    labels: overlay,
    width: w,
    height: h,
    box: woundDetected ? box : null,
    woundDetected,
  };
}

function drawAnalysisCanvas(img, result) {
  const canvas = document.querySelector("#analysisCanvas");
  if (!canvas) return;

  const maxWidth = 560;
  const displayW = Math.min(maxWidth, Math.max(160, img.width));
  const displayH = Math.max(1, Math.round((img.height / Math.max(1, img.width)) * displayW));
  canvas.width = displayW;
  canvas.height = displayH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, displayW, displayH);

  const showOverlay = result.woundDetected && (result.status === "verified" || result.status === "review");
  if (!showOverlay) return;

  const overlay = document.createElement("canvas");
  overlay.width = result.width;
  overlay.height = result.height;
  const octx = overlay.getContext("2d");
  if (!octx) return;
  const imageData = octx.createImageData(result.width, result.height);
  const data = imageData.data;

  for (let i = 0; i < result.labels.length; i += 1) {
    const p = i * 4;
    const label = result.labels[i];
    if (label === LABEL.RED) {
      data[p] = 225;
      data[p + 1] = 29;
      data[p + 2] = 72;
      data[p + 3] = 150;
    } else if (label === LABEL.SLOUGH) {
      data[p] = 234;
      data[p + 1] = 179;
      data[p + 2] = 8;
      data[p + 3] = 140;
    } else if (label === LABEL.NECROTIC) {
      data[p] = 15;
      data[p + 1] = 23;
      data[p + 2] = 42;
      data[p + 3] = 150;
    }
  }

  octx.putImageData(imageData, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(overlay, 0, 0, displayW, displayH);

  if (result.box) {
    const sx = displayW / result.width;
    const sy = displayH / result.height;
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = Math.max(2, Math.round(displayW / 220));
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(result.box.x * sx, result.box.y * sy, result.box.w * sx, result.box.h * sy);
    ctx.setLineDash([]);
  }
}

function meterHTML(label, value, tone) {
  const v = Math.round(clamp(value, 0, 100));
  return `
    <div class="meter">
      <div class="meter-label"><span>${label}</span><strong>${v}%</strong></div>
      <div class="meter-track"><span class="meter-fill meter-${tone}" style="width:${v}%"></span></div>
    </div>
  `;
}

function renderAnalysis(result) {
  const empty = document.querySelector("#analysisEmpty");
  const working = document.querySelector("#analysisWorking");
  const panel = document.querySelector("#analysisResult");
  const badge = document.querySelector("#analysisBadge");
  const title = document.querySelector("#analysisTitle");
  const summary = document.querySelector("#analysisSummary");
  const meters = document.querySelector("#analysisMeters");
  const findings = document.querySelector("#analysisFindings");
  const qualityStat = document.querySelector("#statQuality");
  const statusStat = document.querySelector("#statStatus");
  const legend = document.querySelector("#overlayLegend");

  if (!panel || !badge) return;

  if (empty) empty.hidden = true;
  if (working) working.hidden = true;
  panel.hidden = false;

  const badgeMap = {
    verified: ["Verified", "badge-ok"],
    review: ["Review", "badge-warn"],
    recapture: ["Recapture", "badge-warn"],
    rejected: ["Rejected", "badge-bad"],
  };
  const [badgeText, badgeClass] = badgeMap[result.status] || badgeMap.recapture;
  badge.textContent = badgeText;
  badge.className = `analysis-badge ${badgeClass}`;
  if (title) title.textContent = result.title;
  if (summary) {
    const confidence = Number.isFinite(result.confidence) ? ` Screening confidence: ${result.confidence}%.` : "";
    summary.textContent = `${result.summary}${confidence}`;
  }

  if (meters) {
    meters.innerHTML = [
      meterHTML("Image quality", result.quality, "green"),
      meterHTML("Redness", result.redness, "red"),
      meterHTML("Yellow / slough", result.slough, "yellow"),
      meterHTML("Dark tissue", result.necrotic, "dark"),
    ].join("");
  }

  if (findings) {
    findings.replaceChildren();
    (result.findings || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item.text;
      if (item.tone) li.className = item.tone;
      findings.appendChild(li);
    });
  }

  if (legend) {
    legend.hidden = !(result.woundDetected && (result.status === "verified" || result.status === "review"));
  }

  if (qualityStat) qualityStat.textContent = `${result.quality}%`;
  if (statusStat) {
    statusStat.textContent =
      result.status === "verified"
        ? "Verified"
        : result.status === "review"
          ? "Review"
          : result.status === "rejected"
            ? "Rejected"
            : "Recapture";
  }
}

function isImageFile(file) {
  if (file.type && file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || "");
}

const fileInput = document.querySelector("#woundImage");

if (fileInput) {
  const uploadBox = document.querySelector("#uploadBox");
  const uploadText = document.querySelector("#uploadText");
  const previewStage = document.querySelector("#previewStage");
  const uploadsStat = document.querySelector("#statUploads");
  const empty = document.querySelector("#analysisEmpty");
  const working = document.querySelector("#analysisWorking");
  const panel = document.querySelector("#analysisResult");
  let uploadCount = Number(uploadsStat && uploadsStat.textContent) || 6;
  let dragDepth = 0;

  function showWorking() {
    if (empty) empty.hidden = true;
    if (panel) panel.hidden = true;
    if (working) working.hidden = false;
  }

  async function processFile(file) {
    if (!file) return;

    if (!isImageFile(file)) {
      renderAnalysis(
        blankResult({
          title: "File is not an image",
          summary: "Please upload a PNG, JPG, or WEBP photo of the wound.",
          findings: [{ text: "Only image files can be verified.", tone: "alert" }],
        })
      );
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      renderAnalysis(
        blankResult({
          title: "Image is too large",
          summary: "Please upload a photo smaller than 12 MB.",
          findings: [{ text: "Compress or recapture the photo, then try again.", tone: "warn" }],
        })
      );
      return;
    }

    if (uploadText) uploadText.textContent = "Analyzing image…";
    if (uploadBox) uploadBox.classList.add("is-busy");
    showWorking();

    let source;
    try {
      source = await loadImageSource(file);
      const img = source.img;
      if (!img.width || !img.height) {
        throw new Error("That image has no readable dimensions.");
      }
      await new Promise((resolve) => setTimeout(resolve, 30));
      const result = analyzeWoundImage(img);

      if (previewStage) {
        previewStage.hidden = false;
        drawAnalysisCanvas(img, result);
      }

      renderAnalysis(result);
      if (result.status === "verified" || result.status === "review") {
        uploadCount += 1;
        if (uploadsStat) uploadsStat.textContent = String(uploadCount);
      }
      if (uploadText) uploadText.textContent = `${file.name} · tap to replace`;
    } catch (error) {
      if (uploadText) uploadText.textContent = "Could not read that file";
      renderAnalysis(
        blankResult({
          title: "Image could not be read",
          summary: error.message || "Try another PNG or JPG photo.",
          findings: [{ text: "If the file is HEIC, export it as JPG first.", tone: "warn" }],
        })
      );
    } finally {
      if (source && source.close) source.close();
      if (uploadBox) uploadBox.classList.remove("is-busy");
    }
  }

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) processFile(fileInput.files[0]);
    fileInput.value = "";
  });

  if (uploadBox) {
    uploadBox.addEventListener("dragenter", (event) => {
      event.preventDefault();
      dragDepth += 1;
      uploadBox.classList.add("is-dragover");
    });

    uploadBox.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    uploadBox.addEventListener("dragleave", (event) => {
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) uploadBox.classList.remove("is-dragover");
    });

    uploadBox.addEventListener("drop", (event) => {
      event.preventDefault();
      dragDepth = 0;
      uploadBox.classList.remove("is-dragover");
      const file = event.dataTransfer && event.dataTransfer.files[0];
      if (file) processFile(file);
    });
  }
}

const checkinForm = document.querySelector("#checkinForm");
if (checkinForm) {
  const painInput = document.querySelector("#painScore");
  const painValue = document.querySelector("#painValue");
  const noteInput = document.querySelector("#checkinNote");
  const saved = document.querySelector("#checkinSaved");
  const CHECKIN_KEY = "healai-checkin";

  function paintPain() {
    if (painInput && painValue) painValue.textContent = painInput.value;
  }

  try {
    const previous = JSON.parse(localStorage.getItem(CHECKIN_KEY) || "null");
    if (previous) {
      if (painInput && previous.pain != null) painInput.value = previous.pain;
      ["swelling", "warmth", "drainage", "odor"].forEach((name) => {
        const box = checkinForm.querySelector(`[name="${name}"]`);
        if (box) box.checked = Boolean(previous[name]);
      });
      if (noteInput && previous.note) noteInput.value = previous.note;
      if (saved && previous.at) {
        saved.hidden = false;
        saved.textContent = `Last saved ${previous.at}`;
      }
    }
  } catch (_error) {
    /* Ignore unreadable local data. */
  }

  paintPain();
  if (painInput) painInput.addEventListener("input", paintPain);

  checkinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = {
      pain: painInput ? Number(painInput.value) : 0,
      swelling: Boolean(checkinForm.swelling && checkinForm.swelling.checked),
      warmth: Boolean(checkinForm.warmth && checkinForm.warmth.checked),
      drainage: Boolean(checkinForm.drainage && checkinForm.drainage.checked),
      odor: Boolean(checkinForm.odor && checkinForm.odor.checked),
      note: noteInput ? noteInput.value.trim() : "",
      at: new Date().toLocaleString(),
    };

    try {
      localStorage.setItem(CHECKIN_KEY, JSON.stringify(record));
    } catch (_error) {
      /* Storage can be blocked in private mode. */
    }

    if (saved) {
      saved.hidden = false;
      saved.textContent = `Check-in saved on this device · ${record.at}`;
    }
  });
}
