

async function test() {
  const email = `njirika_test_${Date.now()}@gmail.com`;
  const password = 'Password@123';
  
  console.log('1. Registering account...', email);
  try {
    const regRes = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email, password, role: 'family' })
  });
  
  const regBody = await regRes.text();
  console.log('Register status:', regRes.status);
  console.log('Register body:', regBody);
  
  if (!regRes.ok) return;

  console.log('2. Logging in...');
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
    const loginBody = await loginRes.text();
    console.log('Login status:', loginRes.status);
    console.log('Login body:', loginBody);
  } catch (err) {
    console.error('Test script error:', err);
  }
}

test().catch(console.error);
