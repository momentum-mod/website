import { join } from 'path';
import { Plugin } from 'esbuild';

const plugin: Plugin = {
  name: 'sitemap-redirect-generator',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;

      console.log('Creating sitemap redirect...');
      const outPath = join(build.initialOptions.outdir, '_redirects');
      const content =
        '/sitemap.xml https://cdn.momentum-mod.org/dashboard-sitemap.xml 301';
      result.outputFiles.push({
        path: outPath,
        hash: '',
        text: content,
        contents: Buffer.from(content)
      });
    });
  }
};

export default plugin;
