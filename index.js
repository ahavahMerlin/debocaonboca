const qrcode = require('qrcode-terminal');
const qrcodeGenerator = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs-extra');
const express = require('express');
const { chromium } = require('@sparticuz/chromium');
const app = express();
const port = process.env.PORT || 3000;
const DATA_FILE = 'data.json';
const KEEP_ALIVE_INTERVAL = 300000;
const CLIENT_ID = 'botLocal1';
const SESSION_FOLDER = `./.wwebjs_auth/${CLIENT_ID}`;
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || '5512997507961';

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = await fs.readJson(DATA_FILE);
            return data;
        } else {
            return [];
        }
    } catch {
        return [];
    }
}

async function saveData(data) {
    try {
        await fs.writeJson(DATA_FILE, data, { spaces: 2 });
    } catch (err) {
        console.error('Erro ao salvar os dados:', err);
    }
}

async function initializeClient() {
    let executablePath = null;
    let headlessMode = true;
    let puppeteerArgs = [];

    if (process.env.RENDER === 'true') {
        try {
            executablePath = await chromium.executablePath;
            puppeteerArgs = chromium.args || [];
            console.log('Chromium executável encontrado:', executablePath);
        } catch (error) {
            console.warn('Chromium não encontrado, continuando com valores padrão.');
        }
    } else {
        console.log('Usando Chrome local.');
        headlessMode = false;
    }

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: CLIENT_ID }),
        puppeteer: {
            headless: headlessMode,
            executablePath: executablePath || undefined,
            args: puppeteerArgs,
            timeout: 60000
        }
    });

    client.on('qr', qr => {
        console.log('QR Code recebido:');
        qrcode.generate(qr, { small: true });

        qrcodeGenerator.toDataURL(qr, { type: 'image/png' }, (err, url) => {
            if (!err) console.log('Link do QR Code:', url);
        });
    });

    client.on('auth_failure', msg => {
        console.error('Falha na autenticação:', msg);
    });

    client.on('disconnected', async (reason) => {
        console.log('Cliente desconectado:', reason);
        await delay(5000);
        try {
            await client.destroy();
            start();
        } catch (error) {
            console.error('Erro ao destruir a sessão:', error);
            setTimeout(start, 10000);
        }
    });

    client.on('ready', () => {
        console.log('WhatsApp conectado!');
        setInterval(() => {
            client.sendMessage(`${TEST_PHONE_NUMBER}@c.us`, 'Keep-alive ping')
                .catch(error => console.error('Erro no keep-alive:', error));
        }, KEEP_ALIVE_INTERVAL);
    });

    client.on('authenticated', (session) => {
        console.log('Autenticado com sucesso!');
    });

    client.on('message', async msg => {
        try {
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
                const userIndex = existingData.findIndex(u => u.whatsapp === userData.whatsapp);

                if (userIndex === -1) existingData.push(userData);
                await saveData(existingData);

                await client.sendMessage(msg.from, `Como posso ajudar? Escolha uma opção:\n1. Cadastro\n2. Consultas mensais\n3. Sobre relacionamentos\n4. Agendar contato\n5. Dúvidas`);
            } else if (['1', '2', '3', '4', '5'].includes(msg.body)) {
                await handleOption(msg.body, msg, client);
            }
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
        const client = await initializeClient();
        await client.initialize();

        app.get('/', (req, res) => {
            res.send('Servidor está rodando! Chatbot WhatsApp DeBocaOnBoca.');
        });

        app.listen(port, () => {
            console.log(`Servidor rodando na porta ${port}`);
        }).on('error', err => {
            if (err.code === 'EADDRINUSE') {
                console.error(`A porta ${port} já está em uso.`);
            } else {
                console.error('Erro no servidor:', err);
            }
        });

    } catch (error) {
        console.error('Erro ao iniciar:', error);
        console.log('Reiniciando em 10 segundos...');
        setTimeout(start, 10000);
    }
}

start();
