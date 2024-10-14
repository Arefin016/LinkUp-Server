const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2gatl9i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware to set Keep-Alive header
app.use((req, res, next) => {
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Keep-Alive", "timeout=5, max=1000");
  next();
});

// JWT Token Verification Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// Verify Admin Middleware
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded?.email;
  const user = await client.db("LinkUp").collection("users").findOne({ email });
  if (user?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden access" });
  }
  next();
};

// Connect to MongoDB and define APIs
async function run() {
  try {
    const db = client.db("LinkUp");
    const userCollection = db.collection("users");
    const eventsCollection = db.collection("events");
    const reviewCollection = db.collection("reviews");
    const chatCollection = db.collection("chat");

    console.log("Successfully connected to MongoDB!");

    // JWT API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // User APIs
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === "admin"
      }
      res.send({ admin })
    })
    
    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      try {
        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role: "admin" } }
        );
        res.send({ message: "User role updated to admin", result });
      } catch (error) {
        res.status(500).send({ message: "Failed to update user role", error });
      }
    });

    // Set user as admin by email
    app.patch("/users/admin/:email", verifyToken, verifyAdmin, async (req, res) => {
      const { email } = req.body;
      try {
        const result = await userCollection.updateOne(
          { email },
          { $set: { role: "admin" } }
        );
        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "User not found or already an admin" });
        }
        res.send({ message: "User role updated to admin", result });
      } catch (error) {
        res.status(500).send({ message: "Failed to update user role", error });
      }
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Event APIs
    app.post("/add-event", async (req, res) => {
      const event = req.body;
      const result = await eventsCollection.insertOne(event);
      res.status(201).send(result);
    });

    app.get("/events", async (req, res) => {
      const events = await eventsCollection.find().toArray();
      res.send(events);
    });

    app.put("/events/:id", async (req, res) => {
      const id = req.params.id;
      const event = req.body;
      const result = await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: event }
      );
      res.send(result);
    });

    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;
      const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Review APIs
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const reviews = await reviewCollection.find().toArray();
      res.send(reviews);
    });

    // Chat APIs
    app.post("/chat", async (req, res) => {
      const chatMessage = req.body;
      const result = await chatCollection.insertOne(chatMessage);
      res.send(result);
    });

    app.get("/chat", async (req, res) => {
      const chatMessages = await chatCollection.find().toArray();
      res.send(chatMessages);
    });

  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}
run().catch(console.dir);

// Default route
app.get("/", (req, res) => {
  res.send("LinkUp Backend is running");
});

// Socket.IO Setup for Chat
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("New client connected");

  // Emit existing chat messages to newly connected client
  chatCollection.find().toArray().then((chatMessages) => {
    socket.emit("loadMessages", chatMessages);
  });

  // Listen for new chat messages
  socket.on("sendMessage", async (message) => {
    const newMessage = {
      sender: message.sender,
      text: message.text,
      timestamp: new Date(),
    };
    await chatCollection.insertOne(newMessage);
    io.emit("newMessage", newMessage); 
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start the server
server.listen(port, () => {
  console.log(`LinkUp Backend is running on port ${port}`);
});

// Server Keep-Alive settings
server.keepAliveTimeout = 5000;
server.headersTimeout = 10000;

