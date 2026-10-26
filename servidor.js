require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
const fs = require('fs');

// ✅ Token desde variable de entorno
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ ERROR: No se encontró BOT_TOKEN en las variables de entorno');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// 📁 Ruta del archivo donde se guardarán los gastos
const DATA_DIR = path.join(__dirname, 'datos');
const GASTOS_FILE = path.join(DATA_DIR, 'gastos.json');

// ✅ Crear carpeta y archivo si no existen
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(GASTOS_FILE)) {
  fs.writeFileSync(GASTOS_FILE, JSON.stringify([], null, 2));
}

// 📌 Función para leer gastos del archivo
function leerGastos() {
  try {
    const data = fs.readFileSync(GASTOS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error leyendo gastos:', err);
    return [];
  }
}

// 📌 Función para guardar gastos en el archivo
function guardarGastos(gastos) {
  try {
    fs.writeFileSync(GASTOS_FILE, JSON.stringify(gastos, null, 2));
    return true;
  } catch (err) {
    console.error('Error guardando gastos:', err);
    return false;
  }
}

// 🏷️ Función para detectar categoría automáticamente
function detectarCategoria(texto) {
  const t = texto.toLowerCase();
  
  const comida = ['pan', 'pollo', 'arroz', 'carne', 'pescado', 'huevo', 'fruta', 'verdura', 'almuerzo', 'cena', 'desayuno', 'comida', 'sopa', 'ensalada', 'hamburguesa', 'pizza'];
  const bebidas = ['agua', 'refresco', 'jugo', 'café', 'té', 'cerveza', 'gaseosa', 'leche', 'bebida'];
  const abarrotes = ['azúcar', 'sal', 'aceite', 'arroz', 'fideos', 'limpieza', 'jabón', 'papel', 'abarrotes', 'galletas', 'cereal'];
  
  if (comida.some(palabra => t.includes(palabra))) return 'Comida';
  if (bebidas.some(palabra => t.includes(palabra))) return 'Bebidas';
  if (abarrotes.some(palabra => t.includes(palabra))) return 'Abarrotes';
  return 'Otros';
}

// Inicializar el bot
const bot = new Telegraf(BOT_TOKEN);

// Servir archivos estáticos
app.use(express.static(__dirname));
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 📋 API para obtener gastos (ahora lee del archivo)
app.get('/api/gastos', (req, res) => {
  const gastos = leerGastos();
  res.json(gastos);
});

// ------------------- COMANDOS DEL BOT -------------------

bot.start((ctx) => {
  ctx.reply(`¡Hola! 👋 Bienvenido a Mi Control de Comida 🥗

¿Qué quieres hacer? Escribe una opción:

📝 Registrar: "Pan por 1.50"
📊 Ver total
📋 Ver lista
🗑️ Borrar todo`);
});

bot.help((ctx) => {
  ctx.reply(`Comandos disponibles:
📝 "Pan por 1.50" → registrar gasto
📊 "Ver total" → ver suma total
📋 "Ver lista" → ver todos los gastos
🗑️ "Borrar todo" → borrar todo`);
});

// 📊 Ver total
bot.hears(['ver total', 'cuánto gasté', 'cuanto gaste', 'total'], (ctx) => {
  const gastos = leerGastos();
  const total = gastos.reduce((sum, g) => sum + parseFloat(g.precio), 0);
  ctx.reply(`💰 Total gastado: $${total.toFixed(2)}`);
});

// 📋 Ver lista completa
bot.hears(['ver lista', 'ver todo', 'mis gastos', 'lista'], (ctx) => {
  const gastos = leerGastos();
  if (gastos.length === 0) {
    ctx.reply('📋 No hay gastos registrados.');
    return;
  }
  let texto = '📋 Lista de gastos:\n';
  gastos.forEach((g, i) => {
    texto += `${i + 1}. ${g.descripcion} - $${g.precio} (${g.categoria})\n`;
  });
  ctx.reply(texto);
});

// 🗑️ Borrar todo
bot.hears(['borrar todo', 'borrar', 'limpiar'], (ctx) => {
  if (fs.existsSync(GASTOS_FILE)) {
    fs.writeFileSync(GASTOS_FILE, JSON.stringify([], null, 2));
    ctx.reply('🗑️ Todos los gastos han sido borrados.');
  } else {
    ctx.reply('📋 No hay gastos para borrar.');
  }
});

// 📝 Registrar gastos con formato libre
bot.on('text', (ctx) => {
  const texto = ctx.message.text;
  
  // Ignorar comandos
  if (texto.startsWith('/')) return;
  if (texto.toLowerCase().includes('ver total') || 
      texto.toLowerCase().includes('cuánto gasté') || 
      texto.toLowerCase().includes('ver lista') || 
      texto.toLowerCase().includes('borrar todo')) return;

  // Buscar un número en el texto
  const coincidencia = texto.match(/(\d+[.,]?\d*)/);
  
  if (coincidencia) {
    const precio = parseFloat(coincidencia[1].replace(',', '.'));
    let descripcion = texto.replace(coincidencia[1], '')
                           .replace(/por|de|cuesta|es|la|el|un|una/g, '')
                           .trim();
    
    if (!descripcion) descripcion = 'Sin descripción';
    const categoria = detectarCategoria(descripcion);
    
    const gastos = leerGastos();
    gastos.push({
      descripcion: descripcion,
      precio: precio,
      fecha: new Date().toLocaleDateString('es-EC'),
      categoria: categoria
    });
    
    guardarGastos(gastos);
    ctx.reply(`✅ Registrado: ${descripcion} - $${precio}\n📂 Categoría: ${categoria}`);
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
