const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fsExtra = require('fs-extra');
const express = require('express');
const chromium = require('@sparticuz/chromium');
const app = express();
const port = process.env.PORT || 3000;
const DATA_FILE = 'data.json';
const KEEP_ALIVE_INTERVAL = 300000;
const CLIENT_ID = 'botLocal1';
const SESSION_FOLDER = `./.wwebjs_auth/${CLIENT_ID}`;
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || '5512997507961';

async function clearSession(sessionPath) {
  console.log(`clearSession: Verificando a pasta de sessão: ${sessionPath}`);
  if (fsExtra.existsSync(sessionPath)) {
    console.log(`clearSession: A pasta de sessão existe. Excluindo...`);
    await delay(2000);
    try {
      await fsExtra.remove(sessionPath);
      console.log(`clearSession: Pasta de sessão excluída com sucesso usando fsExtra.`);
    } catch (err) {
      console.error(`clearSession: Erro ao excluir a pasta de sessão:`, err);
    }
  } else {
    console.log(`clearSession: A pasta de sessão não existe.`);
  }
}

async function deleteChromeDebugLog() {
  const logFilePath = `${SESSION_FOLDER}/Default/chrome_debug.log`;
  try {
    if (fsExtra.existsSync(logFilePath)) {
      await fsExtra.unlink(logFilePath);
      console.log(`Arquivo chrome_debug.log excluído com sucesso.`);
    } else {
      console.log(`Arquivo chrome_debug.log não existe.`);
    }
  } catch (error) {
    console.warn(`Erro ao excluir chrome_debug.log:`, error);
  }
}

async function loadData() {
  try {
    const data = await fsExtra.readJson(DATA_FILE);
    return data;
  } catch (err) {
    console.warn('Erro ao carregar os dados:', err);
    return [];
  }
}

async function saveData(data) {
  try {
    await fsExtra.writeJson(DATA_FILE, data, { spaces: 2 });
  } catch (err) {
    console.error('Erro ao salvar os dados:', err);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initializeClient() {
  let executablePath = null;
  let headlessMode = true;

  if (process.env.RENDER) {
    try {
      executablePath = await chromium.executablePath();
      console.log('Chromium executável encontrado:', executablePath);
    } catch (error) {
      console.error('Erro ao obter o caminho do Chromium:', error);
    }
  } else {
    console.log('Usando Chrome local.');
    headlessMode = false;
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
    puppeteer: {
      headless: headlessMode,
      executablePath: executablePath,
      args: chromium.args,
      timeout: 120000,
    }
  });

  client.on('qr', qr => {
    console.log('QR Code recebido:', qr);
    qrcode.generate(qr, { small: true });
  });

  client.on('auth_failure', msg => {
    console.error('Falha na autenticação:', msg);
  });

  client.on('disconnected', async (reason) => {
    console.log('Cliente desconectado:', reason);
    console.log('Tentando reconectar...');
    try {
      await deleteChromeDebugLog();
      await delay(1000);
      await client.destroy();
      console.log('Sessão finalizada, reiniciando cliente...');
      setTimeout(start, 10000);
    } catch (error) {
      console.error('Erro ao destruir a sessão:', error);
    }
  });

  client.on('ready', () => {
    console.log('WhatsApp conectado!');
    console.log('Número do bot:', client.info.wid.user);
    setInterval(() => {
      client.sendMessage(`${TEST_PHONE_NUMBER}@c.us`, 'Keep-alive ping')
        .then(() => console.log('Keep-alive message sent.'))
        .catch(error => console.error('Erro ao enviar keep-alive:', error));
    }, KEEP_ALIVE_INTERVAL);
  });

  client.on('authenticated', (session) => {
    console.log('Autenticado com sucesso!', session);
  });

  client.on('message', async msg => {
    try {
      const inicio = Date.now();

      if (msg.body.match(/(menu|dia|tarde|noite|oi|olá)/i) && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        await delay(500);
        await chat.sendStateTyping();
        await delay(500);
        const contact = await msg.getContact();
        const name = contact.pushname || 'Cliente';
        await client.sendMessage(msg.from, `Olá! ${name.split(" ")[0]},\n\nSou Milena...`);

        const userData = {
          whatsapp: msg.from.replace('@c.us', ''),
          nome: name,
          email: null,
          opcoes_escolhidas: []
        };

        let existingData = await loadData();
        existingData = Array.isArray(existingData) ? existingData : [];
        existingData.push(userData);
        await saveData(existingData);
      } else if (['1', '2', '3', '4', '5'].includes(msg.body)) {
        await handleOption(msg.body, msg, client);
      }

      const fim = Date.now();
      console.log(`Processamento: ${(fim - inicio) / 1000} segundos`);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  return client;
}

async function handleOption(option, msg, client) {
  if (!msg.from.endsWith('@c.us')) return;

  try {
    const chat = await msg.getChat();
    await delay(500);
    await chat.sendStateTyping();
    await delay(500);

    const respostas = {
      '1': 'Link para cadastro: ...',
      '2': 'Tenha 3 consultas mensais...',
      '3': 'Saiba com quem se relaciona...',
      '4': 'Agende um contato: WhatsApp (12) 98.138.3348.',
      '5': 'Se tiver dúvidas, visite nosso site...'
    };

    const resposta = respostas[option] || 'Opção inválida.';
    await client.sendMessage(msg.from, resposta);

    let existingData = await loadData();
    existingData = Array.isArray(existingData) ? existingData : [];
    const userIndex = existingData.findIndex(u => u.whatsapp === msg.from.replace('@c.us', ''));
    if (userIndex !== -1) {
      existingData[userIndex].opcoes_escolhidas.push(option);
      await saveData(existingData);
    }
  } catch (error) {
    console.error('Erro ao lidar com a opção:', error);
  }
}

async function start() {
  try {
    //await clearSession(SESSION_FOLDER);
    const client = await initializeClient();
    await client.initialize();

    app.get('/', (req, res) => {
      res.send('Servidor está rodando! Chatbot WhatsApp DeBocaOnBoca.');
    });

    app.listen(port, () => {
      console.log(`Servidor Express rodando na porta ${port}`);
    }).on('error', err => {
      if (err.code === 'EADDRINUSE') {
        console.error(`A porta ${port} já está em uso. Finalize o processo duplicado ou escolha outra porta.`);
      } else {
        console.error('Erro no servidor Express:', err);
      }
    });

  } catch (error) {
    console.error('Erro ao iniciar:', error);
    console.log('Reiniciando em 10 segundos...');
    setTimeout(start, 10000);
  }
}

start();