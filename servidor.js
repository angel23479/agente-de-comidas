require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');

// ✅ Token desde variable de entorno
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ ERROR: No se encontró BOT_TOKEN en las variables de entorno');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar el bot
const bot = new Telegraf(BOT_TOKEN);

// Almacenamiento de gastos
let gastos = [];

// Servir archivos estáticos
app.use(express.static(__dirname));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API para obtener gastos
app.get('/api/gastos', (req, res) => {
  res.json(gastos);
});

// ------------------- COMANDOS DEL BOT -------------------

bot.start((ctx) => {
  ctx.reply('¡Hola! 👋 Escribe algo como: "Pan por 2.50" y lo registraré por ti.');
});

bot.help((ctx) => {
  ctx.reply(`Comandos disponibles:
📌 Escribe: "Pan por 1.50" → registrar gasto
📌 /gastos → ver todos los gastos
📌 /total → ver suma total
📌 /borrartodo → borrar todo`);
});

bot.command('gastos', (ctx) => {
  if (gastos.length === 0) {
    ctx.reply('📋 No hay gastos registrados.');
    return;
  }
  let texto = '📋 Lista de gastos:\n';
  gastos.forEach((g, i) => {
    texto += `${i + 1}. ${g.descripcion} - $${g.precio}\n`;
  });
  ctx.reply(texto);
});

bot.command('total', (ctx) => {
  const total = gastos.reduce((sum, g) => sum + parseFloat(g.precio), 0);
  ctx.reply(`💰 Total gastado: $${total.toFixed(2)}`);
});

bot.command('borrartodo', (ctx) => {
  gastos = [];
  ctx.reply('🗑️ Todos los gastos han sido borrados.');
});

// Registrar gastos con formato libre
bot.on('text', (ctx) => {
  const texto = ctx.message.text;
  
  // Ignorar comandos
  if (texto.startsWith('/')) return;

  // Buscar un número en el texto
  const coincidencia = texto.match(/(\d+[.,]?\d*)/);
  
  if (coincidencia) {
    const precio = parseFloat(coincidencia[1].replace(',', '.'));
    const descripcion = texto.replace(coincidencia[1], '').replace(/por|de|cuesta|es/g, '').trim();
    
    gastos.push({
      descripcion: descripcion || 'Sin descripción',
      precio: precio,
      fecha: new Date().toLocaleDateString('es-EC')
    });
    
    ctx.reply(`✅ Registrado: ${descripcion || 'Gasto'} - $${precio}`);
  } else {
    ctx.reply('⚠️ No detecté un precio. Ejemplo: "Pan por 1.50"');
  }
});

// Iniciar el bot
bot.launch().then(() => {
  console.log('✅ Bot de Telegram conectado correctamente');
}).catch(err => {
  console.error('❌ Error al conectar el bot:', err.message);
});

// Iniciar servidor web
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});

// Manejar cierre
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
