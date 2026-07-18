# Codex Slide

AI slide deck generator for Vercel + Supabase.

The MVP supports two generation modes:

- Image mode: generates slide image prompts and, when enabled, uses GPT Image 2 for slide images.
- HTML mode: generates browser-previewable HTML/CSS slides.

Both modes can be exported as a 16:9 PPTX.

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example`.

The app works in demo mode without API keys. Set `OPENAI_API_KEY` to enable AI outline/HTML generation. Set `OPENAI_IMAGE_GENERATION_ENABLED=true` to allow paid image generation calls.

## Supabase

Run the SQL in `supabase/migrations/202607180001_initial_schema.sql` in your Supabase project. Add the Supabase URL and keys to Vercel environment variables.

