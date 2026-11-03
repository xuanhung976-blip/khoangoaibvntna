import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const pathname = req.url.split('?')[0];

        try {
          // Read request body
          const chunks: any[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const rawBody = Buffer.concat(chunks).toString('utf-8');
          let parsedBody: any = {};
          try {
            parsedBody = rawBody ? JSON.parse(rawBody) : {};
          } catch {
            parsedBody = rawBody;
          }

          // Mock Express/Vercel response helpers
          const vercelRes = res as any;
          vercelRes.status = (code: number) => {
            res.statusCode = code;
            return vercelRes;
          };
          vercelRes.json = (data: any) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(data));
            return vercelRes;
          };

          const vercelReq = req as any;
          vercelReq.body = parsedBody;

          if (pathname === '/api/rpc') {
            const mod = await server.ssrLoadModule('/api/rpc.ts');
            return await mod.default(vercelReq, vercelRes);
          }

          if (pathname === '/api/clinical') {
            const mod = await server.ssrLoadModule('/api/clinical.ts');
            return await mod.default(vercelReq, vercelRes);
          }

          next();
        } catch (err: any) {
          console.error('[API DEV MIDDLEWARE ERROR]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Internal Dev API Error' }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, val] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }

  return {
    plugins: [react(), apiDevPlugin()],
    base: '/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
