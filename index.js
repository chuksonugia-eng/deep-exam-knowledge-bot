const crypto = require("crypto");
global.crypto = crypto.webcrypto;

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");
const P = require("pino");
const readline = require("readline");

async function promptForPhoneNumber() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => {
        rl.question("Enter your WhatsApp phone number (country code, no '+', e.g. 2349154472946): ", answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function startBot(phoneNumber) {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log("✅ BOT CONNECTED SUCCESSFULLY!");
        }
        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Reconnecting...");
                setTimeout(() => startBot(phoneNumber), 2000);
            } else {
                console.log("❌ Logged out. Delete the /session folder and restart bot to repair.");
                process.exit(1);
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // Pairing code logic
    if (!sock.authState.creds.registered) {
        try {
            if (!/^[0-9]+$/.test(phoneNumber)) {
                console.error("❌ Phone number should only have digits (e.g. 2349154472946)");
                process.exit(1);
            }
            const code = await sock.requestPairingCode(phoneNumber);
            console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("👑 DEEP_EXAM KNOWLEDGE BOT — PAIRING");
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(`Phone to enter: ${phoneNumber}`);
            console.log("On your WhatsApp go to:");
            console.log("  Settings > Linked Devices > Link a Device");
            console.log("  Tap 'Link with phone number' and use your phone number as above.");
            console.log("  Enter the code below:");
            console.log("\nPAIRING CODE:", code);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        } catch (err) {
            console.error("❌ Failed to request pairing code:", err?.message ?? err);
            process.exit(1);
        }
    }

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m || !m.message) return;
        const from = m.key.remoteJid;
        let body = "";
        if (m.message.conversation) body = m.message.conversation;
        else if (m.message.extendedTextMessage) body = m.message.extendedTextMessage.text;
        if (!body.startsWith(".")) return;

        const cmd = body.slice(1).trim().split(" ")[0].toLowerCase();
        if (cmd === "ping") {
            await sock.sendMessage(from, { text: "🏓 Pong! Bot Active." });
        }
        if (cmd === "menu") {
            await sock.sendMessage(from, { text: 
`👑 DEEP_EXAM KNOWLEDGE BOT 👑

Commands:
.ping
.menu
.jamb
.waec
.sudo
.tag` });
        }
    });
}

// Ask for phone if session not registered
(async () => {
    let phoneNumber = process.env.WHATSAPP_NUMBER;
    if (!phoneNumber) {
        phoneNumber = await promptForPhoneNumber();
    }
    startBot(phoneNumber);
})();
