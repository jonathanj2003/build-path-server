require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")

const express = require("express");
const cors= require("cors"); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/hello", (req, res) => {
    res.json({ message: "Hello from your own server, Jonathan!"});
});

app.get("/api/greet/:name", (req, res) => {
    res.json({ message: `Hello, ${req.params.name}! This came from your server.` });
});

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

app.get("/api/notes", async (req, res) => {
  const notes = await prisma.note.findMany();
  res.json(notes);
});

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ 
    data: { email, password: hashedPassword },
  });
  res.json({ success: true, userId: user.id });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/api/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  res.json({ email: user.email });
});

app.post("/api/notes", async (req, res) => {
  const note = await prisma.note.create({
    data: { text: req.body.text },
  });
  res.json(note);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});