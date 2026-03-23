async function check() {
  const url = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=where%20can%20i%20buy%20converse%20shoes%20in%20bangalore`;
  const res = await fetch(url, { headers: { "X-Return-Format": "markdown" }});
  const text = await res.text();
  
  const urlRegex = /https?:\/\/[^\s"'<)]+/g;
  const matches = [...text.matchAll(urlRegex)];
  const urls = matches.map(m => decodeURIComponent(m[0]));
  
  const forumUrls = urls.filter(url => url.includes('reddit.com') || url.includes('tripadvisor') || url.includes('quora.com') || url.includes('lbb.in'));
  console.log("Filtered Forum URLs:", forumUrls.slice(0, 3));
}

check();
