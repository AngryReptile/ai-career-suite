import fetch from "node-fetch";

async function run() {
  try {
     const res = await fetch("http://localhost:3000/api/resume", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ filename: "test.pdf", content: "mock", fileData: "data:application/pdf;base64,JVBERi..." })
     });
     console.log("Status:", res.status);
     console.log("Body:", await res.text());
  } catch(e) {
     console.error(e);
  }
}
run();
