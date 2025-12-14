const bcrypt = require("bcryptjs")

async function hashPasswords() {
  const passwords = [
    { password: "waik1+demo-staff!@#", description: "Staff password (Sarah Johnson)" },
    { password: "waik1+demo-admin!@#", description: "Admin password (Michael Chen)" },
    { password: "demo-password", description: "Other staff password (James & Emily)" },
  ]

  console.log("Generating bcrypt hashes...\n")

  for (const { password, description } of passwords) {
    const hash = await bcrypt.hash(password, 10)
    console.log(`${description}:`)
    console.log(`Password: ${password}`)
    console.log(`Hash: ${hash}`)
    console.log("")
  }
}

hashPasswords().catch(console.error)
