const crypto = require("crypto")
global.crypto = crypto.webcrypto

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys")
const P = require("pino")

// Remove the + and any formatting - just use the number digits
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
    const { connection, lastDisconnect } = update

    if(connection === "open"){
      console.log("✅ BOT CONNECTED SUCCESSFULLY")
    }

    if(connection === "close"){
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log("❌ Connection closed. Reconnecting...", shouldReconnect)
      if(shouldReconnect){
        startBot()
      } else {
        console.log("❌ Bot logged out")
      }
    }
  })

  // Request pairing code if not registered
  if(!sock.authState.creds.registered){
    setTimeout(async () => {
      try {
        // Ensure OWNER is just digits (no + or formatting)
        const code = await sock.requestPairingCode(OWNER)
        
        console.log("")
        console.log("👑 DEEP_EXAM KNOWLEDGE BOT")
        console.log("PAIRING CODE:", code)
        console.log("Enter it in WhatsApp linked devices")
      } catch (error) {
        console.error("❌ Error requesting pairing code:", error)
      }
    }, 5000)
  }

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]

    if(!m.message) return

    const from = m.key.remoteJid

    let body = ""

    if(m.message.conversation) {
      body = m.message.conversation
    } else if(m.message.extendedTextMessage) {
      body = m.message.extendedTextMessage.text
    }

    if(!body || !body.startsWith(".")) return

    const cmd = body.slice(1).trim().split(" ")[0].toLowerCase()

    // ping command
    if(cmd === "ping"){
      await sock.sendMessage(from, { text: "🏓 Pong! Bot Active." })
    }

    // menu command
    if(cmd === "menu"){
      await sock.sendMessage(from, {
        text: `👑 DEEP_EXAM KNOWLEDGE BOT 👑

🔹 menu 🔹
🔹 ping 🔹
🔹 jamb 🔹
🔹 waec 🔹
🔹 sudo 🔹
🔹 tag 🔹

Owner: +${OWNER}`
      })
    }
  })
}

startBot()
