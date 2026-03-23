const fs = require('fs');

async function check() {
  const url = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=where%20can%20i%20buy%20converse%20shoes%20in%20bangalore`;
  const res = await fetch(url, { headers: { "X-Return-Format": "markdown" }});
  const text = await res.text();
  
  const uddgRegex = /uddg=([^&\s'"]+)/g;
  const matches = [...text.matchAll(uddgRegex)];
  const urls = matches.map(m => decodeURIComponent(m[1]));
  console.log("Found UDDG:", urls.length);
  console.log("Sample:", urls[0]);
}

check();
