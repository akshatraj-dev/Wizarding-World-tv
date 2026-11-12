
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.ADMIN_API_KEY ||
    process.env.ADMIN_API_KEY.length < 32) {
  throw new Error("Set a secure ADMIN_API_KEY in .env");
}

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5500"
}));
app.use(express.json({ limit: "20kb" }));

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200
}));

function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  const expected = process.env.ADMIN_API_KEY;

  if (
    !token ||
    token.length !== expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expected)
    )
  ) {
    return res.status(401).json({
      error: "Unauthorized admin access"
    });
  }

  next();
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateChannel(body, partial = false) {
  const fields = [
    "name", "slug", "type", "country",
    "description", "website_url",
    "logo_url", "availability_note"
  ];

  for (const field of fields) {
    if (!partial && field !== "logo_url" &&
        field !== "availability_note" &&
        !body[field]) {
      return `Missing required field: ${field}`;
    }
  }

  if (body.type &&
      !["streaming", "tv_network"].includes(body.type)) {
    return "Invalid channel type";
  }

  for (const field of [
    "name", "slug", "country", "description"
  ]) {
    if (body[field] !== undefined &&
        (typeof body[field] !== "string" ||
         !body[field].trim() ||
         body[field].length > 500)) {
      return `Invalid ${field}`;
    }
  }

  if (body.slug &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)) {
    return "Slug must contain lowercase letters, numbers and hyphens";
  }

  if (body.website_url !== undefined &&
      !validUrl(body.website_url)) {
    return "Website URL must use HTTPS";
  }

  if (body.logo_url &&
      !validUrl(body.logo_url)) {
    return "Logo URL must use HTTPS";
  }

  for (const field of ["logo_url", "availability_note"]) {
    if (body[field] !== undefined &&
        (typeof body[field] !== "string" ||
         body[field].length > 2000)) {
      return `Invalid ${field}`;
    }
  }

  return null;
}

// API welcome
app.get("/api", (req, res) => {
  res.json({
    name: "Wizarding World TV API",
    version: "1.0.0",
    status: "running"
  });
});

// Get all channels with search and filters
app.get("/api/channels", (req, res) => {
  const { q, type, country } = req.query;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(
    1, Number(req.query.limit) || 20
  ));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = {};

  if (q) {
    conditions.push(
      "(name LIKE @q OR description LIKE @q)"
    );
    params.q = `%${String(q).slice(0, 100)}%`;
  }

  if (type) {
    if (!["streaming", "tv_network"].includes(type)) {
      return res.status(400).json({
        error: "Invalid type"
      });
    }
    conditions.push("type = @type");
    params.type = type;
  }

  if (country) {
    conditions.push("country = @country");
    params.country = String(country).slice(0, 100);
  }

  const where = conditions.length
    ? "WHERE " + conditions.join(" AND ")
    : "";

  const channels = db.prepare(`
    SELECT * FROM channels
    ${where}
    ORDER BY name ASC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  const total = db.prepare(`
    SELECT COUNT(*) AS total FROM channels ${where}
  `).get(params).total;

  res.json({
    channels,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get one channel
app.get("/api/channels/:slug", (req, res) => {
  const channel = db.prepare(
    "SELECT * FROM channels WHERE slug = ?"
  ).get(req.params.slug);

  if (!channel) {
    return res.status(404).json({
      error: "Channel not found"
    });
  }

  res.json(channel);
});

// GET all movies with search and filters
app.get("/api/movies", (req, res) => {
  const { q, series } = req.query;

  const conditions = [];
  const params = {};

  if (q) {
    conditions.push(
      "(title LIKE @q OR description LIKE @q)"
    );
    params.q = `%${String(q).slice(0, 100)}%`;
  }

  if (series) {
    if (!["Harry Potter", "Fantastic Beasts"].includes(series)) {
      return res.status(400).json({
        error: "Invalid movie series"
      });
    }

    conditions.push("series = @series");
    params.series = series;
  }

  const where = conditions.length
    ? "WHERE " + conditions.join(" AND ")
    : "";

  const results = db.prepare(`
    SELECT * FROM movies
    ${where}
    ORDER BY release_year ASC
  `).all(params);

  res.json({
    total: results.length,
    movies: results
  });
});

// GET one movie
app.get("/api/movies/:slug", (req, res) => {
  const movie = db.prepare(
    "SELECT * FROM movies WHERE slug = ?"
  ).get(req.params.slug);

  if (!movie) {
    return res.status(404).json({
      error: "Movie not found"
    });
  }

  res.json(movie);
});

// GET movie series
app.get("/api/movie-series", (req, res) => {
  const series = db.prepare(`
    SELECT series, COUNT(*) AS total
    FROM movies
    GROUP BY series
  `).all();

  res.json(series);
});

// Get available categories
app.get("/api/categories", (req, res) => {
  const categories = db.prepare(`
    SELECT type, COUNT(*) AS total
    FROM channels
    GROUP BY type
  `).all();

  res.json(categories);
});

// Get available countries
app.get("/api/countries", (req, res) => {
  const countries = db.prepare(`
    SELECT DISTINCT country
    FROM channels
    ORDER BY country
  `).all();

  res.json(countries.map(item => item.country));
});

// Admin: add channel
app.post("/api/channels",
  authenticateAdmin,
  (req, res) => {
    const error = validateChannel(req.body);

    if (error) {
      return res.status(400).json({ error });
    }

    try {
      const result = db.prepare(`
        INSERT INTO channels (
          name, slug, type, country,
          description, website_url,
          logo_url, availability_note
        ) VALUES (
          @name, @slug, @type, @country,
          @description, @website_url,
          @logo_url, @availability_note
        )
      `).run({
        ...req.body,
        logo_url: req.body.logo_url || "",
        availability_note:
          req.body.availability_note || ""
      });

      res.status(201).json({
        message: "Channel created",
        id: result.lastInsertRowid
      });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({
          error: "Channel slug already exists"
        });
      }
      throw error;
    }
  }
);

// Admin: update channel
app.patch("/api/channels/:id",
  authenticateAdmin,
  (req, res) => {
    const error = validateChannel(req.body, true);

    if (error) {
      return res.status(400).json({ error });
    }

    const allowed = [
      "name", "slug", "type", "country",
      "description", "website_url",
      "logo_url", "availability_note"
    ];

    const entries = Object.entries(req.body)
      .filter(([key]) => allowed.includes(key));

    if (!entries.length) {
      return res.status(400).json({
        error: "No valid fields supplied"
      });
    }

    const updates = entries.map(
      ([key]) => `${key} = @${key}`
    );

    const values = Object.fromEntries(entries);
    values.id = req.params.id;

    try {
      const result = db.prepare(`
        UPDATE channels
        SET ${updates.join(", ")},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run(values);

      if (!result.changes) {
        return res.status(404).json({
          error: "Channel not found"
        });
      }

      res.json({ message: "Channel updated" });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({
          error: "Channel slug already exists"
        });
      }
      throw error;
    }
  }
);

// Admin: delete channel
app.delete("/api/channels/:id",
  authenticateAdmin,
  (req, res) => {
    const result = db.prepare(
      "DELETE FROM channels WHERE id = ?"
    ).run(req.params.id);

    if (!result.changes) {
      return res.status(404).json({
        error: "Channel not found"
      });
    }

    res.json({ message: "Channel deleted" });
  }
);

// Not found
app.use((req, res) => {
  res.status(404).json({
    error: "API endpoint not found"
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({
    error: "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(
    `Wizarding World TV API running on port ${PORT}`
  );
});
