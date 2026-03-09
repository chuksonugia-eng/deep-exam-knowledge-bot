const crypto = require("crypto")
global.crypto = crypto.webcrypto

const readline = require("readline")

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys")
const P = require("pino")

const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
})

async function startBot() {

const { state, saveCreds } = await useMultiFileAuthState("./session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
logger: P({ level: "silent" }),
auth: state
})

sock.ev.on("creds.update", saveCreds)

if (!sock.authState.creds.registered) {

rl.question("Enter your WhatsApp number (234XXXXXXXXXX): ", async (number) => {

const code = await sock.requestPairingCode(number)

console.log("")
console.log("=================================")
console.log("DEEP_EXAM KNOWLEDGE BOT")
console.log("PAIRING CODE:", code)
console.log("Open WhatsApp and enter this code")
console.log("=================================")

})

}

sock.ev.on("messages.upsert", async ({ messages }) => {

const m = messages[0]
if (!m.message) return

const from = m.key.remoteJid

let body = ""

if (m.message.conversation) body = m.message.conversation
else if (m.message.extendedTextMessage) body = m.message.extendedTextMessage.text

if (!body.startsWith(".")) return

const cmd = body.slice(1).toLowerCase()

if (cmd === "ping") {

await sock.sendMessage(from,{ text:"🏓 Pong! Bot is active." })

}

if (cmd === "menu") {

await sock.sendMessage(from,{
text:`👑 DEEP_EXAM KNOWLEDGE BOT 👑

🔹menu🔹
🔹ping🔹
🔹jamb🔹
🔹waec🔹
🔹sudo🔹
🔹tag🔹

`
})

}

})

}

startBot()
