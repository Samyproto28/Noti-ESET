const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:4000/api/auth';
const testEmail = 'testuser@example.com';
const testPassword = 'TestPassword123';

async function testRegister() {
  console.log('Probando registro...');
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const data = await res.json();
  console.log('Respuesta registro:', data);
}

async function testLogin() {
  console.log('Probando login...');
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const data = await res.json();
  console.log('Respuesta login:', data);
}

(async () => {
  await testRegister();
  await testLogin();
})(); 