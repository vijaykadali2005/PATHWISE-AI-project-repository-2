# Pathwise Career Toolkit

A career planning and resume review app with a React frontend, Express API, and server-side Gemini integration.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to a Gemini API key from Google AI Studio. Never put the key in frontend code.
4. Run `npm run dev` and open the Vite URL printed in the terminal (usually `http://localhost:5173`). The API runs on port 3001.

`GEMINI_MODEL` can optionally override the default `gemini-3.5-flash-lite`. If the key is absent or rejected, the interface shows a setup-specific error rather than exposing provider details or secrets.

For a production build, run `npm run build` and then `npm start`. The Express server serves the built frontend and API on port 3001.

## Deploy to Vercel

Import this repository into Vercel and use the Vite framework preset with the default build command (`npm run build`) and output directory (`dist`). The `api/[...path].js` function serves the existing Express API under `/api`; no separate backend host or `VITE_API_URL` is required. Add `GEMINI_API_KEY` as a server-side environment variable for each Vercel environment where AI features should be enabled. Optionally set `GEMINI_MODEL` to override the default model. Do not add either value with a `VITE_` prefix.

## Features

- Career guide: skill-level estimate, role skill gaps, and a personalized 30-day plan with daily learning, exercises, time estimates, curated links, completion tracking, and a final project.
- Resume analyzer: PDF, DOCX, and TXT extraction; AI-estimated ATS compatibility score with category breakdown; and role-specific improvement suggestions.
- Career dashboard: role readiness, matching/missing skills, ATS estimate, plan progress, and interview-prep status; saved locally with the plan.
- Job-description comparison: paste a description into Resume Analyzer to see matched/missing skills, keywords, resume changes, and interview topics.
- Interview preparation: Gemini-generated technical, coding, HR, and project questions with expandable answers saved locally.
- Job-search portals and resume/application guidance use curated official URLs. Gemini is not asked to create links.
- Resume files are held in memory, limited to 8 MB, and not written to disk by the server. Extracted text is sent to Gemini for analysis.
- The ATS compatibility estimate is educational guidance, not an official score from an ATS vendor.

## Troubleshooting

- “Gemini is not configured”: add `GEMINI_API_KEY` to `.env`, then restart `npm run dev`.
- “Gemini rejected the configured API key”: verify the key and model access in Google AI Studio.
- “Can’t reach the local API”: make sure both processes started under `npm run dev`; the backend listens on port 3001.
- For scanned or image-only PDFs, run OCR/export the document as selectable text before uploading.

## API routes

- `GET /api/health`
- `POST /api/career-plan`
- `POST /api/resume-analyze` (optional `jobDescription` multipart field)
- `POST /api/interview-prep`
