const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: ['https://linkup-client-21d2b.web.app', 'http://localhost:5173'],
  optionsSuccessStatus: 200, // For legacy browser support
  credentials: true, // Enable cookies and other credentials
};

app.use(cors(corsOptions)); // Apply CORS with options
app.use(express.json()); // Middleware to parse JSON

// MongoDB Connection URI (Ensure that DB_USER and DB_PASS environment variables are correctly set)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient instance with proper options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Function to run MongoDB connection
async function run() {
  try {
    // Connect to the MongoDB cluster
    await client.connect(); // Ensure the connection is established
    console.log("Successfully connected to MongoDB!");

    // Access collections from MongoDB
    const userCollection = client.db("LinkUp").collection("users");
    const eventsCollection = client.db("LinkUp").collection("events");

    // Route: Add a new user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      try {
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).send({
          success: false,
          message: "Failed to add user",
          error: error.message,
        });
      }
    });

    // Route: Add a new event
    app.post("/add-event", async (req, res) => {
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
        res.status(500).send({
          success: false,
          message: "Failed to add event.",
          error: error.message,
        });
      }
    });

    // Route: Fetch all events
    app.get("/events", async (req, res) => {
      try {
        const events = await eventsCollection.find().toArray();
        res.status(200).send(events);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch events.",
          error: error.message,
        });
      }
    });

    // Route: Update an event by its ID
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
        res.status(500).send({
          success: false,
          message: "Failed to update event",
          error: error.message,
        });
      }
    });

    // Route: Delete (cancel) an event by its ID
    app.delete("/events/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          res.send({ success: true, message: "Event canceled successfully" });
        } else {
          res.status(404).send({
            success: false,
            message: "Event not found or already deleted",
          });
        }
      } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).send({
          success: false,
          message: "Failed to cancel event",
          error: error.message,
        });
      }
    });

  } catch (error) {
    console.error("MongoDB connection error:", error); // Log MongoDB connection error
    process.exit(1); // Exit the process if unable to connect
  }
}

// Run MongoDB connection and start the server
run().catch(console.dir);

// Default route for health check
app.get("/", (req, res) => {
  res.send("LinkUp Backend is running");
});

// Start the Express server
app.listen(port, () => {
  console.log(`LinkUp Backend is running on port ${port}`);
});
