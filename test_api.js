async function run() {
  try {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testuser@example.com', password: 'password123' })
    });
    const data = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", data);
  } catch (err) {
    console.error(err);
  }
}
run();
