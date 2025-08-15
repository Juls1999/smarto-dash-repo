const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());

// ✅ MySQL connection (adjust as needed)
const mysql = require("mysql2");
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "user",
  password: "password",
  database: "chatbot_db",
});

// ✅ In-memory job tracker (temporary, optional)
const jobs = {}; // { jobId: { status, domain } }

app.get("/crawl", (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Missing ?url param" });

  const jobId = uuidv4();
  const domain = new URL(targetUrl).hostname;
  const status = "pending";

  jobs[jobId] = { status, domain };

  // ✅ Insert initial crawl job into DB
  db.query(
    "INSERT INTO crawl_jobs (job_id, seed_url, domain, status) VALUES (?, ?, ?, ?)",
    [jobId, targetUrl, domain, status],
    (err) => {
      if (err) console.error("❌ DB insert error:", err);
    }
  );

  // 🔁 Start the actual crawl process
  const command = `node /root/crawler.js "${targetUrl}"`;
  const outFile = `/tmp/crawl-${jobId}.log`;

  const child = exec(command, (err, stdout, stderr) => {
    if (err) {
      jobs[jobId].status = "failed";
      jobs[jobId].error = stderr || err.message;

      db.query(
        "UPDATE crawl_jobs SET status = ? WHERE job_id = ?",
        ["failed", jobId],
        (err) => {
          if (err) console.error("❌ DB update failed:", err);
        }
      );
    } else {
      jobs[jobId].status = "completed";

      db.query(
        "UPDATE crawl_jobs SET status = ? WHERE job_id = ?",
        ["completed", jobId],
        (err) => {
          if (err) console.error("❌ DB update failed:", err);
        }
      );
    }
  });

  // Optional: Save logs to file
  child.stdout?.pipe(fs.createWriteStream(outFile));
  child.stderr?.pipe(fs.createWriteStream(outFile));

  // ✅ Respond immediately (async behavior)
  res.json({ success: true, jobId });
});

// 🔍 Job status endpoint
app.get("/status/:jobId", (req, res) => {
  const jobId = req.params.jobId;
  const job = jobs[jobId];

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
});

// CRAWL HISTORY
app.get("/crawl-history", (req, res) => {
  db.query(
    "SELECT job_id, seed_url, domain, status, created_at FROM crawl_jobs ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching crawl history:", err);
        return res
          .status(500)
          .json({ error: "Failed to fetch crawl history." });
      }

      res.json({ jobs: results });
    }
  );
});

// 🗂️ List output files
app.get("/files", (req, res) => {
  const domain = req.query.domain;
  if (!domain) return res.status(400).send("Missing ?domain param");

  const outputDir = path.join("/var/www/html/output", domain);

  if (!fs.existsSync(outputDir)) {
    return res.status(404).send("Domain folder not found");
  }

  const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".json"));
  res.json({ domain, files });
});

// 📄 Get file content
app.get("/file", (req, res) => {
  const { domain, file } = req.query;
  if (!domain || !file)
    return res.status(400).send("Missing ?domain or ?file param");

  const filePath = path.join("/var/www/html/output", domain, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    res.json(JSON.parse(content));
  } catch (e) {
    res.status(500).send("Failed to parse JSON");
  }
});

// ✅ Start API server
app.listen(3000, () => {
  console.log("🚀 API listening on port 3000");
});
