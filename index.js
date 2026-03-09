const crypto = require("crypto")
global.crypto = crypto.webcrypto

const readline = require("readline")
const axios = require("axios")

const { 
default: makeWASocket, 
useMultiFileAuthState, 
fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys")

const P = require("pino")

const OWNER = "2349154472946"

const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
})

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("./session")

const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
version,
logger: P({ level: "silent" }),
auth: state,
browser: ["DEEP_EXAM_KNOWLEDGE_BOT","Chrome","1.0"],
syncFullHistory: false
})

sock.ev.on("creds.update", saveCreds)

if(!sock.authState.creds.registered){

rl.question("Enter WhatsApp number (2349154472946): ", async(number)=>{

const code = await sock.requestPairingCode(number)

console.log("")
console.log("=================================")
console.log("👑 DEEP EXAM KNOWLEDGE BOT")
console.log("PAIRING CODE:", code)
console.log("=================================")

})

}

sock.ev.on("messages.upsert", async ({ messages })=>{

try{

const m = messages[0]
if(!m.message) return

const from = m.key.remoteJid
const isGroup = from.endsWith("@g.us")

let body = ""

if(m.message.conversation) body = m.message.conversation
else if(m.message.extendedTextMessage) body = m.message.extendedTextMessage.text

if(!body.startsWith(".")) return

const args = body.split(" ")
const cmd = args[0].slice(1).toLowerCase()

/* ===== PING ===== */

if(cmd === "ping"){

await sock.sendMessage(from,{
text:"⚡ BOT ONLINE ⚡"
})

}

/* ===== MENU ===== */

if(cmd === "menu"){

await sock.sendMessage(from,{
text:`👑 DEEP EXAM KNOWLEDGE BOT 👑

🔹menu🔹
🔹ping🔹
🔹ai🔹
🔹tag🔹
🔹owner🔹
🔹speed🔹
🔹time🔹

🤖 AI CHAT

.ai Hello
.ai Explain physics
`
})

}

/* ===== AI ===== */

if(cmd === "ai"){

let question = args.slice(1).join(" ")

if(!question) return sock.sendMessage(from,{
text:"Example:\n.ai What is physics?"
})

let res = await axios.get(`https://api.popcat.xyz/chatbot?msg=${question}&owner=DeepBot&botname=AI-BOT`)

await sock.sendMessage(from,{
text:`🤖 AI RESPONSE

${res.data.response}`
})

}

/* ===== TAG ALL ===== */

if(cmd === "tag"){

if(!isGroup) return sock.sendMessage(from,{text:"Group only command"})

let group = await sock.groupMetadata(from)

let members = group.participants.map(v => v.id)

await sock.sendMessage(from,{
text:"📢 Attention Everyone!",
mentions: members
})

}

/* ===== SPEED ===== */

if(cmd === "speed"){

let start = new Date().getTime()
let end = new Date().getTime()

await sock.sendMessage(from,{
text:`⚡ BOT SPEED

${end-start} ms`
})

}

/* ===== OWNER ===== */

if(cmd === "owner"){

await sock.sendMessage(from,{
text:`👤 BOT OWNER

Number: +${OWNER}
Bot: DEEP EXAM KNOWLEDGE BOT`
})

}

}catch(err){
console.log(err)
}

})

}

startBot()
