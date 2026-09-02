# BackendAppMovilClientes

Backend for the mobile client app. This project provides backend services and APIs for managing client data, authentication, and business logic for the mobile application used by customers.

## Overview
This project is the backend for the mobile client application. It handles all business logic, integrations, and data management required by the app, including user authentication, client data operations, and integration with external services..

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

| Package                                 | Version    |
|------------------------------------------|------------|
| @aws-lambda-powertools/logger           | ^2.0.0     |
| @aws-lambda-powertools/metrics          | ^2.0.0     |
| @aws-lambda-powertools/parameters       | ^2.0.0     |
| @aws-lambda-powertools/tracer           | ^2.0.0     |
| @aws-sdk/client-secrets-manager         | ^3.855.0   |
| @middy/core                             | ^5.2.4     |
| googleapis                              | ^140.0.1   |
| mysql2                                  | ^3.14.2    |
| @stoplight/spectral-cli                 | ^6.10.1    |
| @vitest/coverage-v8                     | ^1.3.1     |
| aws-sdk-client-mock                     | ^3.0.0     |
| axios                                   | ^1.6.7     |
| c8                                      | ^9.1.0     |
| crypto                                  | ^1.0.1     |
| eslint                                  | ^8.48.0    |
| eslint-config-google                    | ^0.14.0    |
| jsonwebtoken                            | ^9.0.2     |
| vitest                                  | ^1.3.1     |

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
   npm test
   ```
3. **Lint code:**
   ```bash
   npm run lint
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
