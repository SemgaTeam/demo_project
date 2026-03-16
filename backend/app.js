const bcrypt = require("bcrypt");
const express = require("express");
const { Client } = require("pg");
const cors = require("cors");
const app = express();
const port = 5500;
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
require("dotenv").config();

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "basedata",
  password: "321",
  port: 5432,
});

client.connect();

app.use(express.json());

app.use(express.static("public"));

app.use(cors());
//TODO: unique не работает, в базе данных все равно сохраняются одинаковые значения
const createUserTable = async () => {
  const query = `
  CREATE TABLE IF NOT EXISTS users (
      username TEXT UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL);`;
  await client.query(query);
};

const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contents VARCHAR(100) NOT NULL,
        count_likes INT DEFAULT 0
        );`;
  await client.query(query);
};
const createPost = async (name, contents, count_likes) => {
  const query =
    "INSERT INTO posts (name, contents, count_likes) VALUES ($1, $2, $3) RETURNING *";
  const values = [name, contents, count_likes];
  const res = await client.query(query, values);
  return res;
};
const readPost = async () => {
  const query = "SELECT * FROM posts";
  const res = await client.query(query);
  return res;
};
const updatePost = async (id, name, contents, count_likes) => {
  const query =
    "UPDATE posts SET name = $1, contents = $2, count_likes = $4 WHERE id = $3 RETURNING *";
  const values = [id, name, contents, count_likes];
  const res = await client.query(query);
  return res;
};
const deletePost = async (id) => {
  const query = "DELETE FROM posts WHERE id = $1 RETURNING *";
  const values = [id];

  const res = await client.query(query, values);
  return res;
};
//TODO: не возвращает false!!!
const findByUsername = async (user) => {
  const query = "SELECT * FROM users WHERE username = $1;";
  const values = [user];
  const result = await client.query(query, values);
  console.log(result.rows.length);
  if (result.rows.length > 0) {
    return false;
  }
};
const run = async () => {
  await createTable();
  await createUserTable();
};

run();

const createUser = async (user, password) => {
  console.log(user);
  const query =
    "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *";
  const values = [user, password];
  const res = await client.query(query, values);
  return res;
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    console.log(process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).send("Где твой токен, балбес?");
    }
    const token = authHeader.split(" ")[1];
    const result = verifyToken(token);
    req.user = result.decoded;
    next();
  } catch (error) {
    res.status(401).send("Чето по пизде пошло");
  }
};

const generateToken = (user) => {
  console.log(process.env.JWT_SECRET);
  const payload = {
    name: user,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  console.log(token);
  return token;
};

app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
app.post("/posts", authMiddleware, async (req, res) => {
  const { name, contents, count_likes } = req.body;
  result = await createPost(name, contents, count_likes);
  res.status(201).json(result.rows[0]);
});
app.get("/posts", async (req, res) => {
  result = await readPost();
  res.json(result.rows);
});
app.put("/posts/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, contents, count_likes } = req.body;
  result = await updatePost(id);
  res.json(res.rows[0]);
});
app.delete("/posts/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  await deletePost(id);
  res.json(res.rows[0]);
});
const hashedPassword = async (password) => {
  const saltRounds = 10;
  const hashPassword = await bcrypt.hash(password, saltRounds);
  return hashPassword;
};
app.post("/registration", async (req, res) => {
  try {
    const { user, password } = req.body;
    const validUser = findByUsername(user);
    console.log(validUser);
    if (validUser === false) {
      res.status(400).send("Пользователь с таким именем уже существует!");
    }
    const hashPassword = await hashedPassword(password);
    createUser(user, hashPassword);
    const token = generateToken(user);
    res.status(201).json({ token: token });
  } catch (error) {
    res.status(500).send(error.toString());
  }
});
app.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body;
    const query = "SELECT * FROM users WHERE username = $1";
    const values = [user];
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      res.status(401).send("Не родной, ты давай зарегайся для начала");
    }
    const User = result.rows[0];
    const isValid = await bcrypt.compare(password, User.password);
    if (!isValid) {
      res
        .status(401)
        .send(
          "Не родной, ты еще брудфорсить попробуй, дурачина, я всю ночь сидел, даже не вайбкодил, чтобы написать авторизацию. хер тебе. вводи нормальный пароль или иди куда подальше",
        );
    }
    const token = generateToken(user);
    res.status(201).json({ token: token });
  } catch (error) {
    res.status(401).send(error.toString());
  }
});

app.listen(port, () => {
  console.log(`server running on http://localhost:${port}`);
});
