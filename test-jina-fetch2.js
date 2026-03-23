const fetchUrl = async (url) => {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, { headers: { "X-Return-Format": "markdown" }, cache: 'no-store' });
    const text = await res.text();
    return res.ok ? text : "HTTP_ERROR_OR_FALSE-" + res.status;
  } catch (err) {
    return "CATCH_ERROR-" + err.message;
  }
};
(async () => {
  const platforms = [
    "https://www.linkedin.com/jobs/search?keywords=frontend%20linux%20admin&location=banglore",
    "https://internshala.com/internships/keywords-frontend-linux-admin-in-banglore",
    "https://in.indeed.com/jobs?q=frontend%20linux%20admin&l=banglore"
  ];
  const fetchPromises = platforms.map(fetchUrl);
  const results = await Promise.allSettled(fetchPromises);
  
  let markdown = results
    .map((result) => result.status === 'fulfilled' ? result.value : "PROMISE_REJECTED")
    .filter(text => text.length > 100)
    .join("\n\n---\n\n");
    
  console.log("FINAL CONCATENATED STRING LENGTH:", markdown.length);
  console.log("FIRST 500 CHARACTERS:");
  console.log(markdown.substring(0, 500));
  
  if (!markdown.trim()) console.log("STRING IS EMPTY");
})();
