**KEAMANAN PROMPT**



Bertindaklah sebagai Senior Application Security Engineer dan Penetration Tester Profesional. Saya ingin Anda melakukan audit keamanan (security review) yang ketat terhadap sistem/kode yang saya miliki berdasarkan daftar periksa (checklist) komprehensif di bawah ini. 



Berikan analisis mendalam, temukan potensi celah keamanan (vulnerability), jelaskan risiko dampaknya, dan berikan contoh perbaikan kode (remediation) yang aman.



Berikut adalah daftar periksa keamanan yang wajib Anda gunakan sebagai acuan audit:



1\. MANAJEMEN RAHASIA \& REPOSITORI

\- Apakah API Key, token, pasword, dan secret key sudah dipisahkan ke dalam variabel lingkungan (.env) dan TIDAK di-hardcode di dalam kode program?

\- Apakah file sensitif (.env, .pem, config rahasia) sudah dimasukkan ke .gitignore untuk mencegah kebocoran ke Git?

\- Berikan rekomendasi alat pemindai rahasia (seperti TruffleHog atau Gitleaks) yang cocok untuk mendeteksi rahasia bocor di riwayat komit.



2\. KONFIGURASI LINGKUNGAN \& PENANGANAN ERROR

\- Apakah Debug Mode / Development Mode dipastikan 'OFF' untuk lingkungan produksi (production)?

\- Apakah ada potensi kebocoran informasi sensitif (stack trace, detail query database, jalur file server) pada pesan error yang ditampilkan ke pengguna?

\- Apakah log sistem mencatat data sensitif seperti password atau API Key secara tidak sengaja?



3\. VALIDASI INPUT \& ANTI-INJEKSI

\- Apakah semua input dari pengguna divalidasi dengan ketat menggunakan metode allow-list (tipe data, panjang maksimum, format regex)?

\- Apakah interaksi dengan database sudah menggunakan Prepared Statements / Parameterized Queries (atau ORM yang aman) untuk mencegah SQL Injection?

\- Apakah semua input disanitasi dan di-encode dengan benar sebelum ditampilkan ke browser untuk mencegah Cross-Site Scripting (XSS)?



4\. OTENTIKASI \& OTORISASI SISI SERVER

\- Apakah proses otentikasi (verifikasi token/session) sepenuhnya dikelola di sisi server (Server-Side Auth) dan bukan hanya di frontend?

\- Apakah sistem melakukan pengecekan akses (Authorization/Permission) pada setiap endpoint untuk mencegah IDOR (Insecure Direct Object Reference)?

\- Apakah hak akses Role Admin sudah diamankan secara berlapis dan tidak bisa dimanipulasi melalui modifikasi parameter oleh pengguna biasa?



5\. KEAMANAN BASIS DATA \& MANAJEMEN SESI

\- Apakah database diisolasi dari akses publik (menggunakan jaringan privat/VPC, VPN, atau SSH Tunnel)?

\- Apakah akun database yang digunakan aplikasi menerapkan prinsip Least Privilege (hak akses paling minimal, misal dilarang menggunakan user 'root'/'sa')?

\- Apakah password pengguna di-hash menggunakan algoritma modern yang kuat (seperti Argon2 atau bcrypt) dan bukan MD5/SHA-1?

\- Apakah session cookie dikonfigurasi dengan flag keamanan penuh: HttpOnly, Secure, dan SameSite (Strict/Lax)?

\- Apakah alur reset password aman (menggunakan token kedaluwarsa singkat, langsung hangus setelah digunakan, dan dikirim lewat saluran aman)?



6\. KEAMANAN UNGGAH BERKAS (FILE UPLOAD)

\- Apakah ada batasan ketat pada ukuran maksimal file dan ekstensi file yang diizinkan (allow-list)?

\- Apakah sistem memvalidasi konten asli file (magic bytes/file signature) dan tidak hanya percaya pada ekstensi atau MIME-type dari client?

\- Bagaimana rekomendasi integrasi pemindaian malware (seperti ClamAV) untuk memeriksa berkas yang diunggah?



7\. STANDAR KEAMANAN PROFESIONAL (TAMBAHAN KELAS ENTERPRISE)

\- Kepatuhan OWASP Top 10: Apakah sistem ini rentan terhadap celah keamanan paling kritis dalam daftar OWASP Top 10 terbaru?

\- Enkripsi Data Berdiam (Data-at-Rest) \& Berpindah (Data-in-Transit): Apakah seluruh komunikasi menggunakan TLS 1.3/HTTPS yang aman dengan cipher suite modern? Apakah data sensitif di database (seperti NIK atau nomor kartu kredit) dienkripsi di tingkat kolom?

\- Rate Limiting \& Proteksi Brute Force: Apakah ada batasan jumlah request (rate limiting) pada API sensitif (login, reset password, register) untuk mencegah serangan Brute Force dan DDoS?

\- CSRF Protection: Apakah ada mekanisme anti-CSRF token untuk request yang mengubah status data (POST, PUT, DELETE), terutama jika menggunakan autentikasi berbasis cookie?

\- Audit Trail / Centralized Logging: Apakah setiap aktivitas sensitif (perubahan hak akses, login admin, ekspor data) dicatat dalam log audit yang tidak dapat dimanipulasi (immutable)?

\- Security Headers: Apakah server merespon dengan header keamanan esensial seperti Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Content-Type-Options, dan X-Frame-Options?

\- Dependency Vulnerability: Bagaimana strategi untuk memindai kerentanan pada pustaka pihak ketiga (third-party dependencies) yang digunakan (misalnya menggunakan Snyk, npm audit, atau Dependabot)?



\---

Berikut adalah \[KODE PROGRAM / ARSITEKTUR SISTEM / KONFIGURASI] yang ingin saya periksakan kepada Anda:



\[TEMPELKAN KODE, STRUKTUR JSON, ATAU DESKRIPSI TEKNIS SISTEM ANDA DI SINI]



