const crypto = require("crypto")
global.crypto = crypto.webcrypto

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys")
const P = require("pino")

const OWNER = "2349154472946"

async function startBot() {

const { state, saveCreds } = await useMultiFileAuthState("./session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
logger: P({ level: "silent" }),
auth: state,
browser: ["Deep Exam Bot","Chrome","1.0"]
})

if (!sock.authState.creds.registered) {

const number = "2349154472946"

const code = await sock.requestPairingCode(number)

console.log("")
console.log("================================")
console.log("DEEP_EXAM KNOWLEDGE BOT")
console.log("PAIRING CODE:", code)
console.log("Enter this code in WhatsApp")
console.log("================================")

}

sock.ev.on("creds.update", saveCreds)

sock.ev.on("messages.upsert", async ({ messages }) => {

const m = messages[0]

if (!m.message) return

const from = m.key.remoteJid
const isGroup = from.endsWith("@g.us")

let body = ""

if (m.message.conversation) body = m.message.conversation
else if (m.message.extendedTextMessage) body = m.message.extendedTextMessage.text

if (!body.startsWith(".")) return

const cmd = body.slice(1).trim().split(" ")[0].toLowerCase()

// ping

if (cmd === "ping") {

await sock.sendMessage(from,{
text:"🏓 Pong! Bot is active."
})

}

// menu

if (cmd === "menu") {

await sock.sendMessage(from,{
text:`
👑 DEEP_EXAM KNOWLEDGE BOT 👑

🔹menu🔹
🔹ping🔹
🔹jamb🔹
🔹waec🔹
🔹sudo🔹
🔹tag🔹

Owner: +${OWNER}

`
})

}

})

}

startBot()
