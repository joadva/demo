import { defineConfig } from 'vitest/config';

// Los valores coinciden con los que vitest usa por omision; se dejan explicitos
// para que quede claro que corre y que no.
export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.aws-sam/**',
      '**/frontend/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'clover', 'html'],
      reportsDirectory: 'docs/coverage',
      exclude: ['src/**/tests/**']
    }
  }
});
