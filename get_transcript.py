import sys
import json
import re
from youtube_transcript_api import YouTubeTranscriptApi

def extract_video_id(url_or_id):
    if len(url_or_id) == 11:
        return url_or_id
    match = re.search(r'(?:v=|youtu\.be\/|embed\/)([\w-]{11})', url_or_id)
    if match:
        return match.group(1)
    return None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL or Video ID provided"}))
        sys.exit(1)
        
    target = sys.argv[1]
    video_id = extract_video_id(target)
    if not video_id:
        print(json.dumps({"error": f"Invalid YouTube URL or Video ID: {target}"}))
        sys.exit(1)
        
    try:
        api = YouTubeTranscriptApi()
        fetched = api.fetch(video_id)
        
        # Format the response to match the structure we want in Node.js:
        # Array of { offset: number, text: string }
        transcript_data = []
        for snippet in fetched.snippets:
            transcript_data.append({
                "offset": snippet.start,
                "text": snippet.text
            })
            
        print(json.dumps({
            "success": True,
            "video_id": video_id,
            "language": fetched.language,
            "language_code": fetched.language_code,
            "transcript": transcript_data
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
