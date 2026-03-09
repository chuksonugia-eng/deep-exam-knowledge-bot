const crypto = require("crypto")
global.crypto = crypto.webcrypto

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys")
const P = require("pino")

const OWNER = "2349154472946"

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("./session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
logger: P({ level: "silent" }),
auth: state
})

sock.ev.on("connection.update", async (update) => {

const { connection } = update

if(connection === "open"){
console.log("✅ BOT CONNECTED SUCCESSFULLY")
}

if(connection === "close"){
console.log("❌ Connection closed. Restarting...")
startBot()
}

})

if(!sock.authState.creds.registered){

setTimeout(async () => {

const code = await sock.requestPairingCode(OWNER)

console.log("")
console.log("👑 DEEP_EXAM KNOWLEDGE BOT")
console.log("PAIRING CODE:", code)
console.log("Enter it in WhatsApp linked devices")

},5000)

}

sock.ev.on("creds.update", saveCreds)

sock.ev.on("messages.upsert", async ({ messages }) => {

const m = messages[0]

if(!m.message) return

const from = m.key.remoteJid

let body = ""

if(m.message.conversation) body = m.message.conversation
else if(m.message.extendedTextMessage) body = m.message.extendedTextMessage.text

if(!body.startsWith(".")) return

const cmd = body.slice(1).trim().split(" ")[0].toLowerCase()

// ping

if(cmd === "ping"){

await sock.sendMessage(from,{ text:"🏓 Pong! Bot Active." })

}

// menu

if(cmd === "menu"){

await sock.sendMessage(from,{
text:`👑 DEEP_EXAM KNOWLEDGE BOT 👑

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
