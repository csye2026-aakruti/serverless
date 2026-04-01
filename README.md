# Serverless - Email Verification Lambda

AWS Lambda function that sends email verification messages when new user accounts are created.

## Prerequisites

- Node.js 20.x
- AWS CLI configured with appropriate credentials
- AWS account with Lambda, SNS, DynamoDB, and IAM permissions
- Mailgun account with a verified domain and API key

## Environment Variables

The Lambda function requires the following environment variables:

| Variable | Description |
|---|---|
| `MAILGUN_API_KEY` | Mailgun API key |
| `MAILGUN_DOMAIN` | Mailgun sending domain |
| `DYNAMODB_TABLE` | DynamoDB table name for tracking sent emails |
| `VERIFY_BASE_URL` | Base URL for verification link (e.g. http://demo.aakrutighatole.me:3000) |

## Local Development
```bash
npm install
```

## Deployment

Deployment is handled via Terraform in the `tf-infra` repository. The Lambda function is packaged as a ZIP file and deployed automatically.

To manually package:
```bash
zip -r lambda.zip index.js node_modules/
```