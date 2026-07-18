# Development Plan

## Current MVP

- Next.js App Router app deployed on Vercel.
- Supabase schema for profiles, decks, slides, templates, generation jobs, and exports.
- Two generation modes:
  - `image`: slide image previews, with optional GPT Image 2 generation when enabled.
  - `html`: HTML/CSS slide previews in a sandboxed iframe.
- PPTX export for both modes by placing a full-slide image or SVG on each 16:9 slide.

## Environment

Copy `.env.example` to `.env.local`.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_TEXT_MODEL=gpt-5.6-terra
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_GENERATION_ENABLED=false
APP_BASE_URL=http://localhost:3000
```

## Notes

- The app intentionally works without OpenAI and Supabase credentials so UI and export behavior can be checked immediately.
- Paid image generation is guarded by `OPENAI_IMAGE_GENERATION_ENABLED=true`.
- The first production hardening step should be moving deck persistence behind authenticated Supabase user context instead of demo-mode anonymous generation.

