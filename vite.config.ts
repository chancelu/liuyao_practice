import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { Readable } from "node:stream"
import type { Plugin } from "vite"

// Kimi 助教代理（本地开发）：key 优先取请求头 x-kimi-key（界面填入），
// 其次取环境变量 KIMI_API_KEY；服务器不保存、不落盘，仅转发给 Kimi API
function kimiTutorProxy(envKey: string): Plugin {
  return {
    name: "kimi-tutor-proxy",
    configureServer(server) {
      server.middlewares.use("/api/tutor", (req, res) => {
        // GET：探测服务端是否已配置 KIMI_API_KEY（前端据此隐藏填 Key 框）
        if (req.method === "GET") {
          res.statusCode = 200
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          res.setHeader("Cache-Control", "no-store")
          res.end(JSON.stringify({ serverKey: !!envKey }))
          return
        }
        if (req.method !== "POST") {
          res.statusCode = 405
          res.end("Method Not Allowed")
          return
        }
        const chunks: Buffer[] = []
        req.on("data", (c) => chunks.push(c))
        req.on("end", async () => {
          try {
            const headerKey = req.headers["x-kimi-key"]
            const apiKey = (Array.isArray(headerKey) ? headerKey[0] : headerKey) || envKey
            if (!apiKey) {
              res.statusCode = 401
              res.end("未提供 API Key：请先在助教面板上方填入你的 Kimi API Key，或配置环境变量 KIMI_API_KEY")
              return
            }
            const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"))
            const upstream = await fetch("https://api.kimi.com/coding/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: body.model ?? "k3-256k",
                messages: body.messages,
                // k3-256k 仅允许 temperature=1，不传则默认即 1
                stream: true,
              }),
            })
            if (!upstream.ok || !upstream.body) {
              res.statusCode = upstream.status
              res.setHeader("Content-Type", "application/json; charset=utf-8")
              res.end(JSON.stringify({ error: `Kimi API ${upstream.status}: ${await upstream.text()}` }))
              return
            }
            res.statusCode = 200
            res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
            res.setHeader("Cache-Control", "no-cache")
            res.setHeader("Connection", "keep-alive")
            const nodeStream = Readable.fromWeb(upstream.body as unknown as import("stream/web").ReadableStream)
            nodeStream.on("data", (c) => res.write(c))
            nodeStream.on("end", () => res.end())
            nodeStream.on("error", (e) => { res.statusCode = 502; res.end(String(e)) })
          } catch (e) {
            res.statusCode = 500
            res.end(String(e))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")
  return {
    base: './',
    plugins: [inspectAttr(), react(), kimiTutorProxy(env.KIMI_API_KEY ?? "")],
    // 兼容较老浏览器（Vite 7 默认仅支持 baseline-widely-available，旧内核会整页蓝屏）
    build: {
      target: ['es2018', 'chrome87', 'edge88', 'firefox78', 'safari14'],
    },
    server: {
      port: 3000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
});
