import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

// Reemplaza a .eslintrc.json + eslint-config-google. Google dejo de mantener
// su config antes de la configuracion plana, y ESLint 10 ya no acepta la vieja.
// Las reglas de formato viven ahora en @stylistic, con las mismas opciones
// que traia google para que el codigo existente pase sin reformatearse.
export default [
  {
    ignores: [
      'node_modules/',
      '.aws-sam/',
      'docs/coverage/',
      'collection.postman.json'
    ]
  },

  js.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: {
      '@stylistic': stylistic
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      // Reglas de estilo heredadas de eslint-config-google
      '@stylistic/indent': ['error', 2, {
        CallExpression: { arguments: 2 },
        FunctionDeclaration: { body: 1, parameters: 2 },
        FunctionExpression: { body: 1, parameters: 2 },
        MemberExpression: 2,
        ObjectExpression: 1,
        SwitchCase: 1,
        ignoredNodes: [
          'ConditionalExpression'
        ]
      }],
      '@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: 'always' }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/object-curly-spacing': ['error', 'always', { objectsInObjects: true }],
      '@stylistic/max-len': ['warn', { code: 400 }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/space-infix-ops': 'error',

      // Reglas de calidad que traia google
      'camelcase': ['error', { properties: 'never' }],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'one-var': ['error', 'never'],

      // Ajustes propios del proyecto, tal como estaban en .eslintrc.json
      'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
      'dot-notation': 'error',
      'no-unused-vars': 'off'
    }
  },

  {
    // Los scripts de portman son CommonJS
    files: ['portman/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs'
    }
  }
];
