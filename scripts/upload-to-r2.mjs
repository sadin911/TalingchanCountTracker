import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const secretRaw = fs.readFileSync('secret.yaml', 'utf-8');
const accessKey = secretRaw.match(/AccessKey:\s*([^\r\n]+)/)?.[1]?.trim();
const secretKey = secretRaw.match(/Secret:\s*([^\r\n]+)/)?.[1]?.trim();
const endpoint = secretRaw.match(/S3Endpoint:\s*([^\r\n]+)/)?.[1]?.trim();
const BUCKET_NAME = 'talingchancount-cards';
const PUBLIC_R2_URL = 'https://pub-851c7b1da9514507a99b79bc2fd47577.r2.dev';

if (!accessKey || !secretKey || !endpoint) {
  console.error('❌ Missing R2 credentials in secret.yaml');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: endpoint,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

const CARD_DIR = path.resolve('public/card-images');

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const fullPath = path.join(dir, f.name);
    if (f.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (f.name.endsWith('.webp') || f.name.endsWith('.png') || f.name.endsWith('.jpg')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function uploadFile(filePath) {
  const relativeKey = path.relative(path.resolve('public'), filePath).replace(/\\/g, '/');
  const fileBuffer = fs.readFileSync(filePath);
  const contentType = filePath.endsWith('.webp') ? 'image/webp' : 'image/png';

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: relativeKey,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3.send(command);
}

async function main() {
  console.log(`🚀 Starting Cloudflare R2 Upload for Battle of Talingchan...`);
  console.log(`📦 Bucket: "${BUCKET_NAME}"`);
  console.log(`🌐 Public Domain: "${PUBLIC_R2_URL}"`);
  console.log(`🔍 Scanning local images in ${CARD_DIR}...`);

  const allFiles = getAllFiles(CARD_DIR);
  console.log(`📦 Found ${allFiles.length} images to sync to R2.\n`);

  if (allFiles.length === 0) {
    console.log('No files found to upload.');
    return;
  }

  const CONCURRENCY = 25;
  let completed = 0;
  let errors = 0;
  const startTime = Date.now();
  const queue = [...allFiles];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      try {
        await uploadFile(file);
        completed++;
        if (completed % 100 === 0 || completed === allFiles.length) {
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (completed / elapsedSec).toFixed(1);
          const pct = ((completed / allFiles.length) * 100).toFixed(1);
          console.log(`[R2 Upload] ${completed}/${allFiles.length} (${pct}%) | ${rate} files/sec | ${elapsedSec}s elapsed`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Failed to upload ${file}:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Upload Complete!`);
  console.log(`✅ Uploaded: ${completed} files`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⏱️ Total Time: ${totalTime}s`);
  console.log(`🌐 Public Test URL: ${PUBLIC_R2_URL}/card-images/BT01/001.webp`);
}

main().catch(console.error);
