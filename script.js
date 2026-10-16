(() => {
"use strict";

/* ===================== SETTINGS ===================== */
const CONFIG = {
  name: "Alpha Khan",
  // Normal GitHub links are fine, they are converted to raw links automatically
  photo: "https://github.com/mdimrankhanalpha/Alpha-Khan/blob/main/file_0000000015388211911a75ea3e0b1679.png",
  bio: "",                                   // optional, leave empty to hide
  files: ["post.txt", "posts.txt", "Post.txt"], // first one that exists is used
  batch: 8,                                  // posts rendered per step while scrolling
  clampLines: 6                              // lines shown before "Read more"
};
/* ==================================================== */

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.style.setProperty("--clamp", CONFIG.clampLines);

/* ---------- URL helpers ---------- */
function resolveUrl(u) {
  try {
    const url = new URL(u);
    if (/^(www\.)?github\.com$/i.test(url.hostname)) {
      const m = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/);
      if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
    }
    return url.href;
  } catch { return u; }
}
const IMG = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;
const VID = /\.(mp4|webm|mov|m4v|ogv)$/i;
const AUD = /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|weba)$/i;

function ytInfo(u) {
  try {
    const x = new URL(u);
    const h = x.hostname.replace(/^(www|m)\./, "");
    let id = null, short = false;
    if (h === "youtu.be") id = x.pathname.slice(1).split("/")[0];
    else if (h === "youtube.com" || h === "music.youtube.com" || h === "youtube-nocookie.com") {
      if (x.pathname === "/watch") id = x.searchParams.get("v");
      else {
        const m = x.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{6,})/);
        if (m) { id = m[2]; short = m[1] === "shorts"; }
      }
    }
    if (!id || !/^[\w-]{6,}$/.test(id)) return null;
    const t = (x.searchParams.get("t") || x.searchParams.get("start") || "").match(/^\d+/);
    return { id, short, start: t ? t[0] : "" };
  } catch { return null; }
}

/* ---------- parsing ---------- */
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function mediaBlock(s) {
  const yt = ytInfo(s);
  if (yt) return { type: "youtube", ...yt };
  const src = resolveUrl(s);
  let path = "";
  try { path = new URL(src).pathname; } catch {}
  if (IMG.test(path)) return { type: "image", src };
  if (VID.test(path)) return { type: "video", src };
  if (AUD.test(path)) return { type: "audio", src };
  return { type: "link", href: s };
}

function toBlocks(lines) {
  const blocks = [];
  let buf = [];
  const flush = () => {
    const t = buf.join("\n").trim();
    if (t) blocks.push({ type: "text", text: t });
    buf = [];
  };
  for (const line of lines) {
    const s = line.trim();
    if (/^https?:\/\/\S+$/i.test(s)) { flush(); blocks.push(mediaBlock(s)); }
    else buf.push(line);
  }
  flush();
  // consecutive photos become one gallery
  const out = [];
  for (const b of blocks) {
    const last = out[out.length - 1];
    if (b.type === "image") {
      if (last && last.type === "gallery") last.srcs.push(b.src);
      else out.push({ type: "gallery", srcs: [b.src] });
    } else out.push(b);
  }
  return out;
}

// A line containing only "$" divides posts. The top post in the file is the newest.
function parsePosts(raw) {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  const posts = [];
  let cur = [];
  const push = () => {
    const blocks = toBlocks(cur);
    if (blocks.length) posts.push({ blocks, key: hash(cur.join("\n")) });
    cur = [];
  };
  for (const l of lines) {
    if (/^\s*\$\s*$/.test(l)) push();
    else cur.push(l);
  }
  push();
  return posts;
}

/* ---------- builders ---------- */
const avatarUrl = resolveUrl(CONFIG.photo);

function linkify(parent, text) {
  const re = /https?:\/\/[^\s<>"']+/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    let url = m[0];
    const trail = url.match(/[.,;:!?)\]}]+$/);
    if (trail) url = url.slice(0, -trail[0].length);
    if (m.index > last) parent.append(text.slice(last, m.index));
    const a = el("a", null, url);
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
    parent.append(a);
    last = m.index + url.length;
    re.lastIndex = last;
  }
  if (last < text.length) parent.append(text.slice(last));
}

function textBlock(text) {
  const wrap = el("div", "txt");
  const body = el("div", "txt-body clamped");
  linkify(body, text);
  const btn = el("button", "more", "Read more");
  btn.type = "button"; btn.hidden = true;
  btn.setAttribute("aria-expanded", "false");
  btn.addEventListener("click", () => {
    const open = !body.classList.toggle("clamped");
    btn.textContent = open ? "Show less" : "Read more";
    btn.setAttribute("aria-expanded", String(open));
    if (!open && wrap.getBoundingClientRect().top < 0) wrap.scrollIntoView({ block: "start" });
  });
  wrap.append(body, btn);
  return wrap;
}
function measure(wrap) {
  const body = wrap.firstChild, btn = wrap.lastChild;
  if (!body.classList.contains("clamped")) return;
  btn.hidden = !(body.scrollHeight > body.clientHeight + 1);
}
const measureAll = () => document.querySelectorAll(".txt").forEach(measure);

function broken(url, what) {
  const d = el("div", "broken");
  d.append(`${what} could not load. `);
  const a = el("a", null, "Open link");
  a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
  d.append(a);
  return d;
}

function mkImg(src, holder) {
  const img = new Image();
  img.loading = "lazy"; img.decoding = "async"; img.alt = "";
  img.addEventListener("load", () => holder.classList.add("ok"));
  img.addEventListener("error", () => holder.replaceChildren(broken(src, "Photo")));
  img.src = src;
  return img;
}

function galleryBlock(srcs) {
  if (srcs.length === 1) {
    const f = el("figure", "pic"); f.style.margin = "0";
    const img = mkImg(srcs[0], f);
    img.addEventListener("click", () => openLB(srcs, 0));
    f.append(img);
    return f;
  }
  const g = el("div", "gal");
  const track = el("div", "track");
  srcs.forEach((s, i) => {
    const slide = el("div", "slide");
    const img = mkImg(s, slide);
    img.addEventListener("click", () => openLB(srcs, i));
    slide.append(img);
    track.append(slide);
  });
  const count = el("div", "gal-count", `1 / ${srcs.length}`);
  const prev = el("button", "gal-btn gal-prev", "\u2039");
  const next = el("button", "gal-btn gal-next", "\u203A");
  prev.type = next.type = "button";
  prev.setAttribute("aria-label", "Previous photo");
  next.setAttribute("aria-label", "Next photo");
  prev.addEventListener("click", () => track.scrollBy({ left: -track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" }));
  let ticking = false;
  track.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      count.textContent = `${Math.min(i + 1, srcs.length)} / ${srcs.length}`;
    });
  }, { passive: true });
  g.append(track, count, prev, next);
  return g;
}

/* ±10 second buttons, used under video, audio and YouTube */
function skipRow(seek) {
  const row = el("div", "skip");
  [[-10, "\u21BA 10s", "Back 10 seconds"], [10, "10s \u21BB", "Forward 10 seconds"]].forEach(([d, label, aria]) => {
    const b = el("button", "skip-btn", label);
    b.type = "button"; b.setAttribute("aria-label", aria);
    b.addEventListener("click", () => seek(d));
    row.append(b);
  });
  return row;
}
function seekMedia(m, d) {
  const dur = isFinite(m.duration) ? m.duration : Infinity;
  m.currentTime = Math.max(0, Math.min(dur, (m.currentTime || 0) + d));
}

function videoBlock(src) {
  const box = el("div", "player");
  const v = document.createElement("video");
  v.className = "vid"; v.controls = true; v.playsInline = true; v.preload = "metadata";
  v.src = src + "#t=0.001";
  v.addEventListener("error", () => box.replaceChildren(broken(src, "Video")), { once: true });
  box.append(v, skipRow(d => seekMedia(v, d)));
  return box;
}

function audioBlock(src) {
  const box = el("div", "aud");
  const a = document.createElement("audio");
  a.controls = true; a.preload = "none"; a.src = src;
  a.addEventListener("error", () => box.replaceChildren(broken(src, "Audio")), { once: true });
  box.append(a, skipRow(d => seekMedia(a, d)));
  return box;
}

/* YouTube: official IFrame API so the buttons can seek */
let ytApi = null;
const ytPlayers = new Set();
function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve(true);
  if (ytApi) return ytApi;
  ytApi = new Promise(res => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(true); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api"; s.async = true;
    s.onerror = () => res(false);
    document.head.append(s);
    setTimeout(() => res(!!(window.YT && window.YT.Player)), 8000);
  });
  return ytApi;
}
function pauseAllYT(except) {
  ytPlayers.forEach(p => { if (p !== except) { try { p.pauseVideo(); } catch {} } });
}

function youtubeBlock(b) {
  const box = el("div", "player");
  const thumb = el("button", "yt" + (b.short ? " short" : ""));
  thumb.type = "button";
  thumb.setAttribute("aria-label", "Play YouTube video");
  thumb.style.backgroundImage = `url(https://i.ytimg.com/vi/${b.id}/hqdefault.jpg)`;
  thumb.innerHTML = '<span class="yt-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>';

  thumb.addEventListener("click", async () => {
    document.querySelectorAll("video,audio").forEach(m => m.pause());
    pauseAllYT();
    thumb.classList.add("loading");
    const ok = await loadYT();
    const frame = el("div", "ytframe" + (b.short ? " short" : ""));
    const mount = el("div");
    frame.append(mount);
    thumb.replaceWith(frame);

    if (!ok) { // API blocked: plain embed, no skip buttons
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${b.id}?autoplay=1&rel=0&playsinline=1${b.start ? "&start=" + b.start : ""}`;
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.allowFullscreen = true; f.title = "YouTube video";
      frame.replaceChildren(f);
      return;
    }

    let ready = false;
    const vars = { autoplay: 1, rel: 0, playsinline: 1, start: Number(b.start) || 0 };
    if (/^https?:$/.test(location.protocol)) vars.origin = location.origin;
    const player = new YT.Player(mount, {
      host: "https://www.youtube-nocookie.com",
      videoId: b.id, width: "100%", height: "100%", playerVars: vars,
      events: {
        onReady: e => { ready = true; try { e.target.playVideo(); } catch {} },
        onStateChange: e => {
          if (e.data === 1) {
            document.querySelectorAll("video,audio").forEach(m => m.pause());
            pauseAllYT(player);
          }
        }
      }
    });
    ytPlayers.add(player);
    box.append(skipRow(d => {
      if (!ready) return;
      const dur = player.getDuration() || 0;
      let t = player.getCurrentTime() + d;
      t = Math.max(0, dur ? Math.min(dur - 0.5, t) : t);
      player.seekTo(t, true);
    }));
  }, { once: true });

  box.append(thumb);
  return box;
}

function linkBlock(href) {
  const a = el("a", "linkcard");
  a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
  let host = href;
  try { host = new URL(href).hostname.replace(/^www\./, ""); } catch {}
  a.append(el("b", null, host), el("span", null, href));
  return a;
}

function buildBlock(b) {
  switch (b.type) {
    case "text": return textBlock(b.text);
    case "gallery": return galleryBlock(b.srcs);
    case "video": return videoBlock(b.src);
    case "audio": return audioBlock(b.src);
    case "youtube": return youtubeBlock(b);
    default: return linkBlock(b.href);
  }
}

function buildPost(post) {
  const art = el("article", "post");
  const head = el("div", "post-head");
  const img = new Image();
  img.src = avatarUrl; img.alt = ""; img.width = img.height = 40; img.decoding = "async";
  head.append(img, el("b", null, CONFIG.name));
  const body = el("div", "post-body");
  post.blocks.forEach(b => body.append(buildBlock(b)));
  art.append(head, body);
  return art;
}

/* only one media plays at a time */
document.addEventListener("play", e => {
  document.querySelectorAll("video,audio").forEach(m => { if (m !== e.target) m.pause(); });
  pauseAllYT();
}, true);

/* ---------- lightbox ---------- */
const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCount = $("#lbCount");
let lbSrcs = [], lbI = 0, lbFocus = null;
function lbShow() {
  lbImg.src = lbSrcs[lbI];
  const multi = lbSrcs.length > 1;
  lbCount.textContent = multi ? `${lbI + 1} / ${lbSrcs.length}` : "";
  $("#lbPrev").hidden = $("#lbNext").hidden = !multi;
}
function openLB(srcs, i) {
  lbSrcs = srcs; lbI = i; lbFocus = document.activeElement;
  lbShow(); lb.hidden = false;
  document.documentElement.classList.add("lock");
  $("#lbClose").focus();
}
function closeLB() {
  lb.hidden = true; lbImg.removeAttribute("src");
  document.documentElement.classList.remove("lock");
  if (lbFocus && lbFocus.focus) lbFocus.focus();
}
function lbStep(d) { lbI = (lbI + d + lbSrcs.length) % lbSrcs.length; lbShow(); }
$("#lbClose").addEventListener("click", closeLB);
$("#lbPrev").addEventListener("click", () => lbStep(-1));
$("#lbNext").addEventListener("click", () => lbStep(1));
lb.addEventListener("click", e => { if (e.target === lb) closeLB(); });
addEventListener("keydown", e => {
  if (lb.hidden) return;
  if (e.key === "Escape") closeLB();
  else if (e.key === "ArrowLeft" && lbSrcs.length > 1) lbStep(-1);
  else if (e.key === "ArrowRight" && lbSrcs.length > 1) lbStep(1);
});
let tx = null;
lb.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, { passive: true });
lb.addEventListener("touchend", e => {
  if (tx == null || lbSrcs.length < 2) return;
  const dx = e.changedTouches[0].clientX - tx;
  if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
  tx = null;
});

/* ---------- profile header ---------- */
document.title = CONFIG.name;
$("#name").textContent = CONFIG.name;
$("#topName").textContent = CONFIG.name;
$("#avatar").src = avatarUrl;
$("#topAvatar").src = avatarUrl;
if (CONFIG.bio) { const b = $("#bio"); b.textContent = CONFIG.bio; b.hidden = false; }
$("#avatarBtn").addEventListener("click", () => openLB([avatarUrl], 0));
$("#topbar").addEventListener("click", () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
new IntersectionObserver(([e]) => {
  const bar = $("#topbar");
  bar.classList.toggle("show", !e.isIntersecting && e.boundingClientRect.top < 0);
  bar.setAttribute("aria-hidden", String(e.isIntersecting));
}).observe($("#name"));

/* ---------- feed ---------- */
const feed = $("#feed"), sentinel = $("#sentinel");
let posts = [], rendered = 0, loadedHash = "", lastCheck = Date.now();

function renderMore(n) {
  const end = Math.min(rendered + n, posts.length);
  const frag = document.createDocumentFragment();
  for (; rendered < end; rendered++) frag.append(buildPost(posts[rendered]));
  feed.append(frag);
  requestAnimationFrame(measureAll);
}

function notice(html) {
  const d = el("div", "notice");
  d.innerHTML = html;
  feed.replaceChildren(d);
}

async function loadText() {
  let err = "";
  for (const f of CONFIG.files) {
    try {
      const r = await fetch(`${f}?v=${Date.now()}`, { cache: "no-store" });
      if (r.ok) return await r.text();
      err = `${f} returned ${r.status}`;
    } catch (e) { err = e.message; }
  }
  throw new Error(err || "post file not found");
}

/* browser refresh: always fetch fresh posts, then return to the same place */
const SKEY = "alphakhan:scroll";
history.scrollRestoration = "manual";
let saveTimer = 0;
function saveScroll() {
  try {
    const arts = feed.children;
    let i = -1;
    for (let k = 0; k < arts.length; k++) {
      if (arts[k].getBoundingClientRect().bottom > 60) { i = k; break; }
    }
    const data = (i < 0 || !posts[i]) ? { y: scrollY }
      : { key: posts[i].key, i, off: -arts[i].getBoundingClientRect().top, y: scrollY };
    sessionStorage.setItem(SKEY, JSON.stringify(data));
  } catch {}
}
addEventListener("scroll", () => {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = 0; saveScroll(); }, 200);
}, { passive: true });
addEventListener("pagehide", saveScroll);

function restoreScroll() {
  const nav = (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]);
  if (!nav || !/reload|back_forward/.test(nav.type)) return;
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem(SKEY)); } catch {}
  if (!s) return;
  let go;
  if (s.key === undefined) {
    go = () => scrollTo(0, s.y || 0);
  } else {
    let idx = posts.findIndex(p => p.key === s.key);
    if (idx < 0) idx = Math.min(s.i, posts.length - 1);
    if (idx < 0) return;
    while (rendered <= idx + 2 && rendered < posts.length) renderMore(CONFIG.batch);
    measureAll();
    go = () => {
      const a = feed.children[idx];
      if (a) scrollTo(0, a.getBoundingClientRect().top + scrollY + (s.off || 0));
    };
  }
  go();
  let moved = false;
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(ev =>
    addEventListener(ev, () => { moved = true; }, { once: true, passive: true }));
  [350, 1000].forEach(t => setTimeout(() => { if (!moved) go(); }, t));
}

async function init() {
  let text;
  try {
    text = await loadText();
  } catch (e) {
    const local = location.protocol === "file:";
    notice(`<b>Posts could not be loaded.</b><br>${local
      ? "This page was opened as a local file. Browsers block reading post.txt that way. Publish on GitHub Pages or run a local server."
      : "Make sure post.txt is in the same folder as index.html."}`);
    $("#stats").textContent = "";
    return;
  }
  loadedHash = hash(text);
  posts = parsePosts(text);
  $("#stats").textContent = `${posts.length} ${posts.length === 1 ? "post" : "posts"}`;
  if (!posts.length) {
    notice("<b>No posts yet.</b><br>Write text in post.txt. Put a line with only <b>$</b> between two posts.");
    return;
  }
  renderMore(CONFIG.batch);
  restoreScroll();
  new IntersectionObserver(es => {
    if (es[0].isIntersecting && rendered < posts.length) renderMore(CONFIG.batch);
  }, { rootMargin: "1400px 0px" }).observe(sentinel);
}

/* tell the viewer when new posts were published while the tab was open */
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || !loadedHash) return;
  if (Date.now() - lastCheck < 30000) return;
  lastCheck = Date.now();
  try {
    const t = await loadText();
    if (hash(t) !== loadedHash) $("#newPill").hidden = false;
  } catch {}
});
$("#newPill").addEventListener("click", () => location.reload());

let rt = 0;
addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(measureAll, 150);
});

/* ---------- binary rain ---------- */
(function rain() {
  const c = $("#rain"), x = c.getContext("2d");
  const fs = 16;
  let w = 0, h = 0, drops = [], last = 0, running = true;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
    drops = Array.from({ length: Math.ceil(w / fs) }, () => -Math.random() * (h / fs));
  }
  function step() {
    x.fillStyle = "rgba(0,0,0,.12)";
    x.fillRect(0, 0, w, h);
    x.font = `${fs}px ui-monospace,Menlo,Consolas,monospace`;
    for (let i = 0; i < drops.length; i++) {
      if (drops[i] >= 0) {
        x.fillStyle = Math.random() < .08 ? "#d8ffe0" : "#19ff4a";
        x.fillText(Math.random() < .5 ? "0" : "1", i * fs, drops[i] * fs);
      }
      if (drops[i] * fs > h && Math.random() > .975) drops[i] = 0;
      drops[i]++;
    }
  }
  function loop(t) {
    if (!running) return;
    if (t - last > 55) { last = t; step(); }
    requestAnimationFrame(loop);
  }
  size();
  let rs = 0;
  addEventListener("resize", () => { clearTimeout(rs); rs = setTimeout(size, 200); });
  if (reduceMotion) {
    for (let i = 0; i < 70; i++) step();
    return;
  }
  document.addEventListener("visibilitychange", () => {
    running = document.visibilityState === "visible";
    if (running) requestAnimationFrame(loop);
  });
  requestAnimationFrame(loop);
})();

init();
})();
