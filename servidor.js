require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});

// Inicializar bot de Telegram
const bot = new Telegraf(process.env.BOT_TOKEN);

// Comandos del bot
bot.start((ctx) => {
    ctx.reply('👋 ¡Bienvenido a tu Control de Gastos! 💸\n\nEscribe algo como:\n"Pan por 1.50"\n"Arroz 3.00"\n\nO prueba:\n📊 ¿Cuánto gasté?\n📋 Ver todo\n🗑️ Borrar todo');
});

// Registrar gastos
bot.on('text', (ctx) => {
    const texto = ctx.message.text;
    
    // Comandos especiales
    if (texto.includes('Borrar todo') || texto.includes('borrar todo')) {
        gastos = [];
        ctx.reply('🗑️ ¡Todos los gastos han sido eliminados! ✅');
        return;
    }
    
    if (texto.includes('cuánto gasté') || texto.includes('total') || texto.includes('cuanto gaste')) {
        if (gastos.length === 0) {
            ctx.reply('📭 Aún no has registrado gastos');
            return;
        }
        const total = gastos.reduce((sum, g) => sum + parseFloat(g.precio), 0);
        ctx.reply(`💰 Total gastado: $${total.toFixed(2)}\n📋 Gastos: ${gastos.length}`);
        return;
    }
    
    if (texto.includes('ver todo') || texto.includes('lista')) {
        if (gastos.length === 0) {
            ctx.reply('📭 Aún no hay gastos registrados');
            return;
        }
        let mensaje = '📋 Lista de gastos:\n';
        gastos.forEach((g, i) => {
            mensaje += `${i + 1}. ${g.nombre} - $${g.precio}\n`;
        });
        ctx.reply(mensaje);
        return;
    }
    
    // Registrar nuevo gasto
    let nombre = '';
    let precio = 0;
    
    const porPalabras = texto.split(/por|de|cuesta:/i);
    if (porPalabras.length >= 2) {
        nombre = porPalabras[0].trim();
        const num = porPalabras[1].match(/[\d.]+/);
        if (num) precio = parseFloat(num[0]);
    } else {
        const soloNum = texto.match(/[\d.]+/);
        if (soloNum) {
            precio = parseFloat(soloNum[0]);
            nombre = texto.replace(soloNum[0], '').trim();
        }
    }
    
    if (nombre && precio > 0) {
        const nuevo = {
            id: Date.now(),
            nombre: nombre,
            precio: precio,
            fecha: new Date().toISOString()
        };
        gastos.push(nuevo);
        ctx.reply(`✅ ¡Registrado!\n${nombre} — $${precio.toFixed(2)}\n💰 Total: $${gastos.reduce((s,g)=>s+parseFloat(g.precio),0).toFixed(2)}`);
    } else {
        ctx.reply('🤔 No entendí bien. Intenta así:\n"Pan por 1.50"\n"Leche 2.00"');
    }
});

// Manejar errores del bot
bot.catch((err, ctx) => {
    console.log('❌ Error del bot:', err.message);
});

// Función de reconexión automática
async function iniciarBot() {
    try {
        await bot.launch();
        console.log('🤖 Bot de Telegram activo');
    } catch (err) {
        console.log('⏳ Reintentando en 5 segundos...', err.message);
        setTimeout(iniciarBot, 5000);
    }
}

iniciarBot();
