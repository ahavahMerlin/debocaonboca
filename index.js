const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs-extra');
const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');

const port = process.env.PORT || 3000;
const DATA_FILE = 'data.json';

async function loadData() {
    try {
        const data = await fs.readJson(DATA_FILE);
        return data;
    } catch (err) {
        console.warn('Erro ao carregar os dados:', err);
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

async function initializeClient() { // Criar uma função assíncrona para inicializar o cliente
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            // executablePath: 'C:\\Users\\venda\\AppData\\Local\\Google\\Chrome SxS\\Application\\chrome.exe', // Remova esta linha
            args: chromium.args,
        }
    });

    client.on('qr', qr => {
        console.log('QR Code recebido:', qr);
        qrcode.generate(qr, { small: true });
        console.log('QR Code gerado. Escaneie com o WhatsApp.');
    });

    client.on('auth_failure', msg => {
        console.error('Falha na autenticação:', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('Cliente desconectado:', reason);
    });

    client.on('ready', () => {
        console.log('Tudo certo! WhatsApp conectado.');

        // Implementação do Keep-Alive
        setInterval(() => {
            client.sendMessage('5512997507961@c.us', 'Ping!');
            console.log('Mensagem de Keep-Alive enviada.');
        }, 240000);
    });

    client.on('authenticated', (session) => {
        console.log('Autenticado com sucesso! Dados da sessão:', session);
    });

    client.on('message', async msg => {
        const inicioProcessamento = Date.now();

        // Log da mensagem recebida
        console.log(`Mensagem recebida: ${msg.body} de ${msg.from}`);

        if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {
            console.log(`Mensagem corresponde aos critérios, iniciando processamento...`);

            try {
                const chat = await msg.getChat();
                console.log(`Chat obtido.`);

                await delay(500);
                console.log(`Delay 1 concluído.`);
                await chat.sendStateTyping();
                console.log(`Simulação de digitação enviada.`);
                await delay(500);
                console.log(`Delay 2 concluído.`);
                const contact = await msg.getContact();
                console.log(`Informações do contato obtidas.`);

                const name = contact.pushname ? contact.pushname : 'Cliente';
                console.log(`Nome do contato: ${name}`);

                await client.sendMessage(msg.from, 'Olá! ' + name.split(" ")[0] + ',\n\nSou Assistente Virtual da empresa DeBocaOnBoca. Como posso ajudá-lo(a) hoje?\n\nNão deixe de visitar e se inscrever em nosso Canal Youtube ( https://www.youtube.com/@debocaemboca2024/videos?sub_confirmation=l )\n\nE seguir nosso Instagram ( https://www.instagram.com/debocaemboca2024/ )\n\nPor favor, digite o *número* da opção desejada abaixo:\n\n1 - Ter um(a) Assistente Virtual Humanizado igual a este, atende clientes e qualifica LEADS com captação a partir de R$ 900,00 ou aprender a fazer um com templates e arquivos de configurações prontos\n\n2 - Tenha 3 consultas mensais por pequena assinatura mensal, que vão otimizar seu negócio usando Soluções com Inteligência Artificial,\nEm diversas áreas\nEm CiberSegurança Famíliar, pequenas e Médias Empresas\nEm Marketing Digital\nEm Desenvolvimento de Aplicativos Mobile\n\n3 - Ser nosso sócio(a) parceiro(a) com ganhos significativos em conta de participação\n\n4 - Economia de até 15% mensalmente e gratuitamente na sua conta de luz\n\n5 - Pequeno Dossiê; Médio ou Completo sobre quem lhe prejudicou, deu golpe ou quem de você desconfia ou por assinatura mensal R$ 150,00, com direito a 3 consultas mensais - Cada consulta adicional, R$ 100,00\n\n6 - Quer Renda Extra - Repeteco você vai se apaixonar\n\n7 - Backup completo do seu celular, antes que seja tarde\n\n8 - Quer divulgação personalizada como esta, entre em contato\n\n9 - Outras perguntas');
                console.log(`Mensagem de boas-vindas enviada.`);

                await delay(500);
                console.log(`Delay 3 concluído.`);
                await chat.sendStateTyping();
                console.log(`Simulação de digitação enviada.`);
                await delay(500);
                console.log(`Delay 4 concluído.`);

                const userData = {
                    whatsapp: msg.from.replace('@c.us', ''),
                    nome: name,
                    email: null,
                    opcoes_escolhidas: []
                };

                const existingData = await loadData();
                existingData.push(userData);

                await saveData(existingData);
            } catch (error) {
                console.error('Erro ao processar a mensagem inicial:', error);
            }
        } else if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(msg.body) && msg.from.endsWith('@c.us')) {
            try {
                await handleOption(msg.body);
            } catch (error) {
                console.error('Erro ao processar a opção escolhida:', error);
            }
        }

        const fimProcessamento = Date.now();
        const tempoTotal = (fimProcessamento - inicioProcessamento) / 1000; // Tempo em segundos
        console.log(`Tempo total de processamento da mensagem: ${tempoTotal} segundos.`);

        async function handleOption(option) {
            if (msg.from.endsWith('@c.us')) {
                try {
                    const chat = await msg.getChat();

                    await delay(500);
                    await chat.sendStateTyping();
                    await delay(500);

                    let responseMessage = '';

                    switch (option) {
                        case '1':
                            responseMessage = 'Link para cadastro: https://sites.google.com/view/solucoes-em-ia\n\nReceba o passo a passo, templates e arquivos de configuração, damos suporte na instalação via remoto através do AnyDesk *Pagamento:* A partir de R$ 500,00 à vista MercadoPago Pix E-mail vendamais@gmail.com ou com cartão.';
                            break;
                        case '2':
                            responseMessage = 'Link para cadastro: https://sites.google.com/view/solucoes-em-ia\n\nTenha 3 consultas mensais que vão otimizar seu negócio nas Soluções em IA e suporte via remoto através do AnyDesk *Assinatura Mensal:* R$ 99,90 à vista MercadoPago Pix E-mail vendamais@gmail.com pode pagar com cartão.';
                            break;
                        case '3':
                            responseMessage = 'Informações ao final na página e Link para cadastro: https://sites.google.com/view/solucoes-em-ia';
                            break;
                        case '4':
                            responseMessage = 'DeBocaOnBoca Energia Solar: https://debocaembocaenergiasolar.vendasmais.com/';
                            break;
                        case '5':
                            responseMessage = 'Link para cadastro: https://sites.google.com/view/solucoes-em-ia\n\nSaiba, antes que seja tarde, com quem se relaciona, quem lhe deu um golpe ou de quem você desconfia, a partir de qualquer pequena informação ou detalhe, cpf, nome completo, endereço, cep, placa de carro e outros.\nPequeno Dossiê R$ 75,00.\nMédio Dossiê R$ 150;00.\nCompleto Dossiê R$ 300,00.\n Assinatura Mensal R$ 150,00, com direito a 3 consultas mensais - Cada consulta adicional, R$ 100,00\nPix MercadoPago E-mail vendamais@gmail.com.\nWhatsApp (12) 99.750.7961.';
                            break;
                        case '6':
                            responseMessage = 'Link para cadastro: https://sites.google.com/view/debocaonboca-repeteco';
                            break;
                        case '7':
                            responseMessage = 'Serviço presencial, agendar entre em contato: WhatsApp (12) 99.750.7961.';
                            break;
                        case '8':
                            responseMessage = 'Entre em contato: WhatsApp (12) 99.750.7961.';
                            break;
                        case '9':
                            responseMessage = 'Se tiver outras dúvidas ou precisar de mais informações, por favor, escreva aqui ou visite nosso site: https://sites.google.com/view/solucoes-em-ia/';
                            break;
                        default:
                            responseMessage = 'Opção inválida.';
                    }

                    await client.sendMessage(msg.from, responseMessage);

                    const existingData = await loadData();
                    const userIndex = existingData.findIndex(user => user.whatsapp === msg.from.replace('@c.us', ''));
                    if (userIndex !== -1) {
                        existingData[userIndex].opcoes_escolhidas.push(option);
                        await saveData(existingData);
                    }
                } catch (error) {
                    console.error('Erro ao lidar com a opção:', error);
                }
            }
        }
    });
    return client;
}

app.get('/', (req, res) => {
    res.send('Servidor está rodando! Chatbot WhatsApp DeBocaOnBoca.');
});

app.listen(port, () => {
    console.log(`Servidor Express rodando na porta ${port}`);
});

async function start() {
    const client = await initializeClient();
    client.initialize();
}
start();

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}