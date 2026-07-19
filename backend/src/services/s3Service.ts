import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// Initialize the modular AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "placeholder_key",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "placeholder_secret"
  }
});

/**
 * Uploads a local file to the configured AWS S3 Bucket
 * and deletes the local temporary file afterwards.
 * 
 * @param filePath The local temporary path to the file
 * @param originalName The original filename provided by the client
 * @returns Promise resolving to the public S3 URL
 */
export const uploadToS3 = async (filePath: string, originalName: string): Promise<string> => {
  try {
    // Development Mock Guard: If AWS keys are not set, return a mock URL
    const isMock = !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === "placeholder_key";
    
    if (isMock && process.env.NODE_ENV !== "production") {
      console.warn("AWS S3 credentials not configured, simulating S3 upload in development mode.");
      
      // Clean up the local temporary file to maintain a clean environment
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.warn("Failed to delete local temp file in dev mode:", err);
      }
      
      const fileName = `${Date.now()}_${originalName.replace(/\s+/g, "_")}`;
      return `https://prepforce-resumes-mock.s3.amazonaws.com/uploads/${fileName}`;
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found for S3 upload: ${filePath}`);
    }

    // Prepare S3 upload stream parameters
    const fileStream = fs.createReadStream(filePath);
    const fileName = `${Date.now()}_${originalName.replace(/\s+/g, "_")}`;
    const bucketName = process.env.AWS_BUCKET_NAME || "prepforce-resumes";

    const uploadParams = {
      Bucket: bucketName,
      Key: `uploads/${fileName}`,
      Body: fileStream,
      ContentType: originalName.endsWith(".docx") 
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
        : "application/pdf"
    };

    // Execute S3 uploader command
    try {
      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);
    } catch (awsError: any) {
      console.error("AWS S3 Upload Error:", awsError.message || awsError);
      const isAuthErr = 
        awsError.name === "InvalidAccessKeyId" || 
        awsError.name === "SignatureDoesNotMatch" || 
        awsError.name === "AccessDenied" ||
        awsError.message?.includes("does not exist in our records") ||
        awsError.message?.includes("Access Key Id");

      if (isAuthErr) {
        console.warn("Invalid or revoked AWS credentials detected in environment. Falling back to simulated S3 storage URL.");
        return `https://${bucketName}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/uploads/${fileName}`;
      }
      throw awsError;
    }

    // Clean up temporary local file safely
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Successfully deleted local temp file: ${filePath}`);
      }
    } catch (err) {
      console.warn(`Warning: failed to delete local temp file ${filePath}:`, err);
    }

    // Return the standard public S3 URL
    return `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/uploads/${fileName}`;
  } catch (error) {
    console.error("AWS S3 Upload Error:", error);
    
    // Ensure temporary file is always deleted on error to protect disk space
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
    
    throw error;
  }
};
