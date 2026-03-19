const crypto = require("crypto"); // Just require, don't use webcrypto in Node.js

const axios = require("axios");
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const P = require("pino");

const OWNER = "2349154472946";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    browser: ["DEEP_EXAM_KNOWLEDGE_BOT", "Chrome", "1.0"],
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);

  // PAIRING CODE (first-time only)
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      let code = await sock.requestPairingCode(OWNER);
      console.log("");
      console.log("=================================");
      console.log("👑 DEEP EXAM KNOWLEDGE BOT");
      console.log("PAIRING CODE:", code);
      console.log("Open WhatsApp → Linked Devices");
      console.log("Tap 'Link with phone number'");
      console.log("=================================");
    }, 4000);
  }

  // MESSAGE LISTENER
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m.message) return;

      const from = m.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      let body = "";

      if (m.message.conversation) body = m.message.conversation;
      else if (m.message.extendedTextMessage && m.message.extendedTextMessage.text) body = m.message.extendedTextMessage.text;
      else if (m.message.text) body = m.message.text;

      if (!body || !body.startsWith(".")) return;

      const args = body.split(" ");
      const cmd = args[0].slice(1).toLowerCase();

      // ping
      if (cmd === "ping") {
        await sock.sendMessage(from, { text: "⚡ BOT ONLINE ⚡" });
      }

      // menu
      else if (cmd === "menu") {
        await sock.sendMessage(from, {
          text: `👑 DEEP EXAM KNOWLEDGE BOT 👑

🔹menu🔹
🔹ping🔹
🔹ai🔹
🔹tag🔹
🔹owner🔹
🔹speed🔹

🤖 AI CHAT

.ai Hello
.ai Explain physics
`
        });
      }

      // ai
      else if (cmd === "ai") {
        let question = args.slice(1).join(" ");
        if (!question) return await sock.sendMessage(from, {
          text: "Example:\n.ai What is physics?"
        });
        try {
          let res = await axios.get(`https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(question)}&owner=DeepBot&botname=AI-BOT`);
          await sock.sendMessage(from, {
            text: `🤖 AI RESPONSE

${res.data.response}`
          });
        } catch (err) {
          await sock.sendMessage(from, { text: "❌ AI Error! Please try again." });
        }
      }

      // tag all
      else if (cmd === "tag") {
        if (!isGroup) return sock.sendMessage(from, { text: "Group only command" });
        let group = await sock.groupMetadata(from);
        let members = group.participants.map(v => v.id);
        await sock.sendMessage(from, {
          text: "📢 Attention Everyone!",
          mentions: members
        });
      }

      // speed
      else if (cmd === "speed") {
        let start = Date.now();
        let end = Date.now();
        await sock.sendMessage(from, {
          text: `⚡ BOT SPEED
${end - start} ms`
        });
      }

      // owner
      else if (cmd === "owner") {
        await sock.sendMessage(from, {
          text: `👤 BOT OWNER

Number: +${OWNER}
Bot: DEEP EXAM KNOWLEDGE BOT`
        });
      }
    } catch (err) {
      console.log("Message listener error:", err);
    }
  });
}

startBot();
