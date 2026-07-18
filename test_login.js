async function testLogin() {
  try {
    const res = await fetch('https://dualconnect-backend.onrender.com/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dualconnect.com', password: 'Admin123!' })
    });
    const data = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', data);
    console.log('Headers:', [...res.headers.entries()]);
  } catch(e) {
    console.error(e);
  }
}

testLogin();
