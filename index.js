const axios = require("axios");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
  console.log("Lambda invoked with event:", JSON.stringify(event));

  try {
    const message = JSON.parse(event.Records[0].Sns.Message);
    const { email, token, firstName } = message;

    console.log("Processing verification for:", email);

    const tableName = process.env.DYNAMODB_TABLE;
    const baseUrl = process.env.VERIFY_BASE_URL;
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    // Check for duplicate
    const existing = await ddb.send(new GetCommand({
      TableName: tableName,
      Key: { token },
    }));

    if (existing.Item) {
      console.log("Duplicate SNS delivery detected, skipping:", token);
      return;
    }

    // Store token in DynamoDB with TTL = now + 1 minute
    const ttl = Math.floor(Date.now() / 1000) + 60;
    await ddb.send(new PutCommand({
      TableName: tableName,
      Item: { token, email, ttl },
    }));

    console.log("Token stored in DynamoDB for:", email);

    // Send verification email via Mailgun
    const verifyUrl = `${baseUrl}/validateEmail?email=${email}&token=${token}`;
    const formData = new URLSearchParams();
    formData.append("from", `Aakruti App <mailgun@${mailgunDomain}>`);
    formData.append("to", email);
    formData.append("subject", "Verify your email address");
    formData.append("text", `Hi ${firstName},\n\nPlease verify your email within 1 minute:\n${verifyUrl}\n\nIf you did not create an account, ignore this email.`);

    await axios.post(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      formData,
      {
        auth: { username: "api", password: mailgunApiKey },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    console.log("Verification email sent to:", email);

  } catch (err) {
    console.error("Lambda execution failed:", err);
    throw err;
  }
};