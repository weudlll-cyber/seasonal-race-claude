# server/data

Runtime data served by the Track API. Committed to the repo — these are source assets.

## Structure

```
data/
├── tracks/
│   └── <track-id>.json      # Combined track preset + geometry (no background bytes)
└── backgrounds/
    └── <track-id>.<ext>     # Background image (PNG or JPEG)
```

## Track JSON schema

| Field | Description |
|---|---|
| `id` | Track ID (matches filename) |
| `name`, `icon`, `description` | Display metadata |
| `geometryId` | Geometry key used by the frontend for localStorage cache |
| `innerPoints`, `outerPoints`, `centerPoints` | Spline control points |
| `pathLengthPx` | Pre-computed path length in world pixels |
| `backgroundImageFile` | Filename in `backgrounds/` — NOT returned by the API (internal) |
| `worldWidth`, `worldHeight` | Canvas world dimensions in pixels |

## Adding a new custom track

1. Copy the track's JSON (geometry + metadata) to `tracks/<id>.json`
2. Set `backgroundImageFile` to `<id>.jpg` (or `.png`)
3. Copy the background image to `backgrounds/<id>.jpg`
4. Restart the server (`docker-compose restart server` or `npm start`)

The server loads all files on startup — no DB migration needed.
