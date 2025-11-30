#!/usr/bin/env node
/**
 * Bootstrap Admin Account
 * 
 * Creates an admin user in the Better Auth ba_user table
 * Run this script after starting the backend locally
 * 
 * Usage:
 *   node scripts/bootstrap-admin.mjs --email admin@example.com --password your-password --name "Your Name"
 * 
 * Or with environment variables:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password ADMIN_NAME="Your Name" node scripts/bootstrap-admin.mjs
 */

const args = process.argv.slice(2);
const options = {};

// Parse command line args
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
    options[key] = value;
    if (value) i++;
  }
}

// Get values from args or env
const email = options.email || process.env.ADMIN_EMAIL;
const password = options.password || process.env.ADMIN_PASSWORD;
const name = options.name || process.env.ADMIN_NAME || 'Admin';
const backendUrl = options.url || process.env.BACKEND_URL || 'http://localhost:8787';

if (!email || !password) {
  console.error(`
❌ Missing required parameters

Usage:
  node scripts/bootstrap-admin.mjs --email <email> --password <password> [--name "Name"]

Or with environment variables:
  ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx ADMIN_NAME="Name" node scripts/bootstrap-admin.mjs

Options:
  --email     Admin email address
  --password  Admin password (min 8 characters)
  --name      Admin display name (optional, default: "Admin")
  --url       Backend URL (optional, default: http://localhost:8787)
`);
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Password must be at least 8 characters');
  process.exit(1);
}

console.log(`
🚀 Bootstrap Admin Account
============================
Email:    ${email}
Name:     ${name}
Backend:  ${backendUrl}
`);

async function createAdmin() {
  try {
    // Step 1: Sign up the user via Better Auth
    console.log('📝 Creating account via Better Auth...');
    
    const signUpResponse = await fetch(`${backendUrl}/v1/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    const signUpResult = await signUpResponse.json();

    if (!signUpResponse.ok) {
      // Check if user already exists
      if (signUpResult.message?.includes('already exists') || signUpResult.code === 'USER_ALREADY_EXISTS') {
        console.log('ℹ️  User already exists, will update to admin role');
      } else {
        throw new Error(signUpResult.message || signUpResult.error || 'Sign up failed');
      }
    } else {
      console.log('✅ Account created successfully');
    }

    // Step 2: Update user role to admin in ba_user table
    // This requires direct database access - we'll use a backend endpoint for this
    console.log('👑 Promoting user to admin role...');
    
    // Try the admin promotion endpoint (if it exists)
    const promoteResponse = await fetch(`${backendUrl}/v1/auth/promote-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (promoteResponse.ok) {
      console.log('✅ User promoted to admin');
    } else {
      // If endpoint doesn't exist, provide manual instructions
      console.log(`
⚠️  Could not auto-promote user. Please run this SQL manually:

   UPDATE ba_user SET role = 'admin', tier = 'pro' WHERE email = '${email}';

   You can run this via:
   - wrangler d1 execute hanzimaster-db --command "UPDATE ba_user SET role = 'admin', tier = 'pro' WHERE email = '${email}';"
      `);
    }

    console.log(`
✨ Bootstrap complete!

Next steps:
1. Start the portal: cd hanzimaster-portal-v2 && pnpm dev
2. Go to http://localhost:5173/login
3. Sign in with: ${email}

`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();



