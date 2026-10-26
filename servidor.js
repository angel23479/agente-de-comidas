require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');
const fs = require('fs');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ ERROR: No se encontró BOT_TOKEN');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// 📁 Carpeta y archivo de datos
const DATA_DIR = path.join(__dirname, 'datos');
const GASTOS_FILE = path.join(DATA_DIR, 'gastos.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(GASTOS_FILE)) fs.writeFileSync(GASTOS_FILE, JSON.stringify([], null, 2));

// 📌 Leer y guardar gastos
function leerGastos() {
  try { return JSON.parse(fs.readFileSync(GASTOS_FILE, 'utf8')); }
  catch { return []; }
}

function guardarGastos(gastos) {
  fs.writeFileSync(GASTOS_FILE, JSON.stringify(gastos, null, 2));
}

// 🏷️ Detectar categoría
function detectarCategoria(texto) {
  const t = texto.toLowerCase();
  const comida = ['pan','pollo','arroz','carne','pescado','huevo','fruta','verdura','almuerzo','cena','desayuno','comida','sopa','ensalada','hamburguesa','pizza'];
  const bebidas = ['agua','refresco','jugo','café','té','gaseosa','leche','bebida'];
  const abarrotes = ['azúcar','sal','aceite','fideos','limpieza','jabón','papel','abarrotes','galletas','cereal'];
  
  if (comida.some(p => t.includes(p))) return 'comida';
  if (bebidas.some(p => t.includes(p))) return 'bebidas';
  if (abarrotes.some(p => t.includes(p))) return 'abarrotes';
  return 'otros';
}

// Iniciar bot
const bot = new Telegraf(BOT_TOKEN);

// Servir archivos estáticos
app.use(express.static(__dirname));
app.use(express.json());

// Rutas
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/api/gastos', (req, res) => res.json(leerGastos()));

// 🤖 Comandos del bot
bot.start((ctx) => {
  ctx.reply(`¡Hola! 👋 Bienvenido a Mi Control de Comida 🥗

Escribe algo como: "Pan por 1.50"

O di:
📊 "Ver total"
📋 "Ver lista"
🗑️ "Borrar todo"`);
});

bot.hears(['ver total', 'cuánto gasté', 'cuanto gaste', 'total'], (ctx) => {
  const gastos = leerGastos();
  const total = gastos.reduce((s, g) => s + parseFloat(g.precio), 0);
  ctx.reply(`💰 Total gastado: $${total.toFixed(2)}`);
});

bot.hears(['ver lista', 'ver todo', 'mis gastos', 'lista'], (ctx) => {
  const gastos = leerGastos();
  if (gastos.length === 0) return ctx.reply('📋 No hay gastos registrados.');
  let texto = '📋 Lista de gastos:\n';
  gastos.forEach((g, i) => texto += `${i + 1}. ${g.descripcion} - $${g.precio}\n`);
  ctx.reply(texto);
});

bot.hears(['borrar todo', 'borrar', 'limpiar'], (ctx) => {
  guardarGastos([]);
  ctx.reply('🗑️ Todos los gastos han sido borrados.');
});

bot.on('text', (ctx) => {
  const texto = ctx.message.text;
  const tMinus = texto.toLowerCase();
  
  if (texto.startsWith('/')) return;
  if (tMinus.includes('ver total') || tMinus.includes('ver lista') || tMinus.includes('borrar todo')) return;

  const coincidencia = texto.match(/(\d+[.,]?\d*)/);
  if (coincidencia) {
    const precio = parseFloat(coincidencia[1].replace(',', '.'));
    let descripcion = texto.replace(coincidencia[1], '').replace(/por|de|cuesta|la|el|un|una/g, '').trim();
    if (!descripcion) descripcion = 'Sin descripción';
    const categoria = detectarCategoria(descripcion);
    
    const gastos = leerGastos();
    gastos.push({ descripcion, precio, fecha: new Date().toLocaleDateString('es-EC'), categoria });
    guardarGastos(gastos);
    
    ctx.reply(`✅ Registrado: ${descripcion} - $${precio}\n📂 Categoría: ${categoria}`);
  } else {
    ctx.reply('⚠️ No detecté un precio. Ejemplo: "Pan por 1.50"');
  }
});

// Iniciar todo
bot.launch().then(() => console.log('✅ Bot conectado'));
app.listen(PORT, () => console.log(`✅ Servidor en puerto ${PORT}`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
