import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const BUCKET_NAME = process.env.NEON_STORAGE_BUCKET || "assets";

export function getS3Client(): S3Client {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION || "us-east-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Neon Object Storage is not configured. Missing AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, or AWS_SECRET_ACCESS_KEY."
    );
  }

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function uploadAsset(
  key: string,
  body: string | Buffer | Uint8Array,
  contentType = "text/plain"
) {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  return await client.send(command);
}

export async function getAsset(key: string) {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await client.send(command);
  if (!response.Body) return null;
  return await response.Body.transformToString();
}

export async function listAssets(prefix?: string) {
  const client = getS3Client();
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  const res = await client.send(command);
  return res.Contents || [];
}

export async function deleteAsset(key: string) {
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await client.send(command);
}
