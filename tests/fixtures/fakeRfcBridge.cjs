// Sahte RFC koprusu (rfcBridgeSwitch.test.ts): `--port <n>` ile dinler,
// /health cevabinda calistigi klasorun adini soyler. Port doluysa gercek
// kopru gibi hata verip cikar.
const http = require("node:http");
const path = require("node:path");
const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, project: path.basename(process.cwd()) }));
});
server.on("error", (err) => {
  process.stderr.write(`bind failed: ${err.code}\n`);
  process.exit(3);
});
server.listen(port, "127.0.0.1");
