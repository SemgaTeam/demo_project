const express = require("express");
const { Client } = require("pg");
const cors = require("cors");
const app = express();
const port = 5500;

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
  //console.log("Post created", result.rows[0]);
};
const readPost = async () => {
  const query = "SELECT * FROM posts";
  const res = await client.query(query);
  return res;
  //console.log("Posts:", res.rows);
};
const updatePost = async (id, name, contents, count_likes) => {
  const query =
    "UPDATE posts SET name = $1, contents = $2, count_likes = $4 WHERE id = $3 RETURNING *";
  const res = await client.query(query);
  return res;
  //console.log("Post updated:", res.rows[0]);
};
const deletePost = async (id) => {
  const query = "DELETE FROM posts WHERE id = $1 RETURNING *";
  const values = [id];

  const res = await client.query(query, values);
  return res;
  //console.log("Post deleted:", res.rows[0]);
};
const run = async () => {
  await createTable();
  //await createPost("Миша о базе данных", "База данных это круто!", 0);
  await readPost();
};

//run();

app.get("/", async (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
app.post("/posts", async (req, res) => {
  const { name, contents, count_likes } = req.body;
  result = await createPost(name, contents, count_likes);
  res.status(201).json(result.rows[0]);
});
app.get("/posts", async (req, res) => {
  //await readPost();
  result = await readPost();
  res.json(result.rows);
});
app.put("/posts/:id", async (req, res) => {
  const { id } = req.params;
  const { name, contents, count_likes } = req.body;
  result = await updatePost(id);
  res.json(res.rows[0]);
});
app.delete("/posts/:id", async (req, res) => {
  const { id } = req.params;
  await deletePost(id);
  res.json(res.rows[0]);
});
app.listen(port, () => {
  console.log(`server running on http://localhost:${port}`);
});
