// ==== 必要なモジュール読み込み ====
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require("discord.js");
const axios = require("axios");
const express = require("express");
require("dotenv").config();

// ==== Bot と Web サーバーの初期化 ====
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("🌐 Pingサーバー起動中..."));

// ==== 定数 ====
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const GAS_URL = process.env.GAS_URL;

let lastMessage = null;

// ==== ボタン作成 ====
function createButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("出勤")
      .setLabel("出勤")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("退勤")
      .setLabel("退勤")
      .setStyle(ButtonStyle.Danger), // ✅ カンマ削除！
  );
}

// ==== ボタン送信 ====
async function postButtons() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (lastMessage) {
      try {
        await lastMessage.delete(); // 古いボタンを削除
      } catch (_) {}
    }
    lastMessage = await channel.send({
      content: "🕒 勤務ボタンを押してください：",
      components: [createButtonRow()],
    });
    console.log("✅ 勤務ボタンを投稿しました");
  } catch (error) {
    console.error("❌ ボタン投稿失敗:", error);
  }
}

// ==== 定期投稿（1時間ごと） ====
setInterval(postButtons, 1000 * 60 * 60);

// ==== インタラクション処理 ====
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const discordId = interaction.user.id;
  const type = interaction.customId; // '出勤' or '退勤'

  await interaction.reply({
    content: `${type}を記録しました！`,
    ephemeral: true,
  });

  try {
    await axios.post(GAS_URL, { discordId, type });
    console.log(`📤 [${type}] ${discordId} → GAS送信`);
  } catch (error) {
    console.error("❌ GAS通信エラー:", error.message);
  }
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
  postButtons(); // 起動時にも投稿
});

client.login(TOKEN);
