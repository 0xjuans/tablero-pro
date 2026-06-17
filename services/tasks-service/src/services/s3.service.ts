import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME!;

export const s3Service = {
  // Genera una URL firmada (presigned URL) que permite al cliente subir un archivo
  // directo a S3 sin exponer las credenciales de AWS.
  // La URL expira en 5 minutos — suficiente para completar el upload.
  async generarUrlDeSubida(fileName: string, mimeType: string, taskId: string) {
    // Organizamos los archivos en carpetas por tarea para facilitar gestión y limpieza
    const s3Key = `tasks/${taskId}/${randomUUID()}-${fileName}`;

    const comando = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(s3, comando, { expiresIn: 300 });
    const s3Url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    return { uploadUrl, s3Key, s3Url };
  },

  // Elimina un archivo de S3 cuando se borra el adjunto de la tarea
  async eliminarArchivo(s3Key: string) {
    const comando = new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key });
    await s3.send(comando);
  },
};
