"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_http = require("http");
var import_url = require("url");
var import_next = __toESM(require("next"), 1);
var import_socket = require("socket.io");

// services/aiClient.ts
var import_auth = require("firebase/auth");
async function getIdToken() {
  try {
    const user = (0, import_auth.getAuth)().currentUser;
    return user ? await user.getIdToken() : null;
  } catch {
    return null;
  }
}
async function callAI(action, params, signal) {
  const token = await getIdToken();
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...token ? { Authorization: `Bearer ${token}` } : {}
    },
    body: JSON.stringify({ action, params }),
    signal
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errorData.error || `AI request failed (${res.status})`);
  }
  const data = await res.json();
  return data.result;
}
var imageCache = /* @__PURE__ */ new Map();
var coverImageCache = /* @__PURE__ */ new Map();
var compressImage = async (base64Data, maxWidth = 1024) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Data;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = height * maxWidth / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Could not get canvas context");
      ctx.drawImage(img, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
      resolve(compressedBase64.split(",")[1]);
    };
    img.onerror = reject;
  });
};
var hashString = async (text) => {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
var cachedCoverHashKey = null;
var cachedCoverHashValue = null;
var getCoverHash = async (coverImageBase64) => {
  if (cachedCoverHashKey === coverImageBase64 && cachedCoverHashValue) {
    return cachedCoverHashValue;
  }
  const hash = await hashString(coverImageBase64);
  cachedCoverHashKey = coverImageBase64;
  cachedCoverHashValue = hash;
  return hash;
};
var generateMarketingImage = async (prompt, coverImageBase64, onProgress) => {
  const coverHash = await getCoverHash(coverImageBase64);
  const promptHash = await hashString(prompt);
  const hash = `${coverHash}_${promptHash}`;
  if (imageCache.has(hash)) {
    const cached = imageCache.get(hash);
    onProgress(cached);
    return cached;
  }
  let compressedBase64;
  if (coverImageCache.has(coverHash)) {
    compressedBase64 = coverImageCache.get(coverHash);
  } else {
    compressedBase64 = await compressImage(coverImageBase64);
    coverImageCache.set(coverHash, compressedBase64);
  }
  try {
    const result = await callAI("generateMarketingImage", { prompt, compressedBase64 });
    if (result) {
      imageCache.set(hash, result);
      onProgress(result);
      return result;
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Marketing image generation failed:", e instanceof Error ? e.message : String(e));
    }
  }
  return void 0;
};

// server.ts
var dev = process.env.NODE_ENV !== "production";
var app = (0, import_next.default)({ dev });
var handle = app.getRequestHandler();
app.prepare().then(() => {
  const server = (0, import_http.createServer)((req, res) => {
    const parsedUrl = (0, import_url.parse)(req.url, true);
    handle(req, res, parsedUrl);
  });
  const io = new import_socket.Server(server);
  io.on("connection", (socket) => {
    console.log("Client connected");
    socket.on("generate-image", async (data) => {
      const { prompt, coverImageBase64, id } = data;
      const imageUrl = await generateMarketingImage(prompt, coverImageBase64, (url) => {
        socket.emit("image-generated", { id, url });
      });
      if (imageUrl) {
        socket.emit("image-generated", { id, url: imageUrl });
      } else {
        socket.emit("image-error", { id, error: "Generation failed" });
      }
    });
  });
  server.listen(3e3, () => {
    console.log("> Ready on http://localhost:3000");
  });
});
