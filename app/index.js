const http = require("http");
const {
  Client,
  Intents,
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  Permissions,
  MessageSelectMenu,
} = require("discord.js");
const moment = require("moment");
const express = require("express");
const app = express();
const fs = require("fs");
const util = require("util");
const path = require("path");
const cron = require("node-cron");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
require("dotenv").config();
const client = new Client({
  partials: ["CHANNEL"],
  intents: new Intents(32767),
});

const newbutton = (buttondata) => {
  return {
    components: buttondata.map((data) => {
      return {
        custom_id: data.id,
        label: data.label,
        style: data.style || 1,
        url: data.url,
        emoji: data.emoji,
        disabled: data.disabled,
        type: 2,
      };
    }),
    type: 1,
  };
};
process.env.TZ = "Asia/Tokyo";
("use strict");
let guildId;

http.createServer(function (request, response) {
    try {
      response.writeHead(200, { "Content-Type": "text/plain;charset=utf-8" });
      response.end(
        `ログイン`
      );
    } catch (e) {
      console.log(e);
    }
  })
  .listen(3000);

if (process.env.DISCORD_BOT_TOKEN == undefined) {
  console.error("tokenが設定されていません！");
  process.exit(0);
}

client.on("ready", (client) => {
  console.log(`ログイン: ${client.user.tag}`);
  client.user.setActivity({
    type: "PLAYING",
    name: `PayPay`,
  });
  client.guilds.cache.size;
  client.user.setStatus("online");
});

client.once("ready", async () => {
    try {
      await client.application.commands.create({
        name: "allow_list",
        description: "許可リスト管理",
        options: [
          {
            type: "USER",
            name: "ユーザー",
            description: "ユーザー",
          }
        ],
      });
    } catch (error) {
      console.error(error);
    }
  });

client.once("ready", async () => {
    try {
      await client.application.commands.create({
        name: "マネロンチェック",
        description: "PayPayURLチェック",
        options: [
          {
            type: "STRING",
            name: "link",
            description: "PayPayリンク",
          }
        ],
      });
    } catch (error) {
      console.error(error);
    }
  });

const { URL, URLSearchParams } = require("url");
const uuid = require("uuid");
const { DateTime } = require("luxon");

function extractVerificationCode(url) {
  const parsedUrl = new URL(url);
  const pathSegments = parsedUrl.pathname.split("/");

  if (pathSegments.length > 1) {
    return pathSegments[pathSegments.length - 1];
  }

  const queryParams = parsedUrl.searchParams;
  if (queryParams.has("link_key")) {
    return queryParams.get("link_key");
  }

  return null;
}

async function getPayPayInfo(url) {
    const verificationCode = extractVerificationCode(url);
    if (!verificationCode) return null;

    const clientUuid = uuid.v4();
    const targetUrl = `https://www.paypay.ne.jp/app/v2/p2p-api/getP2PLinkInfo?verificationCode=${verificationCode}&client_uuid=${clientUuid}`;
    
    const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Referer': `https://www.paypay.ne.jp/app/p2p/${verificationCode}`
        }
    });

    if (!response.ok) return null;
    return await response.json();
}

const ALLOW_FILE = path.join(__dirname, 'allow.json');

// allow.jsonが存在しない場合に作成する初期化処理
if (!fs.existsSync(ALLOW_FILE)) {
    fs.writeFileSync(ALLOW_FILE, JSON.stringify({ allowedUsers: [] }));
}

// 許可ユーザーを読み込む関数
function getAllowedUsers() {
    const data = fs.readFileSync(ALLOW_FILE, 'utf-8');
    return JSON.parse(data).allowedUsers;
}

// 許可ユーザーを追加する関数
function addAllowedUser(userId) {
    const data = JSON.parse(fs.readFileSync(ALLOW_FILE, 'utf-8'));
    if (!data.allowedUsers.includes(userId)) {
        data.allowedUsers.push(userId);
        fs.writeFileSync(ALLOW_FILE, JSON.stringify(data, null, 2));
        return true;
    }
    return false;
}

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
    const allowedUsers = getAllowedUsers();

    if (interaction.isCommand()) {
        if (interaction.commandName === 'allow_list') {
            if (!interaction.member.permissions.has('ADMINISTRATOR') && !allowedUsers.includes(interaction.user.id)) {
                return interaction.reply({ content: 'このコマンドを実行する権限がありません。', ephemeral: true });
            }

            const targetUser = interaction.options.getUser('ユーザー');
            const success = addAllowedUser(targetUser.id);

            if (success) {
                await interaction.reply({ content: `✅ ${targetUser.tag} を許可リストに追加しました。`, ephemeral: true });
            } else {
                await interaction.reply({ content: `ℹ️ ${targetUser.tag} は既に許可リストに登録されています。`, ephemeral: true });
            }
            return;
        }

        if (interaction.commandName === 'マネロンチェック') {
            if (!allowedUsers.includes(interaction.user.id)) {
                return interaction.reply({ content: 'コマンドを使用する権限がありません', ephemeral: true });
            }

            const url = interaction.options.getString('link');
            await handleCheck(interaction, url);
        }

    if (interaction.isButton()) {
        if (interaction.customId === 're_check') {
            const urlLine = interaction.message.embeds[0].description.split('\n')[1];
            const url = urlLine.replace(/`/g, '');
            
            await interaction.deferUpdate();
            await handleCheck(interaction, url);
        }
    }
}
}
});

async function handleCheck(interaction, paypayUrl) {
    // 1. 処理中のEmbedを表示
    const processingEmbed = new MessageEmbed()
        .setColor('#2F3136')
        .setTitle('処理中...')
        .setDescription('✅ ・ 送金情報を取得しています...\n✅ ・ 送金者のアカウント情報を取得しています...');

    // スラッシュコマンドへの応答（すでにreply済みの場合はeditReply）
    const message = interaction.replied || interaction.deferred
        ? await interaction.editReply({ embeds: [processingEmbed], components: [] })
        : await interaction.reply({ embeds: [processingEmbed], fetchReply: true });

    // 演出のために少し待機（任意）
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 2. データ取得
    const data = await getPayPayInfo(paypayUrl);

    if (!data || !data.payload) {
        return interaction.editReply({ content: 'リンク情報の取得に失敗しました。有効期限切れか無効なURLです。', embeds: [] });
    }

    const payload = data.payload;
    const info = payload.pendingP2PInfo || {};
    
    // 3. 結果Embedの作成
    const resultEmbed = new MessageEmbed()
        .setColor('#111111')
        .setDescription(
            `**リンク**\n\`${paypayUrl}\`\n` +
            `**送信者**\n${payload.sender?.displayName || '不明'}\n` +
            `**金額**\n${info.amount || 0} 円\n` +
            `**取引ID**\n${info.orderId || '不明'}\n\n` +
            `不正資金審査システム`
        );

    // 再審査ボタン
    const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('re_check')
                .setLabel('再審査')
                .setStyle('DANGER'),
        );

    await interaction.message.send({ embeds: [resultEmbed], components: [row] });
}

process.on('uncaughtException', (error) => {
    console.error('未処理の例外:', error);
    fs.appendFileSync('error.log', `未処理の例外: ${error.stack}\n`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未処理の拒否:', reason);
    fs.appendFileSync('error.log', `未処理の拒否: ${reason}\n`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
