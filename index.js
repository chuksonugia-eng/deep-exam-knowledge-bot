const crypto = require("crypto")
global.crypto = crypto.webcrypto

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys")
const P = require("pino")

const OWNER = "2349154472946" // Your phone number

async function startBot(){

  const { state, saveCreds } = await useMultiFileAuthState("./session")

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    shouldSyncHistoryMessage: false,
  })

  let isHandlingPairing = false

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update

    if(qr){
      console.log("📱 Scan QR Code above with your WhatsApp")
    }

    if(connection === "open"){
      console.log("✅ BOT CONNECTED SUCCESSFULLY")
    }

    if(connection === "close"){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      
      if(shouldReconnect){
        console.log("🔄 Reconnecting...")
        setTimeout(() => startBot(), 3000)
      } else {
        console.log("❌ Bot logged out - Delete session folder and restart")
        process.exit(0)
      }
    }
  })

  // Handle pairing code request
  sock.ev.on("call", async (node) => {
    if(node[0].tag === "offer" && node[0].attrs?.from){
      const incomingNumber = node[0].attrs.from.split("@")[0]
      console.log("📞 Incoming call from:", incomingNumber)
    }
  })

  // Request pairing code if not authenticated yet
  if(!sock.authState.creds.registered){
    setTimeout(async () => {
      if(!isHandlingPairing){
        isHandlingPairing = true
        try {
          // Request pairing code
          const code = await sock.requestPairingCode(OWNER)
          
          console.log("\n")
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
          console.log("👑 DEEP_EXAM KNOWLEDGE BOT 👑")
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
          console.log("📱 PAIRING CODE:")
          console.log(code)
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
          console.log("✅ Enter this code in WhatsApp")
          console.log("   Settings > Linked Devices > Link a Device")
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

        } catch (error) {
          console.error("❌ Error requesting pairing code:", error.message)
          isHandlingPairing = false
        }
      }
    }, 3000)
  }

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]

    if(!m.message) return

    const from = m.key.remoteJid
    const isGroup = from.includes("@g.us")

    let body = ""

    if(m.message.conversation) {
      body = m.message.conversation
    } else if(m.message.extendedTextMessage) {
      body = m.message.extendedTextMessage.text
    }

    if(!body || !body.startsWith(".")) return

    const cmd = body.slice(1).trim().split(" ")[0].toLowerCase()

    try {
      // ping command
      if(cmd === "ping"){
        await sock.sendMessage(from, { text: "🏓 Pong! Bot is online and active." })
      }

      // menu command
      if(cmd === "menu"){
        await sock.sendMessage(from, {
          text: `👑 *DEEP_EXAM KNOWLEDGE BOT* 👑

*Available Commands:*

🔹 .ping - Check if bot is active
🔹 .menu - Show this menu
🔹 .jamb - Get JAMB exam tips
🔹 .waec - Get WAEC exam tips
🔹 .sudo - Admin commands
🔹 .tag - Mention users

━━━━━━━━━━━━━━━━━━
👨‍💼 Owner: +${OWNER}
━━━━━━━━━━━━━━━━━━`
        })
      }

      // Add more commands here as needed
      if(cmd === "jamb"){
        await sock.sendMessage(from, { text: "📚 JAMB Exam Tips coming soon..." })
      }

      if(cmd === "waec"){
        await sock.sendMessage(from, { text: "📚 WAEC Exam Tips coming soon..." })
      }

    } catch (error) {
      console.error("Error handling message:", error)
    }
  })
}

startBot().catch(err => {
  console.error("Failed to start bot:", err)
  process.exit(1)
})
