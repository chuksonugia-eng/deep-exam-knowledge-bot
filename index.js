const crypto = require("crypto")
global.crypto = crypto.webcrypto

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys")
const P = require("pino")

// Put your phone number here as: country code + subscriber number (NO leading +)
// Example Nigeria: 2349154472946
const OWNER = "2349154472946"

async function startBot(){

  const { state, saveCreds } = await useMultiFileAuthState("./session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    printQRInTerminal: false, // we are using pairing-code flow, not QR
    shouldSyncHistoryMessage: false,
  })

  // Useful state for retries
  let pairingInProgress = false
  let pairingAttempts = 0
  const maxPairingAttempts = 3

  // Connection updates — log everything to help debugging
  sock.ev.on("connection.update", async (update) => {
    console.log("connection.update:", JSON.stringify(update, null, 2))

    const { connection, lastDisconnect } = update

    if (connection === "open") {
      console.log("✅ BOT CONNECTED SUCCESSFULLY")
      pairingInProgress = false
    }

    if (connection === "close") {
      console.log("❌ Connection closed.")
      if (lastDisconnect) {
        console.error("Last disconnect error:", lastDisconnect?.error ?? lastDisconnect)
      }

      // If logged out, we won't keep reconnecting
      const loggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut
      if (!loggedOut) {
        console.log("🔄 Reconnecting in 3s...")
        setTimeout(startBot, 3000)
      } else {
        console.log("⚠️ Logged out. Remove session folder and re-run the bot to re-authenticate.")
        process.exit(0)
      }
    }
  })

  // Save credentials when they update
  sock.ev.on("creds.update", saveCreds)

  // Function to request pairing code and print exact instructions
  async function requestPairingCodeFlow(){
    if (pairingInProgress) return
    if (pairingAttempts >= maxPairingAttempts) {
      console.error(`❌ Reached ${maxPairingAttempts} pairing attempts. Stop trying.`);
      return
    }

    pairingInProgress = true
    pairingAttempts++

    try {
      console.log(`\n🔐 Requesting pairing code (attempt ${pairingAttempts}/${maxPairingAttempts})...`)

      // IMPORTANT: OWNER must be digits only, country code first, NO leading plus sign.
      // Example: Nigeria +2349154472946 -> '2349154472946'
      if (!/^\d+$/.test(OWNER)) {
        throw new Error("OWNER must contain digits only (no + or spaces). Current OWNER: " + OWNER)
      }

      const pairingCode = await sock.requestPairingCode(OWNER)

      // pairingCode should be a string (usually 6 digits). Print clear instructions.
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("👑 DEEP_EXAM KNOWLEDGE BOT — PAIRING")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("Phone number to enter on your phone (exact):", OWNER)
      console.log("\nOn your phone's WhatsApp app:")
      console.log("1) Open WhatsApp -> Settings -> Linked Devices")
      console.log("2) Tap 'Link a Device' -> choose 'Link with phone number' (or similar)")
      console.log("3) When prompted, enter the phone number exactly as shown above (no +, no spaces).")
      console.log("4) Enter the code shown below when prompted:")
      console.log("\nPAIRING CODE:", pairingCode)
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      console.log("⚠️ The code expires quickly. Enter it immediately on the phone and ensure the phone is online.")
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

      // After requesting code, wait for connection update to go open.
      // We'll keep pairingInProgress true until connection opens or timeout.
      const waitTimeoutMs = 60_000 // 60s
      const start = Date.now()
      while (Date.now() - start < waitTimeoutMs) {
        // If connected, break
        if (sock.user && sock.user.id) {
          console.log("Connected while waiting for pairing to finish.")
          pairingInProgress = false
          return
        }
        // Sleep small interval
        await new Promise(r => setTimeout(r, 1000))
      }

      console.warn("⏳ Pairing timeout reached — if you didn't enter the code on the phone, it may have expired.")
      pairingInProgress = false

    } catch (err) {
      console.error("❌ requestPairingCode error:", err?.message ?? err)
      pairingInProgress = false
    }
  }

  // If not registered, start pairing flow after socket ready
  // Wait briefly for socket to be ready to accept pairing code request
  setTimeout(() => {
    try {
      // If already registered, nothing to do
      if (sock.authState?.creds?.registered) {
        console.log("Already registered. No pairing required.")
        return
      }
      requestPairingCodeFlow()
    } catch (err) {
      console.error("Error starting pairing flow:", err)
    }
  }, 1500)

  // Messages handler
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m || !m.message) return

    const from = m.key.remoteJid
    let body = ""
    if (m.message.conversation) body = m.message.conversation
    else if (m.message.extendedTextMessage) body = m.message.extendedTextMessage.text
    if (!body || !body.startsWith(".")) return

    const cmd = body.slice(1).trim().split(" ")[0].toLowerCase()
    try {
      if (cmd === "ping") {
        await sock.sendMessage(from, { text: "🏓 Pong! Bot Active." })
      } else if (cmd === "menu") {
        await sock.sendMessage(from, { text:
`👑 DEEP_EXAM KNOWLEDGE BOT 👑

Commands:
.ping
.menu
.jamb
.waec
.sudo
.tag

Owner: +${OWNER}`})
      }
    } catch (err) {
      console.error("Error responding to message:", err)
    }
  })
}

startBot().catch(err => {
  console.error("Failed to start bot:", err)
  process.exit(1)
})
