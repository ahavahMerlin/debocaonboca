const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fsExtra = require('fs-extra');
const express = require('express');
const chromium = require('@sparticuz/chromium');

const app = express();
const port = process.env.PORT || 3000;
const DATA_FILE = 'data.json';
const KEEP_ALIVE_INTERVAL = 300000; // 5 minutos (em milissegundos)

// ---------------------- Funções Utilitárias ----------------------

// Carrega os dados do arquivo JSON
async function loadData() {
    try {
        const data = await fsExtra.readJson(DATA_FILE);
        console.log('Dados carregados com sucesso:', data); // Log para verificar os dados
        return data;
    } catch (err) {
        console.warn('Erro ao carregar os dados (pode ser a primeira execução):', err);
        return []; // Retorna um array vazio para evitar erros
    }
}

// Salva os dados no arquivo JSON
async function saveData(data) {
    try {
        await fsExtra.writeJson(DATA_FILE, data, { spaces: 2 });
        console.log('Dados salvos com sucesso:', data); // Log para verificar os dados
    } catch (err) {
        console.error('Erro ao salvar os dados:', err);
    }
}

// Função de delay (para simular digitação)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------- Inicialização do Cliente WhatsApp ----------------------
async function initializeClient() {
    let executablePath;
    let useChrome = false; // Variável para controlar o uso do Chrome

    if (process.env.RENDER) {
        // Para ambientes de produção (Render), usa o Chromium do @sparticuz
        try {
            executablePath = await chromium.executablePath();
            console.log('Chromium executável encontrado:', executablePath);
        } catch (error) {
            console.error('Erro ao obter o caminho do executável do Chromium:', error);
            executablePath = null; // Em caso de erro, define como null
        }
    } else {
        // Para desenvolvimento local, tenta usar o Chrome instalado
        executablePath = null;
        useChrome = true; // Indica que devemos tentar usar o Chrome local
        console.log('Usando o Chrome instalado localmente (se disponível).');
    }

    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true, // Executa o Chrome em modo headless (sem interface gráfica)
            executablePath: executablePath, // Caminho para o executável do Chrome
            args: chromium.args, // Argumentos do Chromium (necessários no Render)
            ignoreDefaultArgs: useChrome ? ['--disable-extensions'] : [], // Desativa extensões se usar Chrome
            timeout: 60000 // Tempo limite para as operações do Puppeteer (em milissegundos)
        }
    });

    // Evento: QR Code gerado
    client.on('qr', qr => {
        console.log('QR Code recebido:', qr);
        qrcode.generate(qr, { small: true });
        console.log('QR Code gerado. Escaneie com o WhatsApp.');
    });

    // Evento: Falha na autenticação
    client.on('auth_failure', msg => {
        console.error('Falha na autenticação:', msg);
    });

    // Evento: Desconexão
    client.on('disconnected', async (reason) => {
        console.log('Cliente desconectado:', reason);
        console.log('Tentando reconectar...');
        try {
            await client.logout(); // Tenta fazer o logout
            await client.destroy(); // Destrói a sessão atual
            console.log('Sessão finalizada, reiniciando cliente...');
            setTimeout(start, 5000); // Reinicia o cliente após 5 segundos
        } catch (error) {
            console.error('Erro ao fazer logout ou destruir a sessão:', error);
        }
    });

    // Evento: Cliente pronto (conectado)
    client.on('ready', () => {
        console.log('Tudo certo! WhatsApp conectado.');

        // Keep-alive
        setInterval(() => {
            // Substitua 'SEU_NUMERO@c.us' pelo seu número de teste.
            client.sendMessage('5512997507961@c.us', 'Keep-alive ping')
                .then(() => console.log('Keep-alive message sent.'))
                .catch(error => console.error('Erro ao enviar keep-alive:', error));
        }, KEEP_ALIVE_INTERVAL);
    });

    // Evento: Autenticado
    client.on('authenticated', (session) => {
        console.log('Autenticado com sucesso! Dados da sessão:', session);
    });

    // Evento: Mensagem recebida
    client.on('message', async msg => {
        try {
            const inicioProcessamento = Date.now();
            //console.log(`Mensagem recebida: ${msg.body} de ${msg.from}`);

            // Verifica se a mensagem corresponde aos critérios do menu
            if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {
                console.log(`Mensagem corresponde aos critérios, iniciando processamento...`);

                const chat = await msg.getChat();
                console.log(`Chat obtido.`);

                await delay(500);
                await chat.sendStateTyping();
                await delay(500);

                const contact = await msg.getContact();
                console.log(`Informações do contato obtidas.`);

                const name = contact.pushname ? contact.pushname : 'Cliente';
                console.log(`Nome do contato: ${name}`);

                // Envia a mensagem de boas-vindas formatada
                await client.sendMessage(msg.from, `Olá! ${name.split(" ")[0]},\n\nSou Midiã represento a empresa DeBocaOnBoca. Como posso ajudá-lo(a) hoje?\n\nNão deixe de visitar e se inscrever em nosso Canal Youtube (https://www.youtube.com/@debocaemboca2024/videos?sub_confirmation=1)\n\nE seguir nosso Instagram (https://www.instagram.com/debocaemboca2024/)\n\nPor favor, digite o *número* da opção desejada abaixo:\n\n1 - Ter um(a) Assistente Virtual Humanizado que atende seus clientes e qualifica LEADS com captação a partir de R$ 1.500,00 ou ter os templates e arquivos de configurações prontos, mais nosso suporte remote pelo AnyDesk\n\n2 - Tenha 3 consultas mensais por pequena assinatura mensal, que vão otimizar seu negócio usando Soluções com Inteligência Artificial,\nEm diversas áreas\nEm CiberSegurança Famíliar, pequenas e Médias Empresas\nEm Marketing Digital\nEm Desenvolvimento de Aplicativos Mobile\n\n3 - Pequeno Dossiê; Médio ou Completo sobre quem lhe prejudicou, deu golpe ou quem de você desconfia ou por assinatura mensal R$ 150,00, com direito a 3 consultas mensais - Cada consulta adicional, R$ 100,00\n\n4 - Quer divulgação personalizada como esta, entre em contato\n\n5 - Outras perguntas`);

                console.log(`Mensagem de boas-vindas enviada.`);

                await delay(500);
                await chat.sendStateTyping();
                await delay(500);

                // Cria objeto com dados do usuário
                const userData = {
                    whatsapp: msg.from.replace('@c.us', ''),
                    nome: name,
                    email: null,
                    opcoes_escolhidas: []
                };

                // Carrega os dados existentes
                let existingData = await loadData();
                existingData = Array.isArray(existingData) ? existingData : [];

                // Adiciona os novos dados
                existingData.push(userData);

                // Salva os dados atualizados
                await saveData(existingData);
            }
            // Verifica se a mensagem é uma opção válida (1 a 9)
            else if (['1', '2', '3', '4', '5'].includes(msg.body) && msg.from.endsWith('@c.us')) {  // Removi 6 7 8 9 pois não existem opções
                // Chama a função para lidar com a opção
                await handleOption(msg.body, msg, client);
            }

            const fimProcessamento = Date.now();
            const tempoTotal = (fimProcessamento - inicioProcessamento) / 1000;
            console.log(`Tempo total de processamento da mensagem: ${tempoTotal} segundos.`);

        } catch (error) {
            console.error('Erro ao processar a mensagem:', error);
        }
    });

    return client;
}

// Função para lidar com as opções do menu
async function handleOption(option, msg, client) {
    if (msg.from.endsWith('@c.us')) {
        try {
            const chat = await msg.getChat();

            await delay(500);
            await chat.sendStateTyping();
            await delay(500);

            let responseMessage = '';

            switch (option) {
                case '1':
                    responseMessage = 'Link para cadastro: https://sites.google.com/view/solucoes-em-ia\n\nTer um(a) Assistente Virtual que atende seus clientes e qualifica LEADS com captação a partir de R$ 1.500,00\n\n*Pagamento 50% Assistente Virtial:* R$ 750,00 MercadoPago Pix E-mail vendamais@gmail.com ou com cartão\n\nTer os templates e arquivos de configurações prontos, mais nosso suporte remote pelo AnyDesk\n\n**Pagamento 50% pelos templates e arquivos de configurações prontos:\n\n* R$ 1.00,00 MercadoPago Pix E-mail vendamais@gmail.com ou com cartão\n\nAgende um contato: WhatsApp (12) 98.138.3348.';
                    break;
                case '2':
                    responseMessage = 'Link para cadastro: https://sites.google.com/view/solucoes-em-ia\n\nTenha 3 consultas mensais que vão otimizar seu negócio nas Soluções em IA e suporte via remoto através do AnyDesk *Assinatura Mensal:* R$ 99,90 MercadoPago Pix E-mail vendamais@gmail.com ou com cartão\n\nAgende um contato: WhatsApp (12) 98.138.3348.';
                    break;
                case '3':
                    responseMessage = 'Link para cadastro: https://sites.google.com/view/solucoes-em-ia\n\nSaiba, antes que seja tarde, com quem se relaciona, quem lhe deu um golpe ou de quem você desconfia, a partir de qualquer pequena informação ou detalhe, cpf, nome completo, endereço, cep, placa de carro e outros.\nPequeno Dossiê R$ 75,00.\nMédio Dossiê R$ 150;00.\nCompleto Dossiê R$ 300,00.\n Assinatura Mensal R$ 150,00, com direito a 3 consultas mensais - Cada consulta adicional, R$ 100,00\nPix MercadoPago E-mail vendamais@gmail.com ou com cartão\n\nAgende um contato: WhatsApp (12) 98.138.3348.';
                    break;
                case '4':
                    responseMessage = 'Agende um contato: WhatsApp (12) 98.138.3348.';
                    break;
                case '5':
                    responseMessage = 'Se tiver outras dúvidas ou precisar de mais informações, por favor, escreva aqui, visite nosso site: https://sites.google.com/view/solucoes-em-ia/\n\n ou Agende um contato: WhatsApp (12) 98.138.3348.';
                    break;
                default:
                    responseMessage = 'Opção inválida.';
            }

            // Envia a mensagem de resposta
            await client.sendMessage(msg.from, responseMessage);

            // Carrega os dados existentes
            let existingData = await loadData();
            existingData = Array.isArray(existingData) ? existingData : [];

            // Encontra o índice do usuário
            const userIndex = existingData.findIndex(user => user.whatsapp === msg.from.replace('@c.us', ''));

            // Se o usuário existe, atualiza as opções escolhidas
            if (userIndex !== -1) {
                existingData[userIndex].opcoes_escolhidas.push(option);
                await saveData(existingData);
            }
        } catch (error) {
            console.error('Erro ao lidar com a opção:', error);
        }
    }
}

// ---------------------- Inicialização do Servidor Express ----------------------
app.get('/', (req, res) => {
    res.send('Servidor está rodando! Chatbot WhatsApp DeBocaOnBoca.');
});

app.listen(port, () => {
    console.log(`Servidor Express rodando na porta ${port}`);
});

// ---------------------- Função Principal de Inicialização ----------------------
async function start() {
    try {
        const client = await initializeClient();
        await client.initialize();
    } catch (error) {
        console.error('Erro ao inicializar o cliente:', error);
    }
}

// Inicia o processo
start();