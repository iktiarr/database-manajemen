import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client(customConfig = {}) {
	const endpoint = customConfig.endpoint || env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL_S3;
	const accessKeyId = customConfig.accessKeyId || env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = customConfig.secretAccessKey || env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
	const region = customConfig.region || env.AWS_REGION || process.env.AWS_REGION || 'ap-southeast-1';

	return new S3Client({
		region,
		endpoint,
		forcePathStyle: true,
		credentials: {
			accessKeyId,
			secretAccessKey
		}
	});
}

function isAuthorized(event) {
	if (event.locals.admin) return true;
	const authHeader = event.request.headers.get('authorization');
	const masterKey = env.APP_MASTER_KEY || process.env.APP_MASTER_KEY;
	return Boolean(masterKey && authHeader === `Bearer ${masterKey}`);
}

export async function GET(event) {
	if (!isAuthorized(event)) {
		return json({ error: 'Tidak diizinkan: Harap login terlebih dahulu' }, { status: 401 });
	}

	const bucket = event.url.searchParams.get('bucket') || 'assets';

	try {
		const s3 = getS3Client();
		const command = new ListObjectsV2Command({ Bucket: bucket });
		const response = await s3.send(command);

		const files = (response.Contents || []).map((item) => ({
			key: item.Key,
			size: item.Size,
			lastModified: item.LastModified
		}));

		return json({ success: true, bucket, files });
	} catch (err) {
		console.error('S3 List error:', err);
		return json({ success: false, error: err.message || 'Gagal mengambil daftar file S3' }, { status: 500 });
	}
}

export async function POST(event) {
	if (!isAuthorized(event)) {
		return json({ error: 'Tidak diizinkan: Harap login terlebih dahulu' }, { status: 401 });
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Format JSON tidak valid' }, { status: 400 });
	}

	const { action = 'upload', bucket = 'assets', key = 'uploads/file.txt', content = 'Hello World!' } = body;

	try {
		const s3 = getS3Client(body.config || {});

		if (action === 'upload') {
			await s3.send(new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: content,
				ContentType: 'text/plain'
			}));

			const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });

			return json({
				success: true,
				bucket,
				key,
				url,
				message: 'File berhasil diunggah ke storage S3!'
			});
		}

		if (action === 'getSignedUrl') {
			const expiresIn = Number(body.expiresIn) || 3600;
			const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });

			return json({
				success: true,
				bucket,
				key,
				url,
				expiresIn
			});
		}

		return json({ error: 'Aksi storage tidak dikenali' }, { status: 400 });
	} catch (err) {
		console.error('Storage action error:', err);
		return json({ error: err.message || 'Terjadi kesalahan pada layanan S3 Storage' }, { status: 500 });
	}
}
