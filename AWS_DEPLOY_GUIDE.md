# Tutorial Manual AWS SecureShare

Panduan ini dibuat untuk kondisi dosen meminta semua resource dibuat satu per satu lewat AWS Console.

Kode Lambda sudah ada di folder:

```text
backend/
```

Frontend lama tetap dipakai:

```text
pages/
js/
css/
```

## 1. Resource yang Harus Dibuat

Buat manual di AWS:

```text
1. S3 bucket private untuk file
2. DynamoDB table Users
3. DynamoDB table Files
4. DynamoDB table Shares
5. SNS topic untuk notifikasi
6. IAM role untuk Lambda
7. Lambda functions
8. API Gateway HTTP API
9. CloudWatch Logs otomatis dari Lambda
```

Tidak pakai Cognito. Auth dibuat sendiri:

```text
POST /auth/register
POST /auth/login
```

## 2. Buat S3 Bucket

AWS Console:

```text
S3 -> Create bucket
```

Nama contoh:

```text
secure-oneview-files-nama-kamu
```

Setting:

```text
Block all public access: ON
Bucket versioning: optional
Default encryption: SSE-S3
```

Masuk bucket -> Permissions -> CORS, isi:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["http://localhost:5500"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Kalau frontend sudah hosting online, ganti origin ke domain frontend kamu.

## 3. Buat DynamoDB Table Users

AWS Console:

```text
DynamoDB -> Tables -> Create table
```

Nama:

```text
secure-oneview-users
```

Partition key:

```text
userId String
```

Billing:

```text
On-demand
```

Setelah table jadi, buat GSI:

```text
Index name: email-index
Partition key: email String
Projection: All
```

## 4. Buat DynamoDB Table Files

Nama:

```text
secure-oneview-files
```

Partition key:

```text
fileId String
```

GSI:

```text
Index name: owner-index
Partition key: ownerId String
Sort key: createdAt String
Projection: All
```

TTL:

```text
Attribute name: ttl
Enable TTL
```

## 5. Buat DynamoDB Table Shares

Nama:

```text
secure-oneview-shares
```

Partition key:

```text
shareId String
```

Buat GSI berikut:

```text
token-index
Partition key: token String
Projection: All
```

```text
sender-index
Partition key: senderId String
Sort key: createdAt String
Projection: All
```

```text
recipient-index
Partition key: recipientId String
Sort key: createdAt String
Projection: All
```

```text
status-expiry-index
Partition key: status String
Sort key: expiresAt Number
Projection: All
```

TTL:

```text
Attribute name: ttl
Enable TTL
```

## 6. Buat SNS Topic

AWS Console:

```text
SNS -> Topics -> Create topic
```

Type:

```text
Standard
```

Nama:

```text
secure-oneview-notifications
```

Setelah topic dibuat:

```text
Create subscription
Protocol: Email
Endpoint: email kamu
```

Buka email, klik confirm subscription.

## 7. Buat IAM Role untuk Lambda

AWS Console:

```text
IAM -> Roles -> Create role
Trusted entity: AWS service
Use case: Lambda
```

Nama:

```text
secure-oneview-lambda-role
```

Tambahkan permission policy custom. Ganti bagian ARN sesuai region/account/resource kamu.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::secure-oneview-files-nama-kamu/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/secure-oneview-users",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/secure-oneview-users/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/secure-oneview-files",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/secure-oneview-files/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/secure-oneview-shares",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/secure-oneview-shares/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:ACCOUNT_ID:secure-oneview-notifications"
    }
  ]
}
```

## 8. Siapkan ZIP Lambda

Dari folder project:

```powershell
cd "D:\PROJEK_CCS unna\PROJEK_CCS\backend"
npm install --omit=dev
Compress-Archive -Path * -DestinationPath ..\lambda-package.zip -Force
```

ZIP ini dipakai untuk semua Lambda function. Bedanya hanya handler.

Setiap kali kode di folder `backend` berubah, ulangi proses ZIP ini dan upload ulang ke Lambda yang terkait.

## 9. Buat Lambda Functions

AWS Console:

```text
Lambda -> Create function -> Author from scratch
Runtime: Node.js 20.x
Architecture: x86_64
Execution role: secure-oneview-lambda-role
```

Buat function berikut:

| Function name | Handler |
|---|---|
| secure-oneview-register | handlers/register.handler |
| secure-oneview-login | handlers/login.handler |
| secure-oneview-list-users | handlers/list-users.handler |
| secure-oneview-create-upload-url | handlers/create-upload-url.handler |
| secure-oneview-complete-upload | handlers/complete-upload.handler |
| secure-oneview-list-files | handlers/list-files.handler |
| secure-oneview-create-share | handlers/create-share.handler |
| secure-oneview-list-shares | handlers/list-shares.handler |
| secure-oneview-validate-share | handlers/validate-share.handler |
| secure-oneview-monitoring | handlers/monitoring.handler |
| secure-oneview-expire-shares | handlers/expire-shares.handler |

Untuk setiap function:

```text
Code -> Upload from -> .zip file -> lambda-package.zip
Runtime settings -> Handler sesuai tabel
Configuration -> Environment variables
```

Environment variables semua function:

```text
AUTH_SECRET=isi-rahasia-minimal-32-karakter
USERS_TABLE=secure-oneview-users
USER_TABLE=secure-oneview-users
FILES_TABLE=secure-oneview-files
SHARES_TABLE=secure-oneview-shares
FILE_BUCKET=secure-oneview-files-nama-kamu
NOTIFICATIONS_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:secure-oneview-notifications
MAX_FILE_SIZE_BYTES=10485760
```

Timeout:

```text
20 seconds
```

Memory:

```text
256 MB
```

## 10. Buat EventBridge untuk Expiry

Untuk function:

```text
secure-oneview-expire-shares
```

Tambahkan trigger:

```text
EventBridge
Rule: rate(5 minutes)
```

Function ini mengecek share yang sudah expired dan mengubah status ke `EXPIRED`.

## 11. Buat API Gateway HTTP API

AWS Console:

```text
API Gateway -> Create API -> HTTP API -> Build
```

Nama:

```text
secure-oneview-api
```

Tambahkan integrations ke masing-masing Lambda.

Buat routes:

| Method | Route | Lambda |
|---|---|---|
| POST | /auth/register | secure-oneview-register |
| POST | /auth/login | secure-oneview-login |
| GET | /users | secure-oneview-list-users |
| POST | /files/upload-url | secure-oneview-create-upload-url |
| POST | /files/complete | secure-oneview-complete-upload |
| GET | /files | secure-oneview-list-files |
| POST | /shares | secure-oneview-create-share |
| GET | /shares | secure-oneview-list-shares |
| POST | /shares/validate | secure-oneview-validate-share |
| GET | /monitoring | secure-oneview-monitoring |

Stage:

```text
$default
Auto-deploy: ON
```

CORS:

```text
Access-Control-Allow-Origin: http://localhost:5500
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

Setelah selesai, catat invoke URL:

```text
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

## 12. Isi Frontend Config

Buka:

```text
js/config.js
```

Isi:

```js
window.APP_CONFIG = {
  apiBaseUrl: "https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com"
};
```

## 13. Jalankan Frontend

Dari folder `PROJEK_CCS`:

```powershell
python -m http.server 5500
```

Buka:

```text
http://localhost:5500/pages/register.html
```

## 14. Alur Testing

1. Register akun pengirim.
2. Logout.
3. Register akun penerima.
4. Login sebagai pengirim.
5. Upload file di halaman Upload.
6. Pilih penerima.
7. Klik Upload & Share.
8. Copy link one-view.
9. Logout.
10. Login sebagai penerima.
11. Buka link one-view.
12. File terbuka dari S3 presigned URL.
13. Buka ulang link yang sama.
14. Harus ditolak karena status di DynamoDB sudah `VIEWED`.

## 15. Bukti untuk Dosen

Yang bisa kamu tunjukkan:

- S3 bucket berisi file asli.
- DynamoDB Users berisi akun register.
- DynamoDB Files berisi metadata file.
- DynamoDB Shares berisi token dan status one-view.
- Lambda functions berjalan satu per satu.
- API Gateway routes mengarah ke Lambda.
- SNS topic mengirim email.
- CloudWatch Logs berisi log invocation Lambda.

## 16. Catatan

Project ini tidak membutuhkan template deploy. Semua resource dibuat manual lewat AWS Console sesuai langkah di atas.

## 17. Troubleshooting Error 500

Jika setelah login muncul `Internal Server Error`:

- Upload ulang ZIP terbaru ke `secure-oneview-list-files`, `secure-oneview-list-shares`, dan `secure-oneview-monitoring`.
- Pastikan env var table di semua Lambda sudah benar.
- Jika GSI belum dibuat, kode terbaru bisa fallback ke `Scan`, tapi IAM role tetap wajib punya `dynamodb:Scan`.
- Cek CloudWatch Logs pada Lambda yang error.

Jika upload gagal:

- Upload ulang ZIP terbaru ke `secure-oneview-create-upload-url`, `secure-oneview-complete-upload`, `secure-oneview-list-files`, dan `secure-oneview-create-share`.
- Pastikan env var `FILE_BUCKET`, `FILES_TABLE`, `SHARES_TABLE`, `USERS_TABLE`, dan `AUTH_SECRET` sudah ada.
- Pastikan IAM role Lambda punya `s3:PutObject`, `s3:GetObject`, `s3:HeadObject`, `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:UpdateItem`, `dynamodb:Query`, dan `dynamodb:Scan`.
- Pastikan S3 CORS mengizinkan origin frontend, misalnya `http://localhost:5500`.
