// Where uploaded pictures and 3D models are kept.
//   CLOUDINARY_URL set in .env -> Cloudinary (Phase 1, the online web app)
//   not set                    -> the server/uploads folder on this computer (Phase 2, the offline Pi)
// No extra packages: Cloudinary is called with Node's built-in fetch.
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");

// CLOUDINARY_URL looks like cloudinary://<api_key>:<api_secret>@<cloud_name> (copy it from the Cloudinary dashboard).
const cloudinary = process.env.CLOUDINARY_URL ? new URL(process.env.CLOUDINARY_URL) : null;
export const storageName = cloudinary ? `Cloudinary (${cloudinary.hostname})` : "server/uploads folder";

// Does the file start with these bytes?
const startsWith = (buffer, at, text) => buffer.toString("latin1", at, at + text.length) === text;

// What may be uploaded. Files are recognised by their first bytes, not by their name,
// so renaming a .exe to .png does not get it through.
const FILE_TYPES = [
  { ext: "jpg", kind: "image", maxMB: 5, matches: (b) => startsWith(b, 0, "\xff\xd8\xff") },
  { ext: "png", kind: "image", maxMB: 5, matches: (b) => startsWith(b, 0, "\x89PNG") },
  { ext: "gif", kind: "image", maxMB: 5, matches: (b) => startsWith(b, 0, "GIF8") },
  { ext: "webp", kind: "image", maxMB: 5, matches: (b) => startsWith(b, 0, "RIFF") && startsWith(b, 8, "WEBP") },
  { ext: "glb", kind: "model", maxMB: 20, matches: (b) => startsWith(b, 0, "glTF") },
];

// The type of the file, or undefined if it is not one we accept.
export const detectFileType = (buffer) =>
  buffer.length >= 12 ? FILE_TYPES.find((type) => type.matches(buffer)) : undefined;

// Saves the file and returns the link to it.
export function saveFile(buffer, type) {
  const name = `${randomUUID()}.${type.ext}`; // random, so names never clash
  return cloudinary ? uploadToCloudinary(buffer, name, type) : saveLocally(buffer, name);
}

async function saveLocally(buffer, name) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`; // index.js serves this folder at /uploads
}

// Cloudinary checks that the request really comes from us: every setting, sorted by name,
// is joined with & and hashed (SHA-1) together with the secret key.
export function signCloudinary(params, apiSecret) {
  const text = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(text + apiSecret).digest("hex");
}

async function uploadToCloudinary(buffer, name, type) {
  const isModel = type.kind === "model";
  const params = {
    folder: "rlc",
    public_id: isModel ? name : name.replace(/\.\w+$/, ""), // 3D models keep ".glb" in their link
    timestamp: Math.floor(Date.now() / 1000),
  };

  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.append(key, String(value));
  form.append("api_key", decodeURIComponent(cloudinary.username));
  form.append("signature", signCloudinary(params, decodeURIComponent(cloudinary.password)));
  form.append("file", new Blob([buffer]), name);

  // Pictures go in as "image"; .glb models go in as "raw" (stored exactly as they are).
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinary.hostname}/${isModel ? "raw" : "image"}/upload`,
    { method: "POST", body: form },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cloudinary refused the upload: ${data.error?.message ?? `status ${res.status}`}`);
  return data.secure_url;
}