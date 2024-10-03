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

// JWT Middleware for Authorization
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

// Set interval to ping the server every 5 minutes to prevent it from going idle
setInterval(() => {
  fetch("https://your-server-url.com")
    .then((res) => console.log("Pinged the server to keep alive."))
    .catch((error) => console.error("Ping error:", error));
}, 300000); // ping every 5 minutes (300,000 ms)

async function run() {
  try {
    await client.connect();
    const userCollection = client.db("LinkUp").collection("users");
    const eventsCollection = client.db("LinkUp").collection("events");

    console.log("Successfully connected to MongoDB!");

    // POST: Add new user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // POST: Add new event
    app.post("/events", async (req, res) => {
      const newEvent = req.body;
      try {
        const result = await eventsCollection.insertOne(newEvent);
        res.status(201).send({
          success: true,
          message: "Event added successfully!",
          result,
        });
      } catch (error) {
        console.error("Error inserting event:", error);
        res.status(500).send({ success: false, message: "Failed to add event." });
      }
    });

    // GET: Fetch all events
    app.get("/events", async (req, res) => {
      try {
        const events = await eventsCollection.find().toArray();
        res.status(200).send(events);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch events.",
        });
      }
    });

    // GET: Fetch event by ID
    app.get("/events/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
        if (event) {
          res.send(event);
        } else {
          res.status(404).send({ success: false, message: "Event not found" });
        }
      } catch (error) {
        console.error("Error fetching event by ID:", error);
        res.status(500).send({ success: false, message: "Failed to fetch event by ID." });
      }
    });

    // PUT: Update event by ID
    app.put("/events/:id", async (req, res) => {
      const { id } = req.params;
      const updatedEvent = req.body;

      try {
        const result = await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedEvent }
        );
        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Event updated successfully" });
        } else {
          res.status(404).send({ success: false, message: "Event not found or not updated" });
        }
      } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).send({ success: false, message: "Failed to update event" });
      }
    });

    // DELETE: Cancel (Delete) an event by its ID
    app.delete("/events/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          res.send({ success: true, message: "Event canceled successfully" });
        } else {
          res.status(404).send({ success: false, message: "Event not found or already deleted" });
        }
      } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).send({ success: false, message: "Failed to cancel event" });
      }
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
