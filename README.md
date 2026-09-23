# BackendAppMovilClientes SZUCEES

Backend for the mobile client app. This project provides backend services and APIs for managing client data, authentication, and business logic for the mobile application used by customers.

## Overview
This project is the backend for the mobile client application. It handles all business logic, integrations, and data management required by the app, including user authentication, client data operations, and integration with external services.

## Features
- AWS Lambda serverless architecture
- API Gateway for RESTful endpoints
- User authentication and client data management
- Integration with external APIs (Google, AWS, etc.)
- Centralized logging, metrics, and tracing using AWS Lambda Powertools
- Automated resource cleanup via GitHub Actions
- OpenAPI documentation for all endpoints

## Technologies & Dependencies

- Node.js
- AWS Lambda
- AWS API Gateway
- AWS SAM
- AWS Lambda Powertools
- Vitest (testing)
- ESLint (linting)

### Main dependencies and versions

Runtime (se empaquetan en las Lambdas):

| Package                           | Version    |
|-----------------------------------|------------|
| @aws-lambda-powertools/logger     | ^2.35.0    |
| @aws-lambda-powertools/metrics    | ^2.35.0    |
| @aws-lambda-powertools/parameters | ^2.35.0    |
| @aws-lambda-powertools/tracer     | ^2.35.0    |
| @aws-sdk/client-secrets-manager   | ^3.1132.0  |
| @middy/core                       | ^7.9.2     |
| mysql2                            | ^3.24.4    |

Desarrollo:

| Package                  | Version    |
|--------------------------|------------|
| eslint                   | ^10.10.0   |
| @eslint/js               | ^10.0.1    |
| @stylistic/eslint-plugin | ^5.10.0    |
| globals                  | ^17.12.0   |
| vitest                   | ^5.0.0     |
| @vitest/coverage-v8      | ^5.0.0     |
| @stoplight/spectral-cli  | ^6.16.3    |
| axios                    | ^1.20.0    |

Requiere Node >= 22 (`engines` en package.json). El runtime de las Lambdas es `nodejs24.x` y CI usa Node 24.

## Folder Structure Diagram

```
BackendAppMovilClientes/
├── src/
│   ├── functions/
│   │   └── echo/
│   │       └── index.mjs
│   ├── shared/
│   │   ├── apigateway/
│   │   ├── database/
│   │   └── lambda-powertools/
│   └── ...
├── openapi.yaml
├── package.json
├── README.md
├── .github/
│   └── workflows/
│       └── cleanup-dev.yaml
└── portman/
    ├── portman-cli.json
    ├── portman-config.json
    └── ...
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run tests:**
   ```bash
   npm test            # una sola corrida
   npm run test:watch  # modo interactivo
   npm run coverage    # con cobertura, reporte en docs/coverage
   ```
3. **Lint code:**
   ```bash
   npm run lint        # ESLint (configuracion plana en eslint.config.mjs)
   npm run lint-api    # Spectral sobre openapi.yaml
   ```
4. **API documentation:**
   Open `openapi.yaml` with an OpenAPI viewer or use Spectral for linting.

## Deployment

Deployment is managed via AWS SAM and GitHub Actions. See `.github/workflows/cleanup-dev.yaml` for automated resource cleanup.

## Environment Variables

- `DATABASE_CONNECTION_SECRET`: AWS Secrets Manager secret for DB credentials
- `AWS_ACCOUNT_ID`, `AWS_REGION`: AWS account and region info

## Contributing

Pull requests and issues are welcome. Please follow the coding standards and ensure all tests pass before submitting changes.

## Contact

For questions or support, contact:

- Adrian Valentin (@javalentinr)

## License

MIT
