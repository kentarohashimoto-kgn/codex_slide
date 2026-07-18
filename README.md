# Codex Slide

AI slide deck generator for Vercel + Supabase.

The MVP supports two generation modes:

- Image mode: generates slide image prompts and, when enabled, uses GPT Image 2 for slide images.
- HTML mode: generates browser-previewable HTML/CSS slides.

Both modes can be exported as PPTX.

The deck builder now includes richer slide creation controls:

- Visual style presets split into system templates and company-only templates.
- Slide count, chapter splitting, aspect ratio, typography, and text visibility settings.
- Page numbering, cross-chapter pagination, footer title, cover alignment, closing layout, credits, CTA, and extra instructions.
- Template settings are included in image prompts, HTML previews, and PPTX fallback rendering.

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example`.

The app works in demo mode without API keys. Set `OPENAI_API_KEY` to enable real AI outline generation, per-slide HTML generation, and image generation.

Set `OPENAI_IMAGE_GENERATION_ENABLED=false` only when you want image mode to use the local SVG preview fallback instead of paid GPT Image 2 calls. `OPENAI_IMAGE_QUALITY=low` is recommended while testing.

## Basic Auth

Set these environment variables in Vercel to protect the app:

```text
BASIC_AUTH_USERNAME=
BASIC_AUTH_PASSWORD=
```

In development, Basic Auth is skipped when these variables are empty. In production, requests return `503` until both values are configured.

For multiple personal folders, set `BASIC_AUTH_USERS` instead:

```text
BASIC_AUTH_USERS={"kenta":"password1","staff":"password2"}
```

The Basic Auth username is used as the personal deck folder key. Generated decks are saved to that user's browser storage immediately, and to Supabase as well when Supabase environment variables and the deck-library migration are configured.

## Supabase

Run the SQL in `supabase/migrations/202607180001_initial_schema.sql` in your Supabase project. Add the Supabase URL and keys to Vercel environment variables.
