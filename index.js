const qrcode = require('qrcode-terminal');
const qrcodeGenerator = require('qrcode'); // Adicionado para gerar o link do QR Code
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs-extra'); // Use 'fs-extra' para garantir consistência
const express = require('express');
const { chromium } = require('@sparticuz/chromium'); // Correção aqui: Importe corretamente
const app = express();
const port = process.env.PORT || 3000;
const DATA_FILE = 'data.json';
const KEEP_ALIVE_INTERVAL = 300000;
const CLIENT_ID = 'botLocal1';
const SESSION_FOLDER = `./.wwebjs_auth/${CLIENT_ID}`;
const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || '5512997507961';

// Função de delay (útil para pausas)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function clearSession(sessionPath) {
    console.log(`clearSession: Verificando a pasta de sessão: ${sessionPath}`);
    if (fs.existsSync(sessionPath)) {
        console.log(`clearSession: A pasta de sessão existe. Excluindo...`);
        await delay(2000);
        try {
            await fs.remove(sessionPath);
            console.log(`clearSession: Pasta de sessão excluída com sucesso usando fs.`);
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
        if (fs.existsSync(logFilePath)) {
            await fs.unlink(logFilePath);
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
        if (fs.existsSync(DATA_FILE)) { // Verifica se o arquivo existe antes de tentar ler
            const data = await fs.readJson(DATA_FILE);
            return data;
        } else {
            console.log('Arquivo data.json não encontrado. Retornando array vazio.');
            return []; // Retorna um array vazio se o arquivo não existir
        }
    } catch (err) {
        console.warn('Erro ao carregar os dados:', err);
        return [];
    }
}

async function saveData(data) {
    try {
        await fs.writeJson(DATA_FILE, data, { spaces: 2 });
        console.log('Dados salvos com sucesso.'); // Adicionado log de sucesso
    } catch (err) {
        console.error('Erro ao salvar os dados:', err);
    }
}


async function initializeClient() {
    let executablePath = null;
    let headlessMode = true;

    if (process.env.RENDER) {
        try {
            executablePath = await chromium.executablePath;  // Corrected: Now correctly accesses executablePath
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
            args: chromium.args,  // Corrected: Directly use chromium.args
        }
    });


    client.on('qr', qr => {
        console.log('QR Code recebido:', qr);
        qrcode.generate(qr, { small: true });


        qrcodeGenerator.toDataURL(qr, { type: 'image/png' }, (err, url) => {
            if (err) {
                console.error('Erro ao gerar o link do QR Code:', err);
            } else {
                console.log('Link do QR Code:', url);
            }
        });


        console.log("TEST_PHONE_NUMBER:", process.env.TEST_PHONE_NUMBER);

    });

    client.on('auth_failure', msg => {
        console.error('Falha na autenticação:', msg);
    });

    client.on('disconnected', async (reason) => {
        console.log('Cliente desconectado:', reason);
        console.log('Tentando reconectar...');

        await delay(5000);

        try {
            await client.destroy();
            console.log('Sessão finalizada, reiniciando cliente...');
            start();
        } catch (error) {
            console.error('Erro ao destruir a sessão:', error);
            console.log('Tentando reconectar novamente em 10 segundos...');
            setTimeout(start, 10000);
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

                const userIndex = existingData.findIndex(u => u.whatsapp === userData.whatsapp);

                if (userIndex === -1) {
                    existingData.push(userData);
                    console.log(`Novo usuário adicionado: ${userData.nome} (${userData.whatsapp})`);
                } else {
                    console.log(`Usuário já existe: ${existingData[userIndex].nome} (${existingData[userIndex].whatsapp})`);
                }

                await saveData(existingData);


                  await client.sendMessage(msg.from, `Como posso ajudar? Escolha uma opção:\n1. Cadastro\n2. Consultas mensais\n3. Sobre relacionamentos\n4. Agendar contato\n5. Dúvidas`);


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