const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;

// Apply CORS middleware
app.use(cors());

// Middleware for parsing JSON
app.use(express.json());

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2gatl9i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT token generation route
app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: 3600000 });
  res.send({ token });
});

// JWT middleware for authorization
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// Ping the server to prevent it from going idle
setInterval(() => {
  fetch("https://link-up-server-xi.vercel.app")
    .then((res) => console.log("Pinged the server to keep alive."))
    .catch((error) => console.error("Ping error:", error));
}, 300000); // Ping every 5 minutes (300,000 ms)

async function run() {
  try {
    await client.connect();
    const usersCollection = client.db("LinkUp").collection("users");
    const eventsCollection = client.db("LinkUp").collection("events");

    console.log("Successfully connected to MongoDB!");

    // POST: Add new user
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // GET: Fetch all users
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // GET: Fetch user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // PATCH: Update user information by email
    app.patch('/users/:email', verifyToken, async (req, res) => {
      const data = req.body;
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          address: data.address,
          contact_email: data.contact_email,
          organization_name: data.organization_name,
          phone: data.phone,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // POST: Add new event
    app.post('/events', async (req, res) => {
      const event = req.body;
      const result = await eventsCollection.insertOne(event);
      res.send(result);
    });

    // GET: Fetch all events
    app.get('/events', async (req, res) => {
      const result = await eventsCollection.find().toArray();
      res.send(result);
    });

    // GET: Fetch event by ID
    app.get('/events/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.findOne(query);
      res.send(result);
    });

    // PATCH: Update event by ID
    app.patch('/events/:id', verifyToken, async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          event_name: data.event_name,
          date: data.date,
          location: data.location,
          description: data.description,
        },
      };
      const result = await eventsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // DELETE: Remove event by ID
    app.delete('/events/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.deleteOne(query);
      res.send(result);
    });
  } catch (error) {
    console.error("Error running the server:", error);
  }
}

run().catch(console.dir);

// Root endpoint
app.get("/", (req, res) => {
  res.send("LinkUp Backend is running");
});

// Start server
app.listen(port, () => {
  console.log(`LinkUp Backend is running on port ${port}`);
});
