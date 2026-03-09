const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys")
const P = require("pino")

const OWNER = "2349154472946"

async function startBot() {

const { state, saveCreds } = await useMultiFileAuthState("./auth")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
logger: P({ level: "silent" }),
auth: state,
printQRInTerminal: false
})

sock.ev.on("creds.update", saveCreds)

if (!sock.authState.creds.registered) {

const phoneNumber = OWNER

console.log("=================================")
console.log("DEEP_EXAM KNOWLEDGE BOT")
console.log("Generating Pairing Code...")
console.log("=================================")

const code = await sock.requestPairingCode(phoneNumber)

console.log("")
console.log("PAIRING CODE:", code)
console.log("")
console.log("Go to WhatsApp > Linked Devices")
console.log("Tap 'Link with phone number'")
console.log("Enter the pairing code above")
console.log("")

}

sock.ev.on("messages.upsert", async ({ messages }) => {

const msg = messages[0]
if (!msg.message) return

const from = msg.key.remoteJid
const text = msg.message.conversation || ""

if (text === ".ping") {
await sock.sendMessage(from,{ text:"🏓 PONG!\nDEEP_EXAM KNOWLEDGE BOT ONLINE"})
}

if (text === ".menu") {
await sock.sendMessage(from,{
text:`👑 DEEP_EXAM KNOWLEDGE BOT 👑

🔹menu🔹
🔹jamb🔹
🔹waec🔹
🔹ssce🔹
🔹search🔹
🔹ans🔹
🔹tag🔹
🔹public🔹
🔹private🔹
🔹sudo🔹
🔹ping🔹`
})
}

if (text.startsWith(".jamb")) {

await sock.sendMessage(from,{
poll:{
name:"📚 JAMB Practice Question",
values:["A","B","C","D"],
selectableCount:1
}
})

}

})

}

startBot()
