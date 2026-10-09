import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

/**
 * Inline the main CSS bundle into `<style>` inside the HTML so the browser
 * doesn't have to make a second round-trip before it can paint. Lighthouse
 * was flagging the 15 KB `index-*.css` as a 300 ms render-blocking request
 * on mobile; inlining it drops that cost to zero.
 */
function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        for (const [fileName, asset] of Object.entries(bundle)) {
          if (asset.type !== 'asset' || !fileName.endsWith('.css')) continue;
          const css = typeof asset.source === 'string' ? asset.source : asset.source.toString();
          // Strip the <link rel="stylesheet"> for this file + inline the CSS.
          const linkRe = new RegExp(
            `<link\\s+rel="stylesheet"[^>]*href="[^"]*${fileName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"[^>]*>`,
            'g'
          );
          html = html.replace(linkRe, `<style>${css}</style>`);
        }
        return html;
      },
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    inlineCss(),
  ],
  resolve: {
    alias: [
      // Alias @ to the src directory
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // React Router 7's package exports only point at its development build
      // (dev warnings, invariant messages). It ships a production build too;
      // use it for production bundles.
      ...(command === 'build'
        ? [
            {
              find: /^react-router$/,
              replacement: path.resolve(
                __dirname,
                'node_modules/react-router/dist/production/index.mjs'
              ),
            },
          ]
        : []),
    ],
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    // Source maps help debugging in production and satisfy the Lighthouse
    // "Missing source maps for large first-party JavaScript" diagnostic.
    // Source map files are only fetched when DevTools is open, so zero cost
    // for regular users.
    sourcemap: true,
    // Split big third-party deps into their own cacheable chunks, so the
    // initial JS payload stays lean and upgrades don't bust the whole cache.
    rollupOptions: {
      output: {
        // Path-based, not name-based. The previous object form listed
        // react-dom under react-vendor, but Recharts' own dependency on it
        // pulled react-dom into the charts chunk — so every page preloaded
        // 148 KB (gzipped) of chart code to get React. Matching on the
        // resolved path pins each module to exactly one chunk.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          const pkg = /node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(id)?.[1] ?? '';
          if (['react', 'react-dom', 'scheduler', 'react-router'].includes(pkg)) {
            return 'react-vendor';
          }
          if (pkg.startsWith('@supabase/')) return 'supabase';
          // Motion and lucide-react are left to Rollup on purpose: grouped into
          // one chunk they put every animation feature and every icon used
          // anywhere onto the critical path. Split naturally, the first paint
          // gets only what the home page uses; the rest ships with its page.
          if (pkg === 'chess.js') return 'chess';
          // Recharts and everything only it uses: lazy, Progress page only.
          if (
            /^(recharts|recharts-scale|react-smooth|victory-vendor|d3-.*|internmap|decimal\.js-light|eventemitter3|lodash|fast-equals|tiny-invariant|react-is|prop-types|clsx|dom-helpers|react-transition-group)$/.test(
              pkg
            )
          ) {
            return 'charts';
          }
          return undefined;
        },
      },
    },
    // Slightly lower chunk warning threshold so we notice future bloat.
    chunkSizeWarningLimit: 600,
  },
}));
