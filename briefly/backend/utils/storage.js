import fs from "fs";

const USERS_FILE = "users.json";

export function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")); } 
  catch { return []; }
}

export function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function findUserByEmail(email) {
  const users = loadUsers();
  return users.find(u => u.email === email);
}

export function upsertUser(user) {
  const users = loadUsers();
  const idx = users.findIndex(u => u.email === user.email);
  if (idx === -1) users.push(user);
  else users[idx] = user;
  saveUsers(users);
}
