import puppeteer from "/Users/snudurupati/Projects/cutsheet/projects/2.2-learning-chaos/graphics-build/.npm-cache/_npx/678e79b7eb349f79/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os";
const CHROME = path.join(os.homedir(), ".cache/hyperframes/chrome/chrome-headless-shell/mac_arm-152.0.7928.2/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const types = { ".html":"text/html",".js":"text/javascript",".ttf":"font/ttf",".otf":"font/otf",".woff2":"font/woff2" };
const root = path.resolve("parts/gZ17");
const srv = http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split("?")[0]));fs.readFile(f,(e,b)=>{if(e){r.statusCode=404;return r.end();}r.setHeader("content-type",types[path.extname(f)]||"application/octet-stream");r.end(b);});});
await new Promise(ok=>srv.listen(0,"127.0.0.1",ok));
const browser = await puppeteer.launch({ executablePath: CHROME, headless:"shell", args:["--no-sandbox"] });
const page = await browser.newPage(); await page.setViewport({width:3840,height:2160,deviceScaleFactor:0.25});
await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`,{waitUntil:"networkidle0"});
await page.evaluate(()=>{const tl=window.__timelines["gZ17"];tl.pause();tl.progress(1);});
await new Promise(r=>setTimeout(r,300));
const rects = await page.evaluate(()=>{
  const out={};
  const kids=document.querySelectorAll("#tr > span, #tr > div, #nm, #ey, #hd, #lerobot, #fps");
  [...kids].forEach((el,i)=>{const r=el.getBoundingClientRect();
    out["k"+i+"_"+(el.id||el.tagName+"."+el.className)+":'"+ (el.textContent||"").slice(0,18) +"'"]={l:r.left,t:r.top,r:r.right,b:r.bottom,fs:getComputedStyle(el).fontSize,lh:getComputedStyle(el).lineHeight,w:r.width};});
  for (const id of ["gZ17"]) {
    const el=document.getElementById(id); if(!el) continue;
    const r=el.getBoundingClientRect();
    out[id]={l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height,fs:getComputedStyle(el).fontSize,lh:getComputedStyle(el).lineHeight};
  }
  return out;});
console.log(JSON.stringify(rects,null,1));
await browser.close(); srv.close();
