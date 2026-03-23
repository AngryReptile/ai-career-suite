const fetchUrl = async (url) => {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, { headers: { "X-Return-Format": "markdown" } });
    const text = await res.text();
    console.log(`URL: ${url} | OK: ${res.ok} | Length: ${text.length}`);
    return res.ok ? text : "";
  } catch (err) {
    console.error(`Error on ${url}:`, err);
    return "";
  }
};
(async () => {
  const p1 = fetchUrl("https://www.linkedin.com/jobs/search?keywords=frontend%20linux%20admin&location=banglore");
  const p2 = fetchUrl("https://internshala.com/internships/keywords-frontend-linux-admin-in-banglore");
  const p3 = fetchUrl("https://in.indeed.com/jobs?q=frontend%20linux%20admin&l=banglore");
  await Promise.allSettled([p1, p2, p3]);
})();
