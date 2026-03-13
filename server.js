const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Для раздачи статики (html)

// Имитация Базы Данных
let users = [
    { id: 1, name: "Neo", email: "neo@matrix.com", role: "admin" },
    { id: 2, name: "Trinity", email: "trinity@matrix.com", role: "user" }
];
let authToken = null;

// Настройка загрузки файлов
const upload = multer({ dest: 'uploads/' });

// --- HTML СТРАНИЦА (Документация) ---
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <title>Postman Test API</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #1e1e2e; color: #cdd6f4; padding: 2rem; }
            h1 { color: #f38ba8; }
            .card { background: #313244; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; border-left: 5px solid #89b4fa; }
            code { background: #11111b; padding: 2px 6px; border-radius: 4px; color: #a6e3a1; }
            .method { font-weight: bold; display: inline-block; width: 60px; }
            .get { color: #89b4fa; } .post { color: #a6e3a1; } .put { color: #fab387; } .del { color: #f38ba8; }
        </style>
    </head>
    <body>
        <h1>🚀 Super API для Postman</h1>
        <p>Используй эти адреса в Postman для тестирования.</p>
        
        <div class="card">
            <h3>1. Получить всех пользователей</h3>
            <span class="method get">GET</span> <code>/api/users</code>
        </div>

        <div class="card">
            <h3>2. Создать пользователя (Валидация)</h3>
            <span class="method post">POST</span> <code>/api/users</code>
            <br><small>Body (JSON): <code>{ "name": "Morpheus", "email": "m@matrix.com" }</code></small>
        </div>

        <div class="card">
            <h3>3. Получить пользователя по ID (Ошибки 404)</h3>
            <span class="method get">GET</span> <code>/api/users/:id</code>
            <br><small>Попробуй id: 1 (OK) или 999 (Not Found)</small>
        </div>

        <div class="card">
            <h3>4. Логин (Получение токена)</h3>
            <span class="method post">POST</span> <code>/api/login</code>
            <br><small>Body: <code>{ "username": "admin", "password": "123" }</code></small>
        </div>

        <div class="card">
            <h3>5. Защищенный роут (Нужен токен)</h3>
            <span class="method get">GET</span> <code>/api/secret-data</code>
            <br><small>Header: <code>Authorization: Bearer ВАШ_ТОКЕН</code></small>
        </div>

        <div class="card">
            <h3>6. Загрузка файла</h3>
            <span class="method post">POST</span> <code>/api/upload</code>
            <br><small>Body (form-data): key=<code>file</code>, value=(выбери файл)</small>
        </div>

        <div class="card" style="border-left-color: #f38ba8;">
            <h3>7. Сломать сервер (Ошибка 500)</h3>
            <span class="method get">GET</span> <code>/api/crash</code>
        </div>
        
        <div class="card" style="border-left-color: #fab387;">
            <h3>8. Медленный ответ (Тест таймаута)</h3>
            <span class="method get">GET</span> <code>/api/slow</code>
            <br><small>Ответ придет через 5 секунд</small>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// --- API ENDPOINTS ---

// 1. Получить всех
app.get('/api/users', (req, res) => {
    res.json({ success: true, count: users.length, data: users });
});

// 2. Создать пользователя (с валидацией)
app.post('/api/users', (req, res) => {
    const { name, email } = req.body;

    // Имитация ошибки валидации
    if (!name || !email) {
        return res.status(400).json({ 
            success: false, 
            error: "Bad Request", 
            message: "Поля 'name' и 'email' обязательны!" 
        });
    }

    const newUser = {
        id: users.length + 1,
        name,
        email,
        role: "user"
    };
    users.push(newUser);
    res.status(201).json({ success: true, message: "User created", data: newUser });
});

// 3. Получить по ID (с ошибкой 404)
app.get('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id == req.params.id);
    if (!user) {
        return res.status(404).json({ success: false, error: "Not Found", message: "Пользователь с таким ID не найден в матрице." });
    }
    res.json({ success: true, data: user });
});

// 4. Логин
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123') {
        authToken = "super_secret_token_12345";
        res.json({ success: true, token: authToken, message: "Добро пожаловать, Нео." });
    } else {
        res.status(401).json({ success: false, error: "Unauthorized", message: "Неверный логин или пароль" });
    }
});

// 5. Защищенный роут
app.get('/api/secret-data', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token !== authToken) {
        return res.status(403).json({ success: false, error: "Forbidden", message: "Доступ запрещен. Предъявите токен." });
    }
    res.json({ success: true, data: { secret: "Код доступа к ядерным ракетам: 0000" } });
});

// 6. Загрузка файла
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Файл не найден" });
    }
    res.json({ 
        success: true, 
        message: "Файл загружен успешно", 
        filename: req.file.filename,
        size: req.file.size 
    });
});

// 7. Ошибка сервера (500)
app.get('/api/crash', (req, res) => {
    try {
        // Эмуляция непредвиденной ошибки
        throw new Error("Database connection lost!");
    } catch (e) {
        res.status(500).json({ success: false, error: "Internal Server Error", message: e.message });
    }
});

// 8. Медленный ответ
app.get('/api/slow', (req, res) => {
    console.log("Запрос получен, ждем 5 секунд...");
    setTimeout(() => {
        res.json({ success: true, message: "Я проснулся! Прошло 5 секунд." });
    }, 5000);
});

// Запуск
app.listen(PORT, () => {
    console.log(`🔥 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📬 Открой этот адрес в браузере, чтобы увидеть документацию API`);
});
