#!/usr/bin/env node
/*
 * build-docs.js: render docs/manual.md into docs/index.html.
 *
 * No dependencies. It understands the small subset of Markdown this project's
 * manual actually uses: headings, paragraphs, ordered and unordered lists,
 * fenced code, blockquotes, simple tables, horizontal rules, and inline
 * bold/italic/code/links.
 *
 * Usage:  node tools/build-docs.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "docs", "manual.md");
const OUT = path.join(ROOT, "docs", "index.html");

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inline(raw) {
  let s = escapeHtml(raw);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return s;
}

function isTableSep(line) {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");
}

function splitRow(line) {
  let l = line.trim();
  if (l.startsWith("|")) l = l.slice(1);
  if (l.endsWith("|")) l = l.slice(0, -1);
  return l.split("|").map((c) => c.trim());
}

function render(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const toc = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; // closing fence
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // Headings
    let m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();
      const id = slugify(text);
      if (level === 2) toc.push({ level: 2, text, id });
      if (level === 3) toc.push({ level: 3, text, id });
      const anchor = level === 2 || level === 3 ? ` <a class="anchor" href="#${id}" aria-label="link to this section">#</a>` : "";
      out.push(`<h${level} id="${id}">${inline(text)}${anchor}</h${level}>`);
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      let html = "<table><thead><tr>";
      head.forEach((h) => (html += `<th>${inline(h)}</th>`));
      html += "</tr></thead><tbody>";
      rows.forEach((r) => {
        html += "<tr>";
        r.forEach((c) => (html += `<td>${inline(c)}</td>`));
        html += "</tr>";
      });
      html += "</tbody></table>";
      out.push(html);
      continue;
    }

    // Blockquote
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }

    // Lists (ordered or unordered, one level of nesting)
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      let html = ordered ? "<ol>" : "<ul>";
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
        html += `<li>${inline(content)}</li>`;
        i++;
      }
      html += ordered ? "</ol>" : "</ul>";
      out.push(html);
      continue;
    }

    // Blank
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: gather until blank or a block starter
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^```/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }

  const tocHtml = toc
    .map((t) => `<a class="${t.level === 3 ? "sub" : ""}" href="#${t.id}">${escapeHtml(t.text)}</a>`)
    .join("\n        ");

  return { body: out.join("\n"), toc: tocHtml };
}

const md = fs.readFileSync(SRC, "utf8");
const { body, toc } = render(md);

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PlayPort manual</title>
<meta name="description" content="The PlayPort manual: install it, run game servers, host websites, add HTTPS and back everything up, in plain language.">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="stylesheet" href="../assets/site.css">
</head>
<body>

<header class="site">
  <div class="wrap nav">
    <a class="brand" href="../index.html"><img src="../assets/wordmark-transparent.svg" alt="PlayPort"></a>
    <nav class="links">
      <a class="link" href="../index.html#features">Features</a>
      <a class="link" href="../demo.html">Live demo</a>
      <a class="link" href="../index.html#faq">FAQ</a>
      <a class="dl-btn" href="../download/PlayPort.exe" download>Download</a>
    </nav>
  </div>
</header>

<main class="wrap" style="padding-top:32px">
  <div class="docs-layout">
    <nav class="docs-toc">
      <h4>On this page</h4>
      ${toc}
    </nav>
    <article class="docs-body">
${body}
    </article>
  </div>
</main>

<footer class="site">
  <div class="wrap">
    <p style="margin:0">PlayPort. Hosting together. On your terms.</p>
    <p style="margin:12px 0 0"><a href="../index.html">Home</a> &middot; <a href="../demo.html">Demo</a> &middot; <a href="../DISCLAIMER.md">Disclaimer</a> &middot; <a href="../LICENSE">Licence</a>. Copyright &copy; 2026 Joshua van Doorn, trading as PlayPort.</p>
  </div>
</footer>

</body>
</html>
`;

fs.writeFileSync(OUT, page);
console.log("wrote " + path.relative(ROOT, OUT) + " (" + page.length + " bytes, " + toc.split("\n").length + " toc entries)");
