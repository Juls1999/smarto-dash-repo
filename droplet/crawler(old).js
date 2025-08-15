const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const crypto = require("crypto");
const iconv = require("iconv-lite");

const visited = new Set();
const queue = [];
let pageCounter = 1;

const mysql = require("mysql2");
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "user",
  password: "password",
  database: "chatbot_db",
});

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
];

function normalizeUrl(url) {
  const u = new URL(url);
  return u.origin + u.pathname.replace(/\/$/, "");
}

function urlPathToFilename(url) {
  const u = new URL(url);
  const path = u.pathname.replace(/^\/|\/$/g, ""); // remove leading/trailing slashes
  return path ? `${path}.txt` : "index.txt";
}

function hashContent(content) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
}

function fixMojibake(text) {
  return text
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€˜/g, "‘")
    .replace(/â€™/g, "’")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€¦/g, "…")
    .replace(/Â/g, "") // typically non-breaking space or stray byte
    .replace(/\u00A0/g, " "); // normalize NBSP to regular space
}

function sanitizeForAI(text) {
  if (!text) return "";

  return (
    text
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII
      // Better targeted redactions:
      .replace(/\b[a-f0-9]{32,64}\b/gi, "[REDACTED]") // MD5/SHA hashes
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED]") // SSN
      .replace(/\b[A-Z]{1,2}-?\d{6,9}\b/g, "[REDACTED]") // License/NRIC-like
      // Remove extra whitespace/newlines
      .replace(/ +/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

async function tryNavigate(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 180000 });
      return;
    } catch (err) {
      console.warn(`🔁 Retry ${i + 1} for ${url}: ${err.message}`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  throw new Error(`Failed to load after ${retries} retries`);
}

async function getOrCreateDomainId(domainName) {
  const [rows] = await db
    .promise()
    .query("SELECT id FROM domains WHERE domain_name = ?", [domainName]);
  if (rows.length > 0) return rows[0].id;

  const [result] = await db
    .promise()
    .query("INSERT INTO domains (domain_name) VALUES (?)", [domainName]);
  console.log(`🆕 Inserted domain: ${domainName} with ID ${result.insertId}`);
  return result.insertId;
}

async function crawlPage(browser, pageUrl, domain, domainId) {
  const normalizedUrl = normalizeUrl(pageUrl);
  if (visited.has(normalizedUrl)) return;
  visited.add(normalizedUrl);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      userAgents[Math.floor(Math.random() * userAgents.length)]
    );
    await tryNavigate(page, pageUrl);
    await page.waitForSelector("main, article, body", {
      visible: true,
      timeout: 180000,
    });
    await new Promise((res) => setTimeout(res, 5000));
    await page
      .waitForSelector("h1", { visible: true, timeout: 30000 })
      .catch(() => null);

    const articleTitle = await page
      .$eval("h1", (el) => el.innerText.trim())
      .catch(() => null);

    let fileName = urlPathToFilename(pageUrl);
    let sanitizedTitle = fileName.replace(/\.txt$/, "");
    let suffix = 1;

    // Ensure unique filename
    const [existingFiles] = await db
      .promise()
      .query(
        "SELECT file_name FROM crawl_outputs WHERE domain_id = ? AND file_name LIKE ?",
        [domainId, `${sanitizedTitle}%`]
      );

    const existingSet = new Set(existingFiles.map((row) => row.file_name));

    while (existingSet.has(fileName)) {
      fileName = `${sanitizedTitle}_${suffix++}.txt`;
    }

    // 🧭 Collect links BEFORE content cleaning
    const links = await page.$$eval("a", (as) =>
      as.map((a) => a.href).filter((href) => href.startsWith("http"))
    );

    // 🧹 Extract cleaned content
    const { content, raw_html } = await page.evaluate(() => {
      const container = document.querySelector("main, article, body");
      if (!container) return { content: [], raw_html: "" };

      // Remove unwanted structural sections
      container
        .querySelectorAll("header, footer, nav, aside, script, style")
        .forEach((el) => el.remove());

      // ✅ REMOVE ALL <a> TAGS before further processing
      container.querySelectorAll("a").forEach((a) => a.remove());

      // ❌ Remove <li> or <ul> that are now empty after <a> removal
      container.querySelectorAll("li, ul").forEach((el) => {
        if (!el.textContent.trim() && el.querySelectorAll("img").length === 0) {
          el.remove();
        }
      });

      const elements = Array.from(
        container.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, li, img")
      ).filter((el) => {
        const style = window.getComputedStyle(el);
        const isVisible =
          style.display !== "none" && style.visibility !== "hidden";

        // 🧼 Skip list items if part of a UL
        if (el.tagName === "LI" && el.closest("ul")) return false;

        // 🧼 Skip images if already inside P or LI (they’ll be handled there)
        if (el.tagName === "IMG" && (el.closest("p") || el.closest("li")))
          return false;

        return isVisible;
      });

      const processedOuterHTML = new Set();

      const content = elements.map((el) => {
        const tag = el.tagName;
        const text = el.innerText?.trim() || "";

        const outer = el.outerHTML;
        if (processedOuterHTML.has(outer)) return null;
        processedOuterHTML.add(outer);

        if (tag.startsWith("H")) {
          return { type: "heading", level: parseInt(tag[1]), text };
        } else if (tag === "P") {
          const images = Array.from(el.querySelectorAll("img")).map((img) => ({
            type: "image",
            src: img.src,
            alt: img.alt || null,
          }));
          const items = [{ type: "paragraph", text }];
          return [...items, ...images];
        } else if (tag === "UL") {
          const items = Array.from(el.querySelectorAll("li")).map((li) => {
            const liImages = Array.from(li.querySelectorAll("img")).map(
              (img) => ({
                type: "image",
                src: img.src,
                alt: img.alt || null,
              })
            );
            return [
              { type: "list_item", text: li.innerText.trim() },
              ...liImages,
            ];
          });
          return { type: "list", items: items.flat() };
        } else if (tag === "LI") {
          const liImages = Array.from(el.querySelectorAll("img")).map(
            (img) => ({
              type: "image",
              src: img.src,
              alt: img.alt || null,
            })
          );
          return [{ type: "list_item", text }, ...liImages];
        } else if (tag === "IMG") {
          return {
            type: "image",
            src: el.src,
            alt: el.alt || null,
          };
        }

        return null;
      });

      const flatContent = content.flat().filter(Boolean);
      const raw_html = elements.map((el) => el.outerHTML).join("\n");

      return { content: flatContent, raw_html };
    });

    // 🔤 Generate plain_text from structured content
    const unsanitized_text = content
      .map((item) => {
        if (item.type === "heading")
          return `${"#".repeat(item.level)} ${item.text}`;
        if (item.type === "paragraph") return item.text;
        if (item.type === "list_item") return `- ${item.text}`;
        if (item.type === "list" && Array.isArray(item.items)) {
          return item.items
            .map((i) => {
              if (i.type === "list_item") return `- ${i.text}`;
              if (i.type === "image") return `[Image: ${i.alt || "No alt"}]`;
            })
            .join("\n");
        }
        if (item.type === "image") return `[Image: ${item.alt || "No alt"}]`;
        return null;
      })
      .filter(Boolean)
      .join("\n\n");

    const plain_text = sanitizeForAI(fixMojibake(unsanitized_text));

    // ✨ Save raw_html to DB, plain_text will go to S3 later
    const structuredData = {
      article_title: articleTitle || sanitizedTitle,
      source_url: pageUrl,
      raw_html: raw_html, // stored in DB
      content_hash: hashContent(plain_text), // hash plain text to detect edits
    };

    // Save in crawl_outputs
    await db
      .promise()
      .query(
        "INSERT INTO crawl_outputs (domain_id, file_name, file_content, raw_html, content_hash) VALUES (?, ?, ?, ?, ?)",
        [
          domainId,
          fileName,
          Buffer.from(plain_text),
          raw_html,
          structuredData.content_hash,
        ]
      );
    console.log(`✅ Saved to DB: ${fileName} from ${pageUrl}`);

    // Add filtered links to the queue
    for (const link of links) {
      try {
        const url = new URL(link);
        const normalized = normalizeUrl(link);
        if (
          url.hostname === domain &&
          !visited.has(normalized) &&
          !queue.includes(normalized)
        ) {
          queue.push(normalized);
        }
      } catch (err) {
        console.error(`❌ Invalid URL in links: ${err.message}`);
      }
    }

    await page.close();
  } catch (err) {
    console.error(`❌ Failed to load ${pageUrl}: ${err.message}`);
  }
}

(async () => {
  const seedURL = process.argv[2];
  const jobId = process.argv[3];

  if (!seedURL || !jobId) {
    console.error("❌ Missing seed URL or job ID.");
    process.exit(1);
  }

  const seedDomain = new URL(seedURL).hostname;
  const domainId = await getOrCreateDomainId(seedDomain);

  await db
    .promise()
    .query("UPDATE crawl_jobs SET status = ? WHERE job_id = ?", [
      "in_progress",
      jobId,
    ]);

  const normalizedSeed = normalizeUrl(seedURL);
  queue.push(normalizedSeed);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  while (queue.length > 0) {
    const nextURL = queue.shift();
    console.log("🌐 Visiting:", nextURL);
    await crawlPage(browser, nextURL, seedDomain, domainId);
    await new Promise((r) => setTimeout(r, 500));
  }
  await browser.close();

  await db
    .promise()
    .query("UPDATE crawl_jobs SET status = ? WHERE job_id = ?", [
      "completed",
      jobId,
    ]);
  db.end();
})();

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  const jobId = process.argv[3];
  db.query(
    "UPDATE crawl_jobs SET status = ? WHERE job_id = ?",
    ["failed", jobId],
    () => {
      db.end();
      process.exit(1);
    }
  );
});

process.on("unhandledRejection", (err) => {
  console.error("💥 Unhandled Rejection:", err);
  const jobId = process.argv[3];
  db.query(
    "UPDATE crawl_jobs SET status = ? WHERE job_id = ?",
    ["failed", jobId],
    () => {
      db.end();
      process.exit(1);
    }
  );
});
