import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-questions-only',
      configureServer(server) {
        server.middlewares.use('/dev-questions.json', (_req, res) => {
          const file = path.resolve(__dirname, 'data/questions.json')
          if (fs.existsSync(file)) {
            res.setHeader('Content-Type', 'application/json')
            res.end(fs.readFileSync(file))
          } else {
            res.statusCode = 404
            res.end('Run: python scripts/parse_questions.py')
          }
        })
        server.middlewares.use('/questions.json', (_req, res) => {
          res.statusCode = 403
          res.end('Forbidden')
        })
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
