import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateWithRetry } from '@/lib/gemini';
import { execFile } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { YoutubeTranscript } from 'youtube-transcript';
import { Innertube } from 'youtubei.js';
import ytdl from '@distube/ytdl-core';

function runPythonTranscript(videoId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'get_transcript.py');
    const pythonPaths = [
      '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3',
      '/usr/local/bin/python3',
      '/usr/bin/python3',
      'python3',
      'python'
    ];
    
    let index = 0;
    
    function tryNext() {
      if (index >= pythonPaths.length) {
        return reject(new Error("Python executable not found in paths. Checked: " + pythonPaths.join(', ')));
      }
      
      const pyExec = pythonPaths[index++];
      console.log(`Trying Python path: ${pyExec} on ${scriptPath}`);
      
      execFile(pyExec, [scriptPath, videoId], (error, stdout, stderr) => {
        if (error) {
          const isNotFound = (error as any).code === 'ENOENT';
          if (isNotFound) {
            return tryNext();
          }
          
          try {
            const parsed = JSON.parse(stdout);
            if (parsed && parsed.error) {
              console.error(`Python script error output:`, parsed.error);
              return reject(new Error(parsed.error));
            }
          } catch (e) {}
          
          console.error(`Python execution error for ${pyExec}:`, error.message, stderr);
          return reject(new Error(stderr || error.message));
        }
        
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.success) {
            resolve(parsed);
          } else {
            console.error(`Python script reports failure:`, parsed.error);
            reject(new Error(parsed.error || "Unknown error"));
          }
        } catch (e) {
          console.error(`Failed to parse Python stdout:`, stdout);
          reject(new Error("Failed to parse Python script output: " + stdout));
        }
      });
    }
    
    tryNext();
  });
}

async function getOembedMetadata(videoId: string) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title,
        author: data.author_name
      };
    }
  } catch (e) {
    console.warn("oEmbed fetch failed:", e);
  }
  return null;
}

async function extractTranscript(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  if (!match) throw new Error("Invalid YouTube URL");
  const videoId = match[1];

  let title = "Unknown Title";
  let author = "Unknown Author";

  // Try to get metadata first
  try {
    // 1. oEmbed (Most reliable in cloud environments)
    const oembed = await getOembedMetadata(videoId);
    if (oembed) {
      title = oembed.title;
      author = oembed.author;
    } else {
      // 2. Fallback to ytdl-core (often blocked in prod)
      const info = await ytdl.getBasicInfo(videoId).catch(() => null);
      if (info) {
        title = info.videoDetails.title;
        author = info.videoDetails.author.name;
      } else {
        // 3. Last resort fetch
        const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        const html = await res.text();
        const jsonMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script|\n)/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1]);
          title = data.videoDetails?.title || title;
          author = data.videoDetails?.author || author;
        }
      }
    }
  } catch (e) {
    console.warn("Metadata extraction sweep failed:", e);
  }

  const metadata = { title, author };

  // Attempt 0: Python youtube-transcript-api script (highly reliable PO-token bypass)
  try {
    console.log(`Attempting Python youtube-transcript-api for: ${videoId}`);
    const pyData = await runPythonTranscript(videoId);
    if (pyData && pyData.transcript && pyData.transcript.length > 0) {
      console.log(`Successfully extracted transcript using Python youtube-transcript-api for: ${videoId}`);
      return {
        transcript: pyData.transcript,
        metadata
      };
    }
  } catch (err: any) {
    console.warn(`Python youtube-transcript-api failed for ${videoId}: ${err.message}`);
  }

  // Attempt 1: youtube-transcript (Fastest, uses specialized endpoints)
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    if (transcript && transcript.length > 0) {
      console.log(`Successfully extracted transcript using youtube-transcript for: ${videoId}`);
      return {
        transcript: transcript.map(item => ({
          offset: item.offset / 1000,
          text: item.text
        })),
        metadata
      };
    }
  } catch (err: any) {
    console.warn(`youtube-transcript failed for ${videoId}: ${err.message}`);
    // Try without lang hint if it failed
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      if (transcript && transcript.length > 0) {
        return { transcript: transcript.map(item => ({ offset: item.offset / 1000, text: item.text })), metadata };
      }
    } catch (e) {}
  }

  // Attempt 2: youtubei.js (Most robust)
  try {
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();
    
    // Better segment extraction for youtubei.js
    const segments = (transcriptData as any).transcript?.content?.body?.initial_segments || 
                   (transcriptData as any).segments;

    if (segments && segments.length > 0) {
      console.log(`Successfully extracted transcript using youtubei.js for: ${videoId}`);
      return {
        transcript: segments.map((s: any) => ({
          offset: (s.start_ms || s.start || 0) / 1000,
          text: s.snippet?.text || s.text || ""
        })),
        metadata
      };
    }
  } catch (err: any) {
    console.warn(`youtubei.js failed for ${videoId}: ${err.message}`);
  }

  // Attempt 3: ytdl-core (Direct track extraction)
  try {
    const info = await ytdl.getInfo(videoId);
    const tracks = info.player_response.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks && tracks.length > 0) {
      // Pick English or first available
      const track = tracks.find((t: any) => t.languageCode === 'en') || tracks[0];
      const res = await fetch(track.baseUrl);
      const xml = await res.text();
      const lines: { offset: number, text: string }[] = [];
      const textMatches = xml.matchAll(/<text start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g);
      for (const match of textMatches) {
        lines.push({ 
          offset: parseFloat(match[1]), 
          text: match[2].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '') 
        });
      }
      if (lines.length > 0) {
        console.log(`Successfully extracted transcript using ytdl-core for: ${videoId}`);
        return { transcript: lines, metadata };
      }
    }
  } catch (err: any) {
    console.warn(`ytdl-core failed for ${videoId}: ${err.message}`);
  }

  const error = new Error("No accessible transcript.");
  (error as any).videoMetadata = metadata;
  throw error;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    const userId = (session.user as any).id || session.user.email;
    const summaries = await (prisma as any).summary.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(summaries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    const userId = (session.user as any).id || session.user.email;
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
    }

    const { url, deepScan, title: providedTitle, author: providedAuthor, summaryLevel = 'medium' } = await req.json();

    const levelInstructions = {
      short: "Provide a concise summary.",
      medium: "Provide a balanced summary.",
      comprehensive: "Provide an exhaustive technical guide."
    }[summaryLevel as 'short' | 'medium' | 'comprehensive'] || "Provide a balanced summary.";
    
    if (deepScan) {
      const prompt = `Analyze: "${providedTitle}" by "${providedAuthor}". URL: ${url}. ${levelInstructions}`;
      const result = await generateWithRetry(prompt);
      const markdownOutput = (await result.response).text().trim();
      const newSummary = await (prisma as any).summary.create({
         data: { userId, url, title: providedTitle || 'Video Overview', content: markdownOutput }
      });
      return NextResponse.json({ summary: markdownOutput, dbId: newSummary.id });
    }
    
    let transcriptData;
    try {
      transcriptData = await extractTranscript(url);
    } catch (err: any) {
      return NextResponse.json({ requiresDeepScan: true, metadata: err.videoMetadata });
    }

    const { transcript, metadata } = transcriptData;
    const finalTitle = providedTitle || metadata.title;
    
    const transcriptText = transcript.map((line: any) => `[${Math.floor(line.offset / 60)}:${Math.floor(line.offset % 60).toString().padStart(2, '0')}] ${line.text}`).join('\n');

    const prompt = `${levelInstructions}\n\nTranscript:\n${transcriptText.slice(0, 50000)}`;
    const result = await generateWithRetry(prompt);
    const markdownOutput = (await result.response).text().trim();
    
    const savedSummary = await (prisma as any).summary.create({
        data: { userId, url, title: finalTitle, content: markdownOutput }
    });

    await (prisma as any).activity.create({
        data: { userId, type: 'summarize', title: `Video Summary: ${finalTitle}` }
    });

    return NextResponse.json({ summary: markdownOutput, dbId: savedSummary.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
