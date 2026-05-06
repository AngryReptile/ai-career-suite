<p align="center">
  <img src="https://img.icons8.com/fluency/96/hexagon.png" width="80" alt="AI Career Suite Logo"/>
</p>

<h1 align="center">AI Career Suite</h1>

<p align="center">
  <strong>An all-in-one AI-powered career acceleration platform</strong>
  <br/>
  <em>Job discovery · YouTube learning · AI tutoring · Smart notes · Resume intelligence</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwindcss" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma" alt="Prisma"/>
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google" alt="Gemini AI"/>
  <img src="https://img.shields.io/badge/Deployed-Vercel-000?style=flat-square&logo=vercel" alt="Vercel"/>
</p>

---

## 🧬 Overview

**AI Career Suite** is a full-stack, production-grade platform that unifies multiple AI-driven tools into a single glassmorphic dashboard. Built for job seekers, learners, and career professionals — it combines intelligent job scraping, YouTube video analysis, AI-powered tutoring, smart note-taking with flashcard generation, and resume management into one cohesive experience.

The interface is built with an **Apple-inspired liquid glass aesthetic** — featuring real-time SVG refraction filters, chromatic aberration borders, specular highlight overlays, and premium shimmer skeleton loading states.

---

## ✨ Key Features

### 🌐 Omni-Scout — Intelligent Web Research Agent
- **Agentic AI scraping** — give it any query or URL and it autonomously fetches, parses, and structures data
- **Three extraction modes**: Jobs, Research Intelligence, and Product Discovery
- **Smart clarification engine** — asks follow-up questions when queries are ambiguous
- **Dynamic schema generation** — adapts extraction fields based on the content type
- **Pagination & infinite scroll** — loads additional results on demand
- **Search history** — all past searches are persisted and reloadable
- **Session persistence** — results survive navigation via `sessionStorage`

### 📺 YouTube Summarizer
- **Instant video analysis** — paste any YouTube URL and receive a structured, AI-generated summary
- **Three depth levels**: Short, Medium, and Comprehensive
- **Deep scan fallback** — automatically retries with metadata extraction when transcript isn't available
- **Timestamp highlighting** — renders clickable timestamp badges inline
- **Cross-module integration** — "Chat with Video" redirects to the AI Tutor with full context, "Make Note" creates a Note Saver entry

### 🎓 AI Tutor
- **Dual modes**: Socratic (guided questioning) and Direct (immediate answers)
- **Multi-turn conversations** — full chat history persisted per session
- **Context injection** — receives video summaries from the YouTube Summarizer for deep-dive learning
- **Conversation history** — past sessions are stored in the database and reloadable from the sidebar
- **Markdown-rendered responses** with syntax highlighting

### 📝 Note Saver
- **Rich text editor** — powered by TipTap with full formatting support
- **AI Semantic Search** — natural language search across all your notes using Gemini
- **AI Flashcard Generation** — transforms any note into interactive study flashcards with a 3D flip animation
- **Cross-module bridge** — automatically creates notes from YouTube summaries
- **Tag system** — organize notes with custom tags

### 📄 Resume Management
- **Upload & manage** multiple resumes (PDF/DOCX)
- **AI scoring engine** — analyzes resume strength with actionable tips
- **Active resume selection** — designate one resume as your "active" for AI matching in Omni-Scout
- **Document preview** — inline PDF viewer with download capability

### 📊 Dashboard
- **Career activity heatmap** — GitHub-style contribution graph for all platform activity
- **Animated stat counters** — real-time metrics for jobs, summaries, notes, and tutor sessions
- **Drag & drop widget layout** — rearrange dashboard widgets with `@dnd-kit` persistence
- **Scrolling news marquee** — live career insights ticker

### 🔐 Admin OS
- **Role-based access control** — USER / ADMIN roles with JWT-based authorization
- **Platform analytics** — total users, resumes, scouts, notes
- **Live activity stream** — real-time feed of all user actions across the platform
- **User management matrix** — promote/demote roles, terminate accounts
- **Shimmer skeleton loading** — premium glass-sweep loading states

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Frontend** | React 19, Framer Motion, Lucide Icons |
| **Styling** | Tailwind CSS 4, Custom Liquid Glass CSS system |
| **State** | SWR (client cache), sessionStorage (persistence) |
| **AI Engine** | Google Gemini (`gemini-1.5-flash`, `gemma`) via `@google/generative-ai` |
| **Database** | PostgreSQL (Supabase) via Prisma ORM 5 |
| **Auth** | NextAuth.js 4 (Google OAuth + Credentials) |
| **Rich Text** | TipTap Editor |
| **Drag & Drop** | @dnd-kit/core + sortable |
| **Video Processing** | `youtube-transcript`, `@distube/ytdl-core` |
| **Deployment** | Vercel (Serverless) |

---

## 📁 Project Structure

