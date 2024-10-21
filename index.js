const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const http = require("http");

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
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
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

  if (!user) {
    console.log(`User with email ${email} not found`);
    return res.status(404).send({ message: "User not found" });
  }

  if (user?.role !== "admin") {
    console.log(`User with email ${email} is not an admin`);
    return res.status(403).send({ message: "Forbidden access - Not an admin" });
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

    console.log("Successfully connected to MongoDB!");

    // JWT API
    app.post("/jwt", async (req, res) => {
      const user = req.body; // Ensure this contains the necessary user info
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
      res.send({ token });
  });

    // User APIs
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      try {
        const result = await userCollection.insertOne(newUser);
        res.status(201).send({ message: "User created successfully", result });
      } catch (error) {
        console.error("Failed to create user:", error);
        res.status(500).send({ message: "Failed to create user", error });
      }
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      // Check if email in token matches the requested email
      if (email !== req.decoded.email) {
        console.log(
          `Token email (${req.decoded.email}) does not match requested email (${email})`
        );
        return res
          .status(403)
          .send({ message: "Forbidden access - Email mismatch" });
      }

      const user = await userCollection.findOne({ email });
      if (!user) {
        console.log(`User with email ${email} not found`);
        return res.status(404).send({ message: "User not found" });
      }

      res.send({ admin: user?.role === "admin" });
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        try {
          const result = await userCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { role: "admin" } }
          );
          res.send({ message: "User role updated to admin", result });
        } catch (error) {
          console.error("Failed to update user role:", error);
          res
            .status(500)
            .send({ message: "Failed to update user role", error });
        }
      }
    );

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
      const result = await eventsCollection.deleteOne({
        _id: new ObjectId(id),
      });
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
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}
run().catch(console.dir);

// Default route
app.get("/", (req, res) => {
  res.send("LinkUp Backend is running");
});

// Create and start the HTTP server
const server = http.createServer(app);
server.listen(port, () => {
  console.log(`LinkUp Backend is running on port ${port}`);
});

// Server Keep-Alive settings
server.keepAliveTimeout = 5000;
server.headersTimeout = 10000;

