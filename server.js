// 1. Importar las librerías necesarias
const express = require('express');
const { MongoClient } = require('mongodb');

// 2. Configuración
const app = express();
const PORT = 3000;

const MONGO_URI = "mongodb+srv://Salinas_user:rAndop-zujwuq-0ranbu@rutabus.qdwcba8.mongodb.net/?retryWrites=true&w=majority&appName=Rutabus;"
const DB_NAME = "rutabus_db";

let db;

// 3. Conexión a la Base de Datos
async function connectToDb() {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log(`Conectado exitosamente a la base de datos: ${DB_NAME}`);
    } catch (error) {
        console.error("Error al conectar a MongoDB:", error);
        process.exit(1);
    }
}

// Middlewares
app.use(express.json());
app.use(express.static(__dirname));

// 4. Ruta de login (API endpoint)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!db) { return res.status(500).json({ success: false, message: "Error interno: No hay conexión a la base de datos." }); }
    try {
        const usuario = await db.collection('usuarios').findOne({ email: email });
        if (!usuario) { return res.status(404).json({ success: false, message: "Email no registrado." }); }
        if (usuario.password !== password) { return res.status(401).json({ success: false, message: "Contraseña incorrecta." }); }
        res.json({
            success: true,
            message: `¡Bienvenido, ${usuario.nombre}!`,
            redirectUrl: '/index.html',
            user: { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
        });
    } catch (error) {
        console.error("Error durante el login:", error);
        res.status(500).json({ success: false, message: "Ocurrió un error en el servidor." });
    }
});

// 5. NUEVA RUTA DE REGISTRO (API endpoint)
app.post('/api/register', async (req, res) => {
    if (!db) {
        return res.status(500).json({ success: false, message: "Error interno: No hay conexión a la base de datos." });
    }
    try {
        const { nombre, email, password } = req.body;
        const coleccionUsuarios = db.collection('usuarios');

        // Verificar si el correo ya existe
        const usuarioExistente = await coleccionUsuarios.findOne({ email: email });
        if (usuarioExistente) {
            return res.status(400).json({ success: false, message: "Este correo electrónico ya está registrado." });
        }

        // Crear el nuevo usuario (solo con rol 'usuario')
        const nuevoUsuario = {
            nombre: nombre,
            email: email,
            password: password, // En un proyecto real, esto debería estar encriptado
            rol: 'usuario'
        };

        // Insertar el nuevo usuario en la base de datos
        await coleccionUsuarios.insertOne(nuevoUsuario);

        res.status(201).json({ success: true, message: "¡Registro exitoso! Serás redirigido para iniciar sesión." });

    } catch (error) {
        console.error("Error durante el registro:", error);
        res.status(500).json({ success: false, message: "Ocurrió un error en el servidor." });
    }
});


// 6. Iniciar el servidor y la conexión a la BD
app.listen(PORT, () => {
    console.log(`Servidor de Rutabus corriendo en http://localhost:${PORT}`);
    connectToDb();
});

