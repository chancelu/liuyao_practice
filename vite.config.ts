import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { Readable } from "node:stream"
import type { Plugin } from "vite"

const DEFAULT_ENDPOINT = "https://api.kimi.com/coding/v1/chat/completions"
const DEFAULT_MODEL = "k3-256k"

// AI 助教代理（本地开发，与 api/tutor.ts 生产版逻辑保持一致）：
// key 优先取请求头 x-api-key（界面填入，仅存其浏览器），其次取环境变量 KIMI_API_KEY；
// 环境变量 Key 只发给默认 Kimi 端点，自定义端点必须用户自带 Key。服务器不保存、不落盘，仅转发
function kimiTutorProxy(envKey: string): Plugin {
  return {
    name: "kimi-tutor-proxy",
    configureServer(server) {
      server.middlewares.use("/api/tutor", (req, res) => {
        // GET：探测服务端是否已配置 KIMI_API_KEY（前端据此显示「站点默认模型已就绪」）
        if (req.method === "GET") {
          res.statusCode = 200
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          res.setHeader("Cache-Control", "no-store")
          res.end(JSON.stringify({ serverKey: !!envKey, defaultModel: DEFAULT_MODEL }))
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
            const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"))
            // 端点校验：必须是 https 的合法 URL，缺省走 Kimi；只填域名时自动补 /v1/chat/completions
            let endpoint = DEFAULT_ENDPOINT
            if (typeof body.endpoint === "string" && body.endpoint.trim()) {
              try {
                const u = new URL(body.endpoint.trim())
                if (u.protocol !== "https:") throw new Error("not https")
                if (u.pathname === "/" || u.pathname === "") u.pathname = "/v1/chat/completions"
                endpoint = u.toString()
              } catch {
                res.statusCode = 400
                res.end("Bad Request: endpoint 必须是合法的 https URL")
                return
              }
            }
            const headerRaw = req.headers["x-api-key"] ?? req.headers["x-kimi-key"]
            const headerKey = (Array.isArray(headerRaw) ? headerRaw[0] : headerRaw) || ""
            const isDefaultEndpoint = endpoint === DEFAULT_ENDPOINT
            const apiKey = headerKey || (isDefaultEndpoint ? envKey : "")
            if (!apiKey) {
              res.statusCode = 401
              res.end(isDefaultEndpoint
                ? "未提供 API Key：请在右上角「设置」中配置助教模型，或配置环境变量 KIMI_API_KEY"
                : "自定义端点必须在「设置」中填入你自己的 API Key（站点环境变量 Key 不会转发给第三方端点）")
              return
            }
            const upstream = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: body.model ?? DEFAULT_MODEL,
                messages: body.messages,
                stream: true,
              }),
            })
            if (!upstream.ok || !upstream.body) {
              res.statusCode = upstream.status
              res.setHeader("Content-Type", "application/json; charset=utf-8")
              res.end(JSON.stringify({ error: `上游 API ${upstream.status}: ${await upstream.text()}` }))
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
