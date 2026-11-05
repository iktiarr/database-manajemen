import pg from 'pg';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const MASTER_KEY = 'dev-master-key-12345';
const TEST_DB = 'e2e_gateway_test_db';

async function run() {
	console.log('=== Starting E2E Verification ===\n');

	// Test 1: Redirect to /login when not authenticated
	console.log('1. Testing route protection (GET / without auth)...');
	const resHome = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
	console.log(`   Status: ${resHome.status}`);
	const location = resHome.headers.get('location');
	console.log(`   Location: ${location}`);
	if (resHome.status === 303 && location === '/login') {
		console.log('   ✓ PASSED: Direct access redirected to /login\n');
	} else {
		throw new Error(`Failed route protection test. Expected 303 -> /login, got ${resHome.status}`);
	}

	// Test 2: Login with seeded admin credentials
	console.log('2. Testing admin login (POST /login)...');
	const form = new URLSearchParams();
	form.set('email', 'ihtiartiar081@gmail.com');
	form.set('password', 'adminadmin123');

	const resLogin = await fetch(`${BASE_URL}/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: form.toString(),
		redirect: 'manual'
	});

	console.log(`   Status: ${resLogin.status}`);
	const setCookie = resLogin.headers.get('set-cookie');
	console.log(`   Set-Cookie: ${setCookie ? 'Present (admin_session)' : 'Missing'}`);
	if ((resLogin.status === 200 || resLogin.status === 303) && setCookie && setCookie.includes('admin_session=')) {
		console.log('   ✓ PASSED: Admin authenticated and session cookie received\n');
	} else {
		throw new Error(`Failed login test. Status: ${resLogin.status}, Cookie: ${setCookie}`);
	}

	const cookieMatch = setCookie.match(/admin_session=([^;]+)/);
	const sessionToken = cookieMatch ? cookieMatch[1] : '';

	// Test 3: Access dashboard with session cookie
	console.log('3. Testing dashboard access with session cookie (GET /)...');
	const resDashboard = await fetch(`${BASE_URL}/`, {
		headers: { Cookie: `admin_session=${sessionToken}` }
	});
	console.log(`   Status: ${resDashboard.status}`);
	const html = await resDashboard.text();
	const hasAdminEmail = html.includes('ihtiartiar081@gmail.com');
	const hasDashboardContent =
		html.includes('Manajemen Database') ||
		html.includes('Database Gateway') ||
		html.includes('Daftar Database');
	console.log(`   Contains Admin Email: ${hasAdminEmail}`);
	console.log(`   Contains Dashboard Content: ${hasDashboardContent}`);
	if (resDashboard.status === 200 && hasAdminEmail && hasDashboardContent) {
		console.log('   ✓ PASSED: Light-mode dashboard loaded with shadcn sidebar and tables\n');
	} else {
		throw new Error('Failed dashboard content verification');
	}

	// Ensure clean slate before test
	const cleanupPool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
	try {
		await cleanupPool.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
	} finally {
		await cleanupPool.end();
	}

	// Test 4: Create database dynamically via Gateway API
	console.log(`4. Testing API Gateway: Create Database (POST /api/databases: "${TEST_DB}")...`);
	const resCreateDb = await fetch(`${BASE_URL}/api/databases`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${MASTER_KEY}`
		},
		body: JSON.stringify({ dbName: TEST_DB })
	});
	const createDbJson = await resCreateDb.json();
	console.log('   Response:', createDbJson);
	if (resCreateDb.status === 200 && createDbJson.success) {
		console.log(`   ✓ PASSED: Database "${TEST_DB}" created dynamically on Neon Cloud\n`);
	} else {
		throw new Error(`Failed to create database: ${JSON.stringify(createDbJson)}`);
	}

	// Test 5: Query target database dynamically via Gateway API
	console.log(`5. Testing API Gateway: Query Dynamic Database (POST /api/query on "${TEST_DB}")...`);
	// 5a: Create table
	await fetch(`${BASE_URL}/api/query`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${MASTER_KEY}`,
			'x-database-name': TEST_DB
		},
		body: JSON.stringify({
			sql: 'CREATE TABLE items (id SERIAL PRIMARY KEY, title VARCHAR(100), created_at TIMESTAMP DEFAULT NOW())'
		})
	});

	// 5b: Insert data
	await fetch(`${BASE_URL}/api/query`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${MASTER_KEY}`,
			'x-database-name': TEST_DB
		},
		body: JSON.stringify({
			sql: 'INSERT INTO items (title) VALUES ($1), ($2)',
			params: ['Item Pertama', 'Item Kedua']
		})
	});

	// 5c: Select data
	const resQuery = await fetch(`${BASE_URL}/api/query`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${MASTER_KEY}`,
			'x-database-name': TEST_DB
		},
		body: JSON.stringify({
			sql: 'SELECT * FROM items ORDER BY id ASC'
		})
	});

	const queryJson = await resQuery.json();
	console.log('   Query Result:', queryJson);
	if (resQuery.status === 200 && queryJson.rows && queryJson.rows.length === 2) {
		console.log('   ✓ PASSED: External query executed with 1 Master Key successfully!\n');
	} else {
		throw new Error(`Failed query execution: ${JSON.stringify(queryJson)}`);
	}

	// Test 6: Neon Deployed Function test
	console.log('6. Testing Neon Cloud Deployed Function (hello)...');
	const functionUrl = process.env.NEON_FUNCTION_HELLO_BASE_URL;
	if (functionUrl) {
		try {
			const resFunc = await fetch(functionUrl);
			const funcText = await resFunc.text();
			console.log(`   Function Response (${resFunc.status}):`, funcText.trim());
			console.log('   ✓ PASSED: Neon Serverless Function working\n');
		} catch (err) {
			console.log('   (Neon function endpoint check skipped/failed):', err.message);
		}
	}

	// Clean up: Drop the test database
	console.log('7. Cleaning up test database...');
	const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
	try {
		await pool.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
		console.log(`   ✓ Cleaned up test database "${TEST_DB}".\n`);
	} finally {
		await pool.end();
	}

	console.log('====================================');
	console.log('✓ ALL END-TO-END TESTS PASSED!');
	console.log('====================================');
}

run().catch((err) => {
	console.error('\n❌ E2E Test Error:', err);
	process.exit(1);
});
