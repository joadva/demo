export default {
  vitestConfig: {
    filter: 'src/**/**/test/*.spec.mjs',
    include: '**/*.{test,spec}.?(c|m)[jt]s?(x)',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
    ],
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**'
    ]
  }
};
