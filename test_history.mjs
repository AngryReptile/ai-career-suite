import fetch from "node-fetch";

async function run() {
  try {
     const res = await fetch("http://localhost:3000/api/scout/history");
     console.log("Status:", res.status);
     console.log("Body:", await res.text());
  } catch(e) {
     console.error(e);
  }
}
run();
