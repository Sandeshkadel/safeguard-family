// ╔═══════════════════════════════════════════════════════════════╗
// ║  SAFEGUARD FAMILY - PARENT SETUP WITH DATABASE BACKEND        ║
// ║  Register Parent Account & Create Child Profile               ║
// ╚═══════════════════════════════════════════════════════════════╝

const STORAGE_KEYS = {
  setupComplete: 'setupComplete',
  parentEmail: 'parentEmail',
  parentId: 'parentId',
  childId: 'childId',
  childName: 'childName',
  authToken: 'authToken',
  blockedDomains: 'blockedDomains',
  allowedDomains: 'allowedDomains',
  blockedLog: 'blockedLog',
  historyLog: 'historyLog',
  settings: 'settings'
};

document.getElementById('setupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const parentEmail = document.getElementById('parentEmail').value.trim();
  const parentPassword = document.getElementById('parentPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const fullName = document.getElementById('fullName').value.trim();
  const childName = document.getElementById('childName').value.trim();
  const consentCheckbox = document.getElementById('consentCheckbox').checked;
  
  const submitButton = document.getElementById('submitButton');
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  
  // Reset messages
  errorMessage.style.display = 'none';
  successMessage.style.display = 'none';
  
  // Validation
  if (!consentCheckbox) {
    showError('You must consent to the monitoring terms');
    return;
  }
  
  if (parentPassword !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  if (parentPassword.length < 6) {
    showError('Password must be at least 6 characters');
    return;
  }

  if (!parentEmail || !fullName || !childName) {
    showError('Please fill in all fields');
    return;
  }
  
  // Disable button during processing
  submitButton.disabled = true;
  submitButton.textContent = 'Creating account...';
  
  try {
    console.log('Starting parent registration...');
    
    // Step 1: Register parent account on backend
    const registerResponse = await apiCall('POST', '/api/auth/register', {
      email: parentEmail,
      password: parentPassword,
      full_name: fullName
    });

    if (registerResponse.status !== 'success') {
      throw new Error(registerResponse.detail || 'Registration failed on backend');
    }

    console.log('Parent account created:', registerResponse.parent.id);
    const parentId = registerResponse.parent.id;

    // Step 2: Automatically login to get token
    const loginResponse = await apiCall('POST', '/api/auth/login', {
      email: parentEmail,
      password: parentPassword
    });

    if (loginResponse.status !== 'success') {
      throw new Error(loginResponse.detail || 'Login failed after registration');
    }

    console.log('Auto-login successful');
    const token = loginResponse.token;

    // Step 3: Store auth token for subsequent API calls
    await chrome.storage.local.set({
      [STORAGE_KEYS.authToken]: token,
      backendUrl: API_CONFIG.baseURL + '/api'
    });

    // Step 4: Create child profile on backend
    const childResponse = await apiCall('POST', '/api/children', {
      name: childName,
      device_id: generateChildId(),
      device_name: 'Chrome Extension'
    });

    if (childResponse.status !== 'success') {
      throw new Error(childResponse.detail || 'Failed to create child profile');
    }

    const childId = childResponse.child.id;

    // Step 5: Store locally for extension use
    await chrome.storage.local.set({
      [STORAGE_KEYS.setupComplete]: true,
      [STORAGE_KEYS.parentEmail]: parentEmail,
      [STORAGE_KEYS.parentId]: parentId,
      [STORAGE_KEYS.childId]: childId,
      [STORAGE_KEYS.childName]: childName,
      setupDate: Date.now(),
      locked: true,
      [STORAGE_KEYS.blockedDomains]: [],
      [STORAGE_KEYS.allowedDomains]: [],
      [STORAGE_KEYS.blockedLog]: [],
      [STORAGE_KEYS.historyLog]: [],
      [STORAGE_KEYS.settings]: {
        blockAdult: true,
        blockGambling: true,
        blockViolence: true,
        blockDrugs: true,
        blockHate: true,
        blockMalware: true,
        logAllVisits: true
      },
      dashboardSession: {
        active: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + (loginResponse.expires_in * 1000)
      }
    });

    console.log('Setup complete! Created parent account and child profile');

    // Success!
    successMessage.style.display = 'block';
    submitButton.textContent = '✓ Setup Complete!';

    // Redirect to login after 2 seconds
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 2000);

  } catch (error) {
    console.error('Setup error:', error);
    let errorMsg = error.message || 'Setup failed';
    
    // Provide helpful error messages
    if (errorMsg.includes('Email already registered')) {
      errorMsg = 'This email is already registered. Please use a different email or login.';
    } else if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
      errorMsg = 'Cannot connect to backend server. Make sure it\'s running at ' + API_CONFIG.baseURL + '. Check the setup guide.';
    }
    
    showError(errorMsg);
    submitButton.disabled = false;
    submitButton.textContent = 'Complete Setup & Activate Protection';
  }
});

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const parentEmail = document.getElementById('loginEmail').value.trim().toLowerCase();
    const parentPassword = document.getElementById('loginPassword').value;
    const childNameInput = document.getElementById('loginChildName').value.trim();

    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    if (!parentEmail || !parentPassword) {
      showError('Please enter your email and password');
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';

    try {
      const loginResponse = await apiCall('POST', '/api/auth/login', {
        email: parentEmail,
        password: parentPassword
      });

      if (loginResponse.status !== 'success') {
        throw new Error(loginResponse.message || 'Login failed');
      }

      const token = loginResponse.token;

      await chrome.storage.local.set({
        [STORAGE_KEYS.authToken]: token,
        parentToken: token,
        backendUrl: API_CONFIG.baseURL + '/api',
        [STORAGE_KEYS.parentEmail]: loginResponse.parent.email,
        [STORAGE_KEYS.parentId]: loginResponse.parent.id
      });

      let childId = null;
      let childName = null;

      try {
        const childrenResponse = await apiCall('GET', '/api/children');
        if (childrenResponse.status === 'success' && childrenResponse.children && childrenResponse.children.length) {
          childId = childrenResponse.children[0].id;
          childName = childrenResponse.children[0].name;
        }
      } catch (error) {
        console.warn('Child fetch failed during login:', error);
      }

      if (!childId) {
        const fallbackChildName = childNameInput || 'Child';
        const childResponse = await apiCall('POST', '/api/children', {
          name: fallbackChildName,
          device_id: generateChildId(),
          device_name: 'Chrome Extension'
        });

        if (childResponse.status === 'success') {
          childId = childResponse.child.id;
          childName = childResponse.child.name;
        }
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.setupComplete]: true,
        [STORAGE_KEYS.childId]: childId,
        [STORAGE_KEYS.childName]: childName,
        [STORAGE_KEYS.blockedDomains]: [],
        [STORAGE_KEYS.allowedDomains]: [],
        [STORAGE_KEYS.blockedLog]: [],
        [STORAGE_KEYS.historyLog]: [],
        [STORAGE_KEYS.settings]: {
          blockAdult: true,
          blockGambling: true,
          blockViolence: true,
          blockDrugs: true,
          blockHate: true,
          blockMalware: true,
          logAllVisits: true
        },
        dashboardSession: {
          active: true,
          createdAt: Date.now(),
          expiresAt: Date.now() + (loginResponse.expires_in * 1000)
        }
      });

      successMessage.textContent = '✅ Login successful! Redirecting to dashboard...';
      successMessage.style.display = 'block';
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);

    } catch (error) {
      let errorMsg = error.message || 'Login failed';
      if (errorMsg.includes('Invalid email or password')) {
        errorMsg = 'Incorrect email or password.';
      }
      showError(errorMsg);
      loginButton.disabled = false;
      loginButton.textContent = 'Login & Open Dashboard';
    }
  });
}

function showError(message) {
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = '❌ ' + message;
  errorMessage.style.display = 'block';
}

function generateChildId() {
  // Generate unique ID: timestamp + random string
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `child_${timestamp}_${random}`;
}

// Password strength indicator
document.getElementById('parentPassword').addEventListener('input', (e) => {
  const password = e.target.value;
  const helpText = e.target.nextElementSibling;
  
  if (password.length === 0) {
    helpText.textContent = 'Required to modify extension settings';
    helpText.style.color = '#718096';
  } else if (password.length < 6) {
    helpText.textContent = 'Password too short (minimum 6 characters)';
    helpText.style.color = '#e53e3e';
  } else if (password.length < 8) {
    helpText.textContent = 'Password strength: Weak (consider longer)';
    helpText.style.color = '#f39c12';
  } else {
    helpText.textContent = 'Password strength: Good ✓';
    helpText.style.color = '#48bb78';
  }
});

// Real-time password match indicator
document.getElementById('confirmPassword').addEventListener('input', (e) => {
  const password = document.getElementById('parentPassword').value;
  const confirm = e.target.value;
  
  if (confirm.length === 0) {
    e.target.style.borderColor = '#e2e8f0';
  } else if (password === confirm) {
    e.target.style.borderColor = '#48bb78';
  } else {
    e.target.style.borderColor = '#e53e3e';
  }
});

console.log('[SafeGuard] Parent setup page loaded - using backend API');
