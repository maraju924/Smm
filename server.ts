import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app, {
  ServerApiTrafficLog,
  getServerGoogleVerificationToken,
  resolveLiveRequestOrigin
} from './api/index';

export type { ServerApiTrafficLog };
export { app };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

function injectVerificationAndLiveDomainIntoHtml(
  rawHtml: string,
  liveOrigin: string,
  token: string
): string {
  let html = rawHtml;
  if (liveOrigin) {
    html = html.replace(/https:\/\/boostlagbe\.com/g, liveOrigin.replace(/\/+$/, ''));
  }
  if (!token) return html;
  const safeToken = token.replace(/["'<>]/g, '');
  const metaTag = `<meta name="google-site-verification" content="${safeToken}" />`;
  if (html.includes('name="google-site-verification"')) {
    return html.replace(
      /<meta\s+name=["']google-site-verification["'][^>]*>/i,
      metaTag
    );
  }
  return html.replace('<head>', `<head>\n    ${metaTag}`);
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    // Intercept root HTML requests in dev/preview to inject server-side Live Domain & Google Search Console meta tag
    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (
        req.method === 'GET' &&
        (req.path === '/' || req.path === '/index.html') &&
        !req.path.startsWith('/api/')
      ) {
        try {
          const token = await getServerGoogleVerificationToken();
          const liveOrigin = resolveLiveRequestOrigin(req);
          const templatePath = path.join(__dirname, 'index.html');
          let template = fs.readFileSync(templatePath, 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          template = injectVerificationAndLiveDomainIntoHtml(template, liveOrigin, token);
          res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(template);
          return;
        } catch {
          // fallback to standard vite middleware
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', async (req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      try {
        const token = await getServerGoogleVerificationToken();
        const liveOrigin = resolveLiveRequestOrigin(req);
        if (fs.existsSync(indexPath)) {
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const injected = injectVerificationAndLiveDomainIntoHtml(rawHtml, liveOrigin, token);
          res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(injected);
          return;
        }
      } catch {
        // fallback to sendFile
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AmarTrend Server] Full-Stack Express + Firestore Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
