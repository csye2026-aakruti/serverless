const axios = require("axios");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  const message = JSON.parse(event.Records[0].Sns.Message);
  const { email, token, firstName } = message;

  const tableName = process.env.DYNAMODB_TABLE;
  const baseUrl = process.env.VERIFY_BASE_URL;
  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;

  // Check for duplicate — if token already exists in DynamoDB, skip
  const existing = await ddb.send(new GetCommand({
    TableName: tableName,
    Key: { token },
  }));

  if (existing.Item) {
    console.log("Duplicate SNS delivery detected, skipping:", token);
    return;
  }

  // Store token in DynamoDB with TTL = now + 2 minutes
  const ttl = Math.floor(Date.now() / 1000) + 60;
  await ddb.send(new PutCommand({
    TableName: tableName,
    Item: { token, email, ttl },
  }));

  // Send verification email via Mailgun
  const verifyUrl = `${baseUrl}/validateEmail?email=${email}&token=${token}`;
  const formData = new URLSearchParams();
  formData.append("from", `Aakruti App <mailgun@${mailgunDomain}>`);
  formData.append("to", email);
  formData.append("subject", "Verify your email address");
  formData.append("text", `Hi ${firstName},\n\nPlease verify your email within 2 minutes:\n${verifyUrl}\n\nIf you did not create an account, ignore this email.`);

  await axios.post(
    `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
    formData,
    {
      auth: { username: "api", password: mailgunApiKey },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  console.log("Verification email sent to:", email);
};