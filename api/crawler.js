const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const crypto = require("crypto");

const visited = new Set();
const queue = [];
let pageCounter = 1;

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
];

function normalizeUrl(url) {
  const u = new URL(url);
  return u.origin + u.pathname.replace(/\/$/, "");
}

function sanitizeFilename(title) {
  return title.replace(/[<>:"/\\|?*]+/g, "_").trim();
}

async function tryNavigate(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 180000 }); // ⏱️ 3 mins
      return;
    } catch (err) {
      console.warn(`🔁 Retry ${i + 1} for ${url}: ${err.message}`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
  throw new Error(`Failed to load after ${retries} retries`);
}

function saveSession(sessionPath) {
  const sessionData = {
    visited: [...visited],
    queue: [...queue],
  };
  fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), "utf-8");
}

function loadSession(sessionPath, outputDir) {
  if (!fs.existsSync(sessionPath))
    return { visitedSet: new Set(), queueList: [] };

  const raw = JSON.parse(fs.readFileSync(sessionPath));
  const visitedSet = new Set(raw.visited || []);
  const queueList = raw.queue || [];

  visitedSet.forEach((url) => {
    const fileName = sanitizeFilename(url) + ".json";
    const filePath = path.join(outputDir, fileName);
    if (fs.existsSync(filePath)) {
      const existingData = JSON.parse(fs.readFileSync(filePath));
      const currentHash = hashContent(existingData.content);
      if (existingData.content_hash !== currentHash) {
        console.log(`⚠️ Content changed for ${fileName}, will re-crawl.`);
        queueList.push(url);
      }
    }
  });

  return { visitedSet, queueList };
}

function hashContent(content) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
}

async function crawlPage(browser, pageUrl, domain, outputDir, sessionPath) {
  const normalizedUrl = normalizeUrl(pageUrl);
  if (visited.has(normalizedUrl)) return;
  visited.add(normalizedUrl);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      userAgents[Math.floor(Math.random() * userAgents.length)]
    );
    await tryNavigate(page, pageUrl); // uses 180000 timeout

    await page.waitForSelector("main, article, body", {
      visible: true,
      timeout: 180000, // ⏱️ wait up to 3 minutes
    });

    await new Promise((res) => setTimeout(res, 5000)); // ⏱️ extra buffer

    await page
      .waitForSelector("h1", { visible: true, timeout: 30000 })
      .catch(() => null);

    const articleTitle = await page
      .$eval("h1", (el) => el.innerText.trim())
      .catch(() => null);
    const sanitizedTitle = sanitizeFilename(
      articleTitle || `untitled_${pageCounter++}`
    );
    let fileName = `${sanitizedTitle}.json`;
    let filePath = path.join(outputDir, fileName);
    let suffix = 1;

    while (fs.existsSync(filePath)) {
      fileName = `${sanitizedTitle}_${suffix++}.json`;
      filePath = path.join(outputDir, fileName);
    }

    const content = await page.evaluate(() => {
      const container = document.querySelector("main, article, body");
      if (!container) return [];
      const elements = container.querySelectorAll("h1, h2, h3, h4, h5, h6, p");

      return Array.from(elements)
        .map((el) => {
          const tag = el.tagName;
          const text = el.innerText.trim();
          if (!text) return null;

          if (tag.startsWith("H")) {
            return {
              type: "heading",
              level: parseInt(tag[1]),
              text,
            };
          } else {
            return {
              type: "paragraph",
              text,
            };
          }
        })
        .filter(Boolean);
    });

    const contentHash = hashContent(content);

    if (fs.existsSync(filePath)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(filePath));
        if (existingData.content_hash === contentHash) {
          console.log(`⚠️ Skipped (unchanged): ${fileName}`);
          await page.close();
          return;
        }
      } catch (err) {
        console.warn(`⚠️ Could not read existing file: ${fileName}`);
      }
    }

    const plainText = content
      .map((item) =>
        item.type === "heading" ? `${item.text}\n` : `${item.text}\n`
      )
      .join("\n")
      .trim();

    const structuredData = {
      article_title: articleTitle || sanitizedTitle,
      source_url: pageUrl,
      plain_text: plainText,
      content_hash: hashContent(plainText),
    };

    fs.writeFileSync(
      filePath,
      JSON.stringify(structuredData, null, 2),
      "utf-8"
    );
    console.log(`✅ Saved: ${fileName} from ${pageUrl}`);

    const links = await page.$$eval("a", (as) =>
      as.map((a) => a.href).filter((href) => href.startsWith("http"))
    );

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
    saveSession(sessionPath);

   
  } catch (err) {
    console.error(`❌ Failed to load ${pageUrl}: ${err.message}`);
  }
}

(async () => {
  const seedURL = process.argv[2];
  if (!seedURL) {
    console.error("❌ Please provide a seed URL.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const seedDomain = new URL(seedURL).hostname;
  // const outputDir = path.join(__dirname, "output", seedDomain);
  const outputDir = path.join("/var/www/html/output", seedDomain);
  // const sessionDir = path.join(__dirname, "session");
  const sessionDir = path.join("/var/www/html/session");
  const sessionPath = path.join(sessionDir, `${seedDomain}.json`);


  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(sessionDir, { recursive: true });

  if (args.includes("--clear-session")) {
    if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
    console.log("🧹 Cleared previous session.");
  }

  const { visitedSet, queueList } = loadSession(sessionPath, outputDir);
  visited.clear();
  queue.length = 0;
  for (const v of visitedSet) visited.add(v);
  for (const q of queueList) queue.push(q);

  if (queue.length === 0) {
    const normalizedSeed = normalizeUrl(seedURL);
    queue.push(normalizedSeed);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  while (queue.length > 0) {
    const nextURL = queue.shift();
    console.log("🌐 Visiting:", nextURL);
    await crawlPage(browser, nextURL, seedDomain, outputDir, sessionPath);
    await new Promise((r) => setTimeout(r, 500));
  }

  await browser.close();
  console.log("🏁 Crawling complete.");
})();
