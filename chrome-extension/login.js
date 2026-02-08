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
      await apiCall('GET', '/api/profile');
      window.location.href = 'dashboard.html';
      return;
    } catch (e) {
      // Token is invalid, let user log in
      await removeStorageValue('authToken');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PASSWORD TOGGLE FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════
  const passwordInput = document.getElementById('password');
  const toggleButton = document.getElementById('togglePassword');
  
  if (toggleButton && passwordInput) {
    toggleButton.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Toggle between password and text input type
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      
      // Update button emoji
      toggleButton.textContent = isPassword ? '🙈' : '👁️';
      toggleButton.title = isPassword ? 'Hide password' : 'Show password';
      
      // Focus back on input
      passwordInput.focus();
    });
    
    // Also toggle when user presses space/enter on the toggle button
    toggleButton.addEventListener('keypress', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleButton.click();
      }
    });
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
      password: password
    });

    if (response.status === 'success') {
      console.log('Login successful');
      
      // Store authentication token
      await setStorageValue('authToken', response.token);
      await setStorageValue('parentToken', response.token);

      // Store backend URL for background worker
      await setStorageValue('backendUrl', API_CONFIG.baseURL + '/api');
      
      // Store parent info
      await setStorageValue('parentId', response.parent.id);
      await setStorageValue('parentEmail', response.parent.email);
      await setStorageValue('parentName', response.parent.full_name);
      
      // Resolve child profile from backend (non-blocking)
      // This runs in the background, login succeeds even if it fails
      Promise.resolve().then(async () => {
        try {
          const childrenResponse = await apiCall('GET', '/api/children');
          if (childrenResponse.status === 'success' && childrenResponse.children && childrenResponse.children.length) {
            const child = childrenResponse.children[0];
            await setStorageValue('childId', child.id);
            await setStorageValue('childName', child.name);
            console.log('Child profile synced:', child.name);
          } else {
            // Create default child if none exists
            const existingChildName = await getStorageValue('childName') || 'My Child';
            const createChildResponse = await apiCall('POST', '/api/children', {
              name: existingChildName,
              device_id: generateDeviceId(),
              device_name: 'Chrome Extension'
            });
            if (createChildResponse.status === 'success') {
              await setStorageValue('childId', createChildResponse.child.id);
              await setStorageValue('childName', createChildResponse.child.name);
              console.log('Child profile created:', createChildResponse.child.name);
            }
          }
        } catch (e) {
          console.warn('Child profile sync failed (non-critical):', e);
          // Set defaults so dashboard doesn't break
          const existingChildId = await getStorageValue('childId');
          const existingChildName = await getStorageValue('childName');
          if (!existingChildId) await setStorageValue('childId', 'default-child-id');
          if (!existingChildName) await setStorageValue('childName', 'My Child');
        }
      });

      // Store session info
      await setStorageValue('dashboardSession', {
        active: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + (response.expires_in * 1000)
      });

      // Redirect to dashboard
      console.log('Redirecting to dashboard...');
      window.location.href = 'dashboard.html';
    } else {
      throw new Error(response.message || 'Login failed');
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

function generateDeviceId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `device_${timestamp}_${random}`;
}

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
