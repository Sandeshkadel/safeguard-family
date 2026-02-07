// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - LOGIN WITH DATABASE BACKEND              ║
// ║  Authenticates against the backend server database            ║
// ╚═══════════════════════════════════════════════════════════════╝

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

document.addEventListener('DOMContentLoaded', async () => {
  // Check if already logged in
  const token = await getStorageValue('authToken');
  if (token) {
    // Verify token is still valid
    try {
      await apiCall('POST', '/api/auth/verify', {});
      window.location.href = 'dashboard.html';
      return;
    } catch (e) {
      // Token is invalid, let user log in
    }
  }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');
  const loginButton = document.getElementById('loginButton');

  errorMessage.style.display = 'none';
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';

  try {
    // Call backend API to login
    console.log('Attempting login with email:', email);
    const response = await apiCall('POST', '/api/auth/login', {
      email: email,
      password: password,
      device_name: 'Chrome Extension'
    });

    if (response.success) {
      console.log('Login successful');
      
      // Store authentication token
      await setStorageValue('authToken', response.token);

      // Store backend URL for background worker
      await setStorageValue('backendUrl', API_CONFIG.baseURL + '/api');
      
      // Store parent info
      await setStorageValue('parentId', response.parent_id);
      await setStorageValue('parentEmail', response.email);
      await setStorageValue('parentName', response.full_name);
      
      // Resolve child profile from backend
      try {
        const childrenResponse = await apiCall('GET', '/api/children');
        if (childrenResponse.success && childrenResponse.children && childrenResponse.children.length) {
          const child = childrenResponse.children[0];
          await setStorageValue('childId', child.id);
          await setStorageValue('childName', child.name);
        } else {
          const existingChildName = await getStorageValue('childName');
          if (existingChildName) {
            const createChildResponse = await apiCall('POST', '/api/children', { name: existingChildName });
            if (createChildResponse.success) {
              await setStorageValue('childId', createChildResponse.child_id);
              await setStorageValue('childName', createChildResponse.name);
            }
          }
        }
      } catch (e) {
        console.warn('Child profile sync failed:', e);
      }

      // Store session info
      await setStorageValue('dashboardSession', {
        active: true,
        createdAt: Date.now(),
        expiresAt: Date.parse(response.expires_at)
      });

      // Redirect to dashboard
      console.log('Redirecting to dashboard...');
      window.location.href = 'dashboard.html';
    } else {
      throw new Error(response.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    let errorMsg = error.message || 'Login failed. Please check your credentials.';
    
    // Provide helpful error messages
    if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
      errorMsg = 'Cannot connect to backend server. Make sure the backend is running at ' + API_CONFIG.baseURL;
    } else if (errorMsg.includes('Invalid email or password')) {
      errorMsg = 'Incorrect email or password.';
    }
    
    errorMessage.textContent = '❌ ' + errorMsg;
    errorMessage.style.display = 'block';
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
  }
});

// Add a link to show backend status
document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.createElement('div');
  statusDiv.id = 'backendStatus';
  statusDiv.style.cssText = 'text-align: center; font-size: 12px; color: #718096; margin-top: 10px;';
  
  // Check backend status
  fetch(API_CONFIG.baseURL + '/health', { timeout: 3000 })
    .then(res => res.ok ? 'Connected' : 'Error')
    .catch(() => 'Disconnected')
    .then(status => {
      const color = status === 'Connected' ? '#48bb78' : '#e53e3e';
      statusDiv.innerHTML = `<small style="color: ${color}">Backend: ${status}</small>`;
    });
  
  const card = document.querySelector('.card');
  if (card) {
    card.parentElement.insertBefore(statusDiv, card.nextElementSibling);
  }
});
