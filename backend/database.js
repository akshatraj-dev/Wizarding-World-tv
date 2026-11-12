
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(
  path.join(dataDir, "channels.db")
);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (
      type IN ('streaming', 'tv_network')
    ),
    country TEXT NOT NULL,
    description TEXT NOT NULL,
    website_url TEXT NOT NULL,
    logo_url TEXT DEFAULT '',
    availability_note TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_channels_type
  ON channels(type);

  CREATE INDEX IF NOT EXISTS idx_channels_country
  ON channels(country);
`);

const seed = [
  {
    name: "JioHotstar",
    slug: "jiohotstar",
    type: "streaming",
    country: "India",
    description: "Indian streaming platform. Check its catalogue for Wizarding World titles.",
    website_url: "https://www.hotstar.com/in",
    availability_note: "Availability varies by title."
  },
  {
    name: "Amazon Prime Video",
    slug: "amazon-prime-video",
    type: "streaming",
    country: "International",
    description: "Streaming and digital video platform.",
    website_url: "https://www.primevideo.com/",
    availability_note: "Check streaming, rental and purchase options."
  },
  {
    name: "Netflix",
    slug: "netflix",
    type: "streaming",
    country: "International",
    description: "International subscription streaming service.",
    website_url: "https://www.netflix.com/",
    availability_note: "Catalogue differs by country."
  },
  {
    name: "HBO Max",
    slug: "hbo-max",
    type: "streaming",
    country: "International",
    description: "Streaming service with Warner Bros. entertainment.",
    website_url: "https://www.hbomax.com/",
    availability_note: "Check regional title availability."
  },
  {
    name: "Peacock",
    slug: "peacock",
    type: "streaming",
    country: "United States",
    description: "US streaming service.",
    website_url: "https://www.peacocktv.com/",
    availability_note: "Check current catalogue."
  },
  {
    name: "ITVX",
    slug: "itvx",
    type: "streaming",
    country: "United Kingdom",
    description: "UK streaming and catch-up television service.",
    website_url: "https://www.itv.com/",
    availability_note: "Check current catalogue."
  },
  {
    name: "HBO",
    slug: "hbo",
    type: "tv_network",
    country: "United States",
    description: "Television network associated with Warner Bros. entertainment.",
    website_url: "https://www.hbo.com/",
    availability_note: "Check local TV schedules."
  },
  {
    name: "TBS",
    slug: "tbs",
    type: "tv_network",
    country: "United States",
    description: "US entertainment television network.",
    website_url: "https://www.tbs.com/",
    availability_note: "Check local TV schedules."
  },
  {
    name: "Cartoon Network",
    slug: "cartoon-network",
    type: "tv_network",
    country: "International",
    description: "International entertainment television brand.",
    website_url: "https://www.cartoonnetwork.com/",
    availability_note: "Check local programming."
  }
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO channels
  (name, slug, type, country, description,
   website_url, availability_note)
  VALUES (
    @name, @slug, @type, @country, @description,
    @website_url, @availability_note
  )
`);

const seedChannels = db.transaction((items) => {
  for (const item of items) insert.run(item);
});

seedChannels(seed);

// MOVIES DATABASE

db.exec(`
  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    series TEXT NOT NULL,
    release_year INTEGER NOT NULL,
    description TEXT NOT NULL,
    poster_url TEXT DEFAULT '',
    website_url TEXT NOT NULL,
    availability_note TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_movies_series
  ON movies(series);
`);

const movies = [
  {
    title: "Harry Potter and the Philosopher's Stone",
    slug: "philosophers-stone",
    series: "Harry Potter",
    release_year: 2001,
    description: "Harry discovers he is a wizard and begins his magical journey at Hogwarts.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Harry Potter and the Chamber of Secrets",
    slug: "chamber-of-secrets",
    series: "Harry Potter",
    release_year: 2002,
    description: "Harry returns to Hogwarts as a mysterious danger threatens the school.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Harry Potter and the Prisoner of Azkaban",
    slug: "prisoner-of-azkaban",
    series: "Harry Potter",
    release_year: 2004,
    description: "Harry learns about Sirius Black and uncovers secrets from his past.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Harry Potter and the Goblet of Fire",
    slug: "goblet-of-fire",
    series: "Harry Potter",
    release_year: 2005,
    description: "Harry competes in the dangerous Triwizard Tournament.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Harry Potter and the Order of the Phoenix",
    slug: "order-of-the-phoenix",
    series: "Harry Potter",
    release_year: 2007,
    description: "Harry and his friends form Dumbledore's Army.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Harry Potter and the Half-Blood Prince",
    slug: "half-blood-prince",
    series: "Harry Potter",
    release_year: 2009,
    description: "Harry discovers more about Voldemort's mysterious past.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Harry Potter and the Deathly Hallows: Part 1",
    slug: "deathly-hallows-part-1",
    series: "Harry Potter",
    release_year: 2010,
    description: "Harry, Ron and Hermione search for Horcruxes outside Hogwarts.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Harry Potter and the Deathly Hallows: Part 2",
    slug: "deathly-hallows-part-2",
    series: "Harry Potter",
    release_year: 2011,
    description: "The final battle for the fate of the wizarding world takes place.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Fantastic Beasts and Where to Find Them",
    slug: "fantastic-beasts-1",
    series: "Fantastic Beasts",
    release_year: 2016,
    description: "Newt Scamander arrives in 1920s New York with a suitcase full of magical creatures.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Fantastic Beasts: The Crimes of Grindelwald",
    slug: "fantastic-beasts-2",
    series: "Fantastic Beasts",
    release_year: 2018,
    description: "The magical world faces the growing threat of Gellert Grindelwald.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  },
  {
    title: "Fantastic Beasts: The Secrets of Dumbledore",
    slug: "fantastic-beasts-3",
    series: "Fantastic Beasts",
    release_year: 2022,
    description: "Dumbledore and his allies attempt to stop Grindelwald's plans.",
    website_url: "https://www.wizardingworld.com/",
    availability_note: "Check regional streaming availability."
  }
];

const insertMovie = db.prepare(`
  INSERT OR IGNORE INTO movies (
    title, slug, series, release_year,
    description, website_url, availability_note
  ) VALUES (
    @title, @slug, @series, @release_year,
    @description, @website_url, @availability_note
  )
`);

const seedMovies = db.transaction((items) => {
  for (const movie of items) insertMovie.run(movie);
});

seedMovies(movies);


module.exports = db;
