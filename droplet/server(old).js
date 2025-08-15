const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const app = express();
app.use(express.json());



// const allowedOrigins = ["https://jul.myteam.sg", "http://localhost"];

// app.use((req, res, next) => {
//   const origin = req.headers.origin;
//   if (allowedOrigins.includes(origin)) {
//     res.setHeader("Access-Control-Allow-Origin", origin);
//     res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
//     res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
//   }
//   if (req.method === "OPTIONS") {
//     return res.sendStatus(200);
//   }
//   next();
// });

// const API_KEY = process.env.CUSTOM_API_KEY;

// app.use((req, res, next) => {
//   const key = req.headers["x-api-key"];
//   if (key !== API_KEY) {
//     return res.status(403).json({ error: "Forbidden - Invalid API Key" });
//   }
//   next();
// });

// ✅ MySQL connection (adjust as needed)
const mysql = require("mysql2");
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "user",
  password: "password",
  database: "chatbot_db",
});

app.post("/crawl", express.json(), (req, res) => {
  const targetUrl = req.body.url;

  if (!targetUrl)
    return res.status(400).json({ error: "Missing 'url' in body" });

  const jobId = uuidv4();
  const domainName = new URL(targetUrl).hostname;
  const status = "pending";

  db.query(
    "SELECT id FROM domains WHERE domain_name = ?",
    [domainName],
    (err, rows) => {
      if (err) {
        console.error("❌ Failed to check domain:", err);
        return res.status(500).json({ error: "Domain lookup failed" });
      }

      const insertJob = (domainId) => {
        db.query(
          "INSERT INTO crawl_jobs (job_id, seed_url, domain_id, status) VALUES (?, ?, ?, ?)",
          [jobId, targetUrl, domainId, status],
          (err2) => {
            if (err2) {
              console.error("❌ Failed to insert crawl job:", err2);
              return res.status(500).json({ error: "Insert failed" });
            }

            const command = `node /root/crawler.js "${targetUrl}" "${jobId}"`;
            const outFile = `/tmp/crawl-${jobId}.log`;
            const child = exec(command);
            child.stdout?.pipe(fs.createWriteStream(outFile));
            child.stderr?.pipe(fs.createWriteStream(outFile));

            res.json({ success: true, jobId });
          }
        );
      };

      if (rows.length > 0) {
        insertJob(rows[0].id);
      } else {
        db.query(
          "INSERT INTO domains (domain_name) VALUES (?)",
          [domainName],
          (err3, result) => {
            if (err3) {
              console.error("❌ Failed to insert domain:", err3);
              return res.status(500).json({ error: "Domain insert failed" });
            }
            insertJob(result.insertId);
          }
        );
      }
    }
  );
});

// CRAWL HISTORY
app.get("/crawl-history", (req, res) => {
  db.query(
    "SELECT cj.job_id, cj.seed_url, d.domain_name AS domain, cj.status, cj.created_at FROM crawl_jobs cj JOIN domains d ON cj.domain_id = d.id",
    (err, results) => {
      if (err) {
        console.error("❌ Error fetching crawl history:", err);
        return res
          .status(500)
          .json({ error: "Failed to fetch crawl history." });
      }

      // Convert UTC timestamps to Asia/Manila
      const formatted = results.map((row) => ({
        ...row,
        created_at: new Date(row.created_at).toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
        }),
      }));

      res.json({ jobs: formatted });
    }
  );
});

// List Domain Files (Webcrawler Page)
app.get("/domain-files", (req, res) => {
  // Get all domains
  db.query(
    "SELECT id, domain_name FROM domains ORDER BY domain_name ASC",
    async (err, rows) => {
      if (err) {
        console.error("❌ Failed to fetch domains:", err);
        return res.status(500).json({ error: "Failed to fetch domain list" });
      }

      const domains = rows;

      // Build a list of promises to fetch files per domain
      const results = await Promise.allSettled(
        domains.map((domainRow) => {
          return new Promise((resolve, reject) => {
            db.query(
              `SELECT file_name, content_hash, uploaded_hash
               FROM crawl_outputs
               WHERE domain_id = ?
               ORDER BY created_at DESC`,
              [domainRow.id],
              (err2, files) => {
                if (err2) return reject(err2);

                const fileList = files.map((file) => ({
                  domain_name: domainRow.domain_name,
                  file_name: file.file_name,
                  content_hash: file.content_hash,
                  uploaded_hash: file.uploaded_hash,
                }));

                resolve(fileList);
              }
            );
          });
        })
      );

      // Merge all successful results
      const flattenedResults = results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => r.value); // r.value is an array of files

      res.json({ files: flattenedResults });
    }
  );
});


// 🗂️ List output files
app.get("/files", (req, res) => {
  const domainFilter = req.query.domain;

  const sql = `
    SELECT
      d.domain_name,
      co.id,
      co.file_name,
      co.file_content,
      co.raw_html,
      co.has_uploaded,
      co.uploaded_at,
      co.content_hash,
      co.uploaded_hash
    FROM crawl_outputs co
    JOIN domains d ON co.domain_id = d.id
    ${domainFilter ? "WHERE d.domain_name = ?" : ""}
    ORDER BY d.domain_name ASC, co.created_at DESC
  `;

  const params = domainFilter ? [domainFilter] : [];

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("❌ Failed to fetch files:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    const domainMap = {};

    rows.forEach((f) => {
      const domain = f.domain_name;
      if (!domainMap[domain]) domainMap[domain] = [];

      const fileContent = f.file_content?.toString("utf-8") || "";
      const rawHtml = f.raw_html?.toString("utf-8") || "";

      const status = f.uploaded_hash
        ? f.uploaded_hash === f.content_hash
          ? "indexed"
          : "edited"
        : "not_indexed";

      domainMap[domain].push({
        id: f.id,
        name: f.file_name,
        file_content: fileContent,
        raw_html: rawHtml,
        has_uploaded: f.has_uploaded,
        uploaded_at: f.uploaded_at,
        content_hash: f.content_hash,
        uploaded_hash: f.uploaded_hash,
        status,
        edited_since_upload: status === "edited",
      });
    });

    if (domainFilter) {
      const files = domainMap[domainFilter] || [];
      return res.json({ domain: domainFilter, files });
    } else {
      const domains = Object.keys(domainMap).map((d) => ({
        domain: d,
        files: domainMap[d],
        has_uploaded: domainMap[d].some((f) => f.has_uploaded),
      }));
      return res.json({ domains });
    }
  });
});


// 📄 Get file content
app.get("/file", (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing ?id param" });

  db.query(
    `SELECT co.file_content, co.raw_html, co.has_uploaded, co.content_hash, co.uploaded_hash, d.domain_name
   FROM crawl_outputs co
   JOIN domains d ON co.domain_id = d.id
   WHERE co.id = ?`,
    [id],
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.status(404).json({ error: "File not found" });
      }

      const file = rows[0];
      const plainText = file.file_content.toString("utf-8");
      const rawHtml = file.raw_html || null;

      const latestHash = crypto
        .createHash("sha256")
        .update(file.file_content)
        .digest("hex");

      const edited = file.content_hash !== file.uploaded_hash;

      const uploadedHash = file.uploaded_hash;

      res.json({
        plain_text: plainText,
        raw_html: rawHtml,
        has_uploaded: !!file.has_uploaded,
        content_hash: file.content_hash || null,
        uploaded_hash: uploadedHash || null,
        latest_hash: latestHash,
        edited_since_upload: edited,
        domain: file.domain_name,
      });
    }
  );
});

const AWS = require("aws-sdk");

// Configure DigitalOcean Spaces
const spacesEndpoint = new AWS.Endpoint("tor1.digitaloceanspaces.com");
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.SPACE_KEY,
  secretAccessKey: process.env.SPACE_SECRET,
  region: "tor1",
});

const crypto = require("crypto");

app.post("/upload-to-space", (req, res) => {
  const sql = `
    SELECT co.id, co.file_name, co.file_content, d.id as domain_id, d.domain_name, co.uploaded_hash
    FROM crawl_outputs co
    INNER JOIN domains d ON co.domain_id = d.id
  `;

  db.query(sql, async (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "DB query failed" });
    }

    const filesToUpload = rows.filter((row) => {
      try {
        const contentStr = row.file_content.toString("utf-8");

        let plainText = "";
        try {
          const json = JSON.parse(contentStr);
          plainText = json.plain_text || "";
        } catch {
          plainText = contentStr;
        }

        const latestHash = crypto
          .createHash("sha256")
          .update(plainText)
          .digest("hex");

        return !row.uploaded_hash || row.uploaded_hash !== latestHash;
      } catch (err) {
        console.error("❌ Error in hash check:", err);
        return false;
      }
    });

    const uploadPromises = filesToUpload.map((row) => {
      try {
        const contentStr = row.file_content.toString("utf-8");

        let plainText = "";
        try {
          const json = JSON.parse(contentStr);
          plainText = json.plain_text || "";
        } catch {
          plainText = contentStr;
        }

        const plainTextBuffer = Buffer.from(plainText, "utf-8");

        const contentHash = crypto
          .createHash("sha256")
          .update(plainTextBuffer)
          .digest("hex");

        const key = `${row.domain_name}/${row.file_name.replace(/ /g, "-")}`;

        return s3
          .putObject({
            Bucket: "smarto-dash-bucket",
            Key: key,
            Body: plainTextBuffer,
            ACL: "public-read",
            ContentType: "text/plain",
          })
          .promise()
          .then(() => {
            return new Promise((resolve, reject) => {
              db.query(
                `
                UPDATE crawl_outputs
                SET has_uploaded = 1,
                    uploaded_at = NOW(),
                    content_hash = ?,
                    uploaded_hash = ?
                WHERE id = ?
              `,
                [contentHash, contentHash, row.id],
                (err2) => {
                  if (err2) return reject(err2);
                  resolve(`Uploaded: ${row.file_name}`);
                }
              );
            });
          });
      } catch (err) {
        console.error(`❌ Upload error for ID ${row.id}:`, err);
        return Promise.resolve(null);
      }
    });

    try {
      const uploaded = (await Promise.all(uploadPromises)).filter(Boolean);

      if (uploaded.length > 0) {
        db.query("UPDATE crawl_jobs SET has_uploaded = 1, updated_at = NOW()");
      }

      res.json({ success: true, uploaded });
    } catch (e) {
      console.error("❌ Upload failed:", e);
      res.status(500).json({ error: "Some files failed to upload" });
    }
  });
});

app.put("/file/:id", express.json(), (req, res) => {
  const fileId = req.params.id;
  const { content, format = "json" } = req.body;

  if (!content || !fileId) {
    return res.status(400).json({ error: "Missing file ID or content" });
  }

  try {
    let buffer;
    let rawHtml = "";

    // Handle plain vs JSON format
    if (format === "text") {
      const plainText =
        typeof content === "string" ? content : content.plain_text || "";
      buffer = Buffer.from(plainText, "utf-8");
      rawHtml = content.raw_html || "";
    } else {
      buffer = Buffer.from(JSON.stringify(content, null, 2), "utf-8");
      rawHtml = content.raw_html || "";
    }

    // Hash is always based on buffer content
    const contentHash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    db.query(
      `
      UPDATE crawl_outputs
      SET file_content = ?, raw_html = ?, content_hash = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [buffer, rawHtml, contentHash, fileId],
      (err, result) => {
        if (err) {
          console.error("❌ Failed to update file:", err);
          return res.status(500).json({ error: "Failed to update file" });
        }

        return res.json({ success: true, content_hash: contentHash });
      }
    );
  } catch (err) {
    console.error("❌ Update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// STATUS
app.get("/crawl-status", (req, res) => {
  const sql = `
   SELECT cj.job_id, cj.seed_url, d.domain_name AS domain, cj.status, cj.created_at, cj.updated_at
FROM crawl_jobs cj
JOIN domains d ON cj.domain_id = d.id
WHERE cj.status = 'in_progress'
ORDER BY cj.created_at DESC
LIMIT 1
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("❌ Error checking crawl status:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (!rows.length) {
      return res.status(200).json({ status: "idle" });
    }

    res.json(rows[0]);
  });
});

// ✅ Start API server
app.listen(3000, () => {
  console.log("🚀 API listening on port 3000");
});
