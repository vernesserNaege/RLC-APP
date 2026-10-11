// Turns an admin password into the hash stored in .env.
// Usage: node scripts/hash-password.js "YourPassword"
import { hashPassword } from "../src/auth.js";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Usage: node scripts/hash-password.js "YourPassword"  (at least 8 characters)');
  process.exit(1);
}

console.log(await hashPassword(password));