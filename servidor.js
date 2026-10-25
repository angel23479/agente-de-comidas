const express = require('express');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

process.env.TELEGRAM_TOKEN = '8864269084:AAH97oN0y-8m9_UCyyZCavojuqO3ALSP2T4';

const app = express();
const PORT = 3000;

// Carpeta y archivos de datos
const carpetaDatos = path.join(__dirname, 'datos');
if (!fs.existsSync(carpetaDatos)) fs.mkdirSync(carpetaDatos);

const archivoGastos = path.join(carpetaDatos, 'gastos.json');
const archivoStock = path.join(carpetaDatos, 'stock.json');

// Función para leer datos
function leerDatos(ruta) {
  try {
    if (!fs.existsSync(ruta)) return [];
    const contenido = fs.readFileSync(ruta, 'utf8');
    return contenido ? JSON.parse(contenido) : [];
  } catch {
    return [];
  }
}

// Función para guardar datos
function guardarDatos(ruta, datos) {
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2));
}

// Iniciar bot
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Middleware para leer JSON
app.use(express.json());

// Servir archivos estáticos (tu página web)
app.use(express.static(__dirname));

// 🌐 Ruta para ver los gastos en la web
app.get('/api/gastos', (req, res) => {
  const gastos = leerDatos(archivoGastos);
  res.json(gastos);
});

// Mensaje de bienvenida
bot.start((ctx) => {
  ctx.reply(
    '👋 ¡Hola! Bienvenido a tu Control de Gastos 💸\n\n' +
    'Comandos disponibles:\n' +
    '• Nombre y precio (ej: arroz 2.50)\n' +
    '• ¿Cuánto gasté?\n' +
    '• Ver todo\n' +
    '• buscar palabra\n' +
    '• borrar descripción\n' +
    '• Borrar todo'
  );
});

// Registrar - más flexible
bot.hears(/^(registrar|registra)?\s*(.+?)\s*(por|de|a)?\s+([\d.]+)$/i, (ctx) => {
  const descripcion = ctx.match[2].trim();
  const precio = parseFloat(ctx.match[4]);
  
  const gastos = leerDatos(archivoGastos);
  gastos.push({
    descripcion: descripcion,
    precio: precio,
    fecha: new Date().toLocaleString('es-EC')
  });
  guardarDatos(archivoGastos, gastos);
  
  ctx.reply(`✅ Registrado:\n📌 ${descripcion}\n💰 $${precio}\n📅 ${new Date().toLocaleString('es-EC')}`);
});

// Ver total de gastos
bot.hears(/cuánto gasté|cuanto gaste/i, (ctx) => {
  const gastos = leerDatos(archivoGastos);
  if (gastos.length === 0) {
    return ctx.reply('📋 No hay gastos registrados todavía.');
  }
  const total = gastos.reduce((sum, g) => sum + parseFloat(g.precio), 0);
  ctx.reply(`💰 Has gastado en total: $${total.toFixed(2)}`);
});

// Ver todos los registros
bot.hears(/ver todo/i, (ctx) => {
  const gastos = leerDatos(archivoGastos);
  if (gastos.length === 0) {
    return ctx.reply('📋 No hay nada registrado todavía.');
  }
  
  let mensaje = '📋 TODOS tus registros:\n\n';
  gastos.forEach((item, i) => {
    mensaje += `${i + 1}. ${item.descripcion} — $${item.precio}\n`;
  });
  const total = gastos.reduce((sum, g) => sum + parseFloat(g.precio), 0);
  mensaje += `\n💰 TOTAL: $${total.toFixed(2)}`;
  
  ctx.reply(mensaje);
});

// Buscar algo
bot.hears(/buscar (.+)/i, (ctx) => {
  const palabra = ctx.match[1].trim().toLowerCase();
  const gastos = leerDatos(archivoGastos);
  const encontrados = gastos.filter(item => 
    item.descripcion.toLowerCase().includes(palabra)
  );
  
  if (encontrados.length === 0) {
    ctx.reply(`🔍 No encontré nada con "${palabra}"`);
  } else {
    let mensaje = `🔍 Resultados para "${palabra}":\n\n`;
    encontrados.forEach((item, i) => {
      mensaje += `${i + 1}. ${item.descripcion} — $${item.precio}\n`;
    });
    ctx.reply(mensaje);
  }
});

// Borrar todo
bot.hears(/^borrar todo$/i, (ctx) => {
  guardarDatos(archivoGastos, []);
  guardarDatos(archivoStock, []);
  ctx.reply('🗑️ ¡Todo ha sido borrado correctamente!');
});

// Borrar algo específico
bot.hears(/^borrar (.+)/i, (ctx) => {
  const descripcion = ctx.match[1].trim().toLowerCase();
  
  if (descripcion === 'todo') return;
  
  let gastos = leerDatos(archivoGastos);
  const cantidadAntes = gastos.length;
  
  gastos = gastos.filter(item => 
    item.descripcion.toLowerCase() !== descripcion
  );
  
  if (gastos.length === cantidadAntes) {
    ctx.reply(`❌ No encontré "${descripcion}" para borrar.`);
  } else {
    guardarDatos(archivoGastos, gastos);
    ctx.reply(`🗑️ Borrado: "${descripcion}"`);
  }
});

// ⚠️ Mensaje para lo que NO entienda
bot.on('text', (ctx) => {
  ctx.reply(
    '🤔 No estoy seguro de qué necesitas.\n' +
    'Intenta así:\n' +
    '• "arroz 2.50" → registrar gasto\n' +
    '• "¿Cuánto gasté?" → ver total\n' +
    '• "Ver todo" → ver lista completa'
  );
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
});

// 🚀 Iniciar bot con reconexión automática
async function iniciarBot() {
  try {
    await bot.launch();
    console.log('🤖 Bot de Telegram activo');
  } catch (err) {
    console.log('⚠️ Reconectando en 5 segundos...', err.message);
    setTimeout(iniciarBot, 5000);
  }
}

iniciarBot();

// Manejar errores del bot
bot.catch((err, ctx) => {
  console.log(`❌ Error:`, err.message);
});

// Cerrar correctamente
process.once('SIGINT', () => {
  if (bot) bot.stop('SIGINT');
  process.exit();
});
process.once('SIGTERM', () => {
  if (bot) bot.stop('SIGTERM');
  process.exit();
});
//arranacar el servidor  node servidor.js 
// iniciar 
// en telegram /start
//http://localhost:3000  index.html