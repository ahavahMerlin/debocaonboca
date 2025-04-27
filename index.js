// Importa as bibliotecas necessárias
const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const fs = require('fs-extra'); // Adiciona o fs-extra
const express = require('express'); // Adiciona o Express
const app = express(); // Cria uma instância do Express

// Define a porta que o servidor irá ouvir
const port = 3000; // MODIFICADO PARA FORÇAR A PORTA 3000

// Caminho para o arquivo JSON onde vamos salvar os dados
const DATA_FILE = 'data.json';

// Função para carregar os dados existentes do arquivo JSON (se houver)
async function loadData() {
    try {
        const data = await fs.readJson(DATA_FILE);
        return data;
    } catch (err) {
        // Se o arquivo não existir ou der erro, retorna um array vazio
        return [];
    }
}

// Função para salvar os dados no arquivo JSON
async function saveData(data) {
    await fs.writeJson(DATA_FILE, data, { spaces: 2 }); // spaces: 2 formata o JSON para ficar mais legível
}

// Cria uma nova instância do cliente WhatsApp
const client = new Client();

// Evento: Quando o QR code é gerado
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
    console.log('QR Code gerado. Escaneie com o WhatsApp.');
});

// Adicione este bloco de tratamento de erros
client.on('auth_failure', msg => {
    // Fired if WWebJS was unable to log into WA.
    console.error('Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
});

client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

// Função auxiliar para criar um delay (pausa)
const delay = ms => new Promise(res => setTimeout(res, ms));

// Evento: Quando uma mensagem é recebida
client.on('message', async msg => {
    const inicioProcessamento = Date.now();

    // Verifica se a mensagem corresponde aos critérios e vem de um número válido do WhatsApp
    if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola)/i) && msg.from.endsWith('@c.us')) {
        console.log(`Mensagem corresponde aos critérios, iniciando processamento...`);

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

        await client.sendMessage(msg.from, 'Olá! '+ name.split(" ")[0] + ', sou o assistente virtual da empresa DeBocaOnBoca. Como posso ajudá-lo(a) hoje? Não deixe de visitar e se inscrever em nosso Canal Youtube ( https://www.youtube.com/@debocaemboca2024/videos?sub_confirmation=l ) e seguir nosso Instagram ( https://www.instagram.com/debocaemboca2024/ ) Por favor, digite o *número* da opção desejada:\n\n1 - Ter um(a) Assistente Virtual Humanizado igual a este, atende clientes e qualifica LEADS com captação a partir de R$ 900,00 ou aprender a fazer um com templates e arquivos de configurações prontos\n2 - Tenha 3 consultas mensais (assinatura mensal) que vão otimizar seu negócio usando Soluções com Inteligência Artificial,\n Em diversas áreas\n Em CiberSegurança Famíliar, pequenas e Médias Empresas\n Em Marketing Digital\n Em Desenvolvimento de Aplicativos Mobile\n3 - Ser nosso sócio(a) parceiro(a) ganhos significativos em conta de participação\n4 - Economia de até 15% mensalmente e gratuitamente na sua conta de luz\n5 - Dossiê Pequeno; Médio ou Completo sobre quem lhe prejudicou, deu golpe ou quem você desconfia ou assinatura mensal R$ 150,00, com direito a 3 consultas mensais - Cada consulta adicional, R$ 100,00\n6 - Quer Renda Extra - Repeteco você vai se apaixonar\n7 - Backup completo do seu celular antes que seja tarde\n8 - Quer uma divulgação personalizada como esta, entre em contato\n9 - Outras perguntas');
        console.log(`Mensagem de boas-vindas enviada.`);

        await delay(500);
        console.log(`Delay 3 concluído.`);
        await chat.sendStateTyping();
        console.log(`Simulação de digitação enviada.`);
        await delay(500);
        console.log(`Delay 4 concluído.`);

        // Salva os dados do usuário (primeira interação)
        const userData = {
            whatsapp: msg.from.replace('@c.us', ''), // Remove o @c.us do número
            nome: name,
            email: null, // Não temos o e-mail aqui, então deixamos como null
            opcoes_escolhidas: [] // Inicialmente, nenhuma opção escolhida
        };

        const existingData = await loadData();
        existingData.push(userData); // Adiciona o novo usuário aos dados existentes

        await saveData(existingData); // Salva tudo no arquivo
    } else if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(msg.body) && msg.from.endsWith('@c.us')) {
        // Chama a função para lidar com as opções
        await handleOption(msg.body);
    }

    const fimProcessamento = Date.now();
    const tempoTotal = (fimProcessamento - inicioProcessamento) / 1000;
    console.log(`Tempo total de processamento da mensagem: ${tempoTotal} segundos.`);

    // Função para lidar com as opções escolhidas pelo usuário
    async function handleOption(option) {
        if (msg.from.endsWith('@c.us')) {
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

            // Atualiza os dados do usuário com a opção escolhida
            const existingData = await loadData();
            const userIndex = existingData.findIndex(user => user.whatsapp === msg.from.replace('@c.us', ''));
            if (userIndex !== -1) {
                existingData[userIndex].opcoes_escolhidas.push(option);
                await saveData(existingData);
            }
        }
    }
});

// Rota para a página inicial
app.get('/', (req, res) => {
  res.send('Servidor está rodando! Chatbot WhatsApp DeBocaOnBoca.');
});

// Inicia o servidor Express para "escutar" as requisições na porta definida
app.listen(port, () => {
  console.log(`Servidor Express rodando na porta ${port}`);
});

client.initialize(); // Inicia o cliente