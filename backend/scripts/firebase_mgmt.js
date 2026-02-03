const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');

/**
 * Gets an access token using Google Application Default Credentials
 */
async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

/**
 * Lists all available Google Cloud projects that can have Firebase added
 */
async function listProjects() {
  try {
    const accessToken = await getAccessToken();
    const uri = 'https://firebase.googleapis.com/v1beta1/availableProjects';
    const options = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
      },
    };

    const rawResponse = await fetch(uri, options);
    const resp = await rawResponse.json();
    
    if (resp.error) {
      console.error('❌ Error listing projects:', resp.error.message);
      return;
    }

    const projects = resp['projectInfo'] || [];
    console.log('✅ Project total: ' + projects.length);
    console.log('');
    
    for (let i in projects) {
      const project = projects[i];
      console.log('Project ' + i);
      console.log('ID: ' + project['project']);
      console.log('Display Name: ' + project['displayName']);
      console.log('');
    }
  } catch(err) {
    console.error('❌ Unexpected error:', err);
  }
}

/**
 * Adds Firebase services to an existing Google Cloud project
 */
async function addFirebase(projectId) {
  try {
    const accessToken = await getAccessToken();
    const uri = `https://firebase.googleapis.com/v1beta1/projects/${projectId}:addFirebase`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
    };

    console.log(`🚀 Adding Firebase to project: ${projectId}...`);
    const rawResponse = await fetch(uri, options);
    const resp = await rawResponse.json();
    
    if (resp.error) {
      console.error('❌ Error adding Firebase:', resp.error.message);
    } else {
      console.log('✅ Success! Operation result:', JSON.stringify(resp, null, 2));
      console.log('\nNext step: Run "node firebase_mgmt.js setup-firestore <id>" to create the database.');
    }
  } catch(err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

/**
 * Creates a default Firestore database in Native mode
 */
async function setupFirestore(projectId) {
  try {
    const accessToken = await getAccessToken();
    // Using Google Cloud Firestore API
    const uri = `https://firestore.googleapis.com/v1/projects/${projectId}/databases?databaseId=(default)`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: 'us-central', // Defaulting to us-central, can be made configurable
        type: 'FIRESTORE_NATIVE'
      })
    };

    console.log(`🚀 Creating Firestore database for project: ${projectId}...`);
    const rawResponse = await fetch(uri, options);
    const resp = await rawResponse.json();
    
    if (resp.error) {
      if (resp.error.message.includes('already exists')) {
        console.log('✅ Firestore database already exists.');
      } else {
        console.error('❌ Error creating Firestore:', resp.error.message);
        if (resp.error.status === 'PERMISSION_DENIED') {
          console.log('💡 Tip: Ensure the Cloud Firestore API is enabled in the Google Cloud Console.');
        }
      }
    } else {
      console.log('✅ Success! Firestore database creation started:', JSON.stringify(resp, null, 2));
    }
  } catch(err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

// Command line argument handling
const command = process.argv[2];
const arg = process.argv[3];

if (command === 'list') {
  listProjects();
} else if (command === 'add' && arg) {
  addFirebase(arg);
} else if (command === 'setup-firestore' && arg) {
  setupFirestore(arg);
} else {
  console.log(`
Usage:
  node firebase_mgmt.js list                    - List available projects
  node firebase_mgmt.js add <id>                - Add Firebase to project <id>
  node firebase_mgmt.js setup-firestore <id>    - Create default Firestore database
  `);
}
