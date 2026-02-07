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

    if (!registerResponse.success) {
      throw new Error(registerResponse.error || 'Registration failed on backend');
    }

    console.log('Parent account created:', registerResponse.parent_id);
    const parentId = registerResponse.parent_id;

    // Step 2: Automatically login to get token
    const loginResponse = await apiCall('POST', '/api/auth/login', {
      email: parentEmail,
      password: parentPassword,
      device_name: 'Chrome Extension'
    });

    if (!loginResponse.success) {
      throw new Error(loginResponse.error || 'Login failed after registration');
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
      name: childName
    });

    if (!childResponse.success) {
      throw new Error(childResponse.error || 'Failed to create child profile');
    }

    const childId = childResponse.child_id;

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
        expiresAt: Date.parse(loginResponse.expires_at)
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
