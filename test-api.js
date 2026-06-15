import fetch from "node-fetch";

async function testVoice() {
  try {
    const res = await fetch("http://localhost:3000/api/gemini/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: [{ role: "user", content: "Say hello", attachments: [] }]
      })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
testVoice();
