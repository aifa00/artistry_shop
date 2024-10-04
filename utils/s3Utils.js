import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

function createS3() {
  return new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION,
  });
}

export const getPreSignedUrl = async (key) => {
  try {
    const s3 = createS3();

    const getObjectParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };
    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return url;
  } catch (error) {
    throw new Error("Failed to get URL from S3");
  }
};

export const uploadFileToS3 = async (file, folder) => {
  try {
    const s3 = createS3();

    const key = `${folder}/${uuidv4()}.jpg`;

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    return key;
  } catch (error) {
    throw new Error("Failed to upload image");
  }
};

export const deleteFileFromS3 = async (key) => {
  try {
    const s3 = createS3();

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);

    await s3.send(command);

    return true;
  } catch (error) {
    throw new Error("Failed to delete file from S3");
  }
};
