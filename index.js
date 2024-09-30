const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://linkup-client-21d2b.web.app'],
    credentials: true,
  })
);

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2gatl9i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// JWT Middleware for Authorization
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();

    const database = client.db('LinkUp');
    const usersCollection = database.collection('users');
    const eventsCollection = database.collection('events');

    // JWT Route
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token });
    });

    // User Routes
    app.post('/users', async (req, res) => {
      const user = req.body;
      try {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error creating user', error: error.message });
      }
    });

    app.get('/users', async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching users', error: error.message });
      }
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      try {
        const result = await usersCollection.findOne({ email });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching user by email', error: error.message });
      }
    });

    app.patch('/users/:email', verifyToken, async (req, res) => {
      const data = req.body;
      const email = req.params.email;
      const filter = { email };
      const updateDoc = {
        $set: {
          address: data.address,
          contact_email: data.contact_email,
          organization_name: data.organization_name,
          phone: data.phone,
        },
      };
      try {
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error updating user', error: error.message });
      }
    });

    // Event Routes
    app.post('/events', async (req, res) => {
      const event = req.body;
      try {
        const result = await eventsCollection.insertOne(event);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error creating event', error: error.message });
      }
    });

    app.get('/events', async (req, res) => {
      try {
        const result = await eventsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching events', error: error.message });
      }
    });

    app.get('/events/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await eventsCollection.findOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching event by ID', error: error.message });
      }
    });

    app.delete('/events/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          res.send({ success: true, message: 'Event canceled successfully' });
        } else {
          res.status(404).send({ success: false, message: 'Event not found' });
        }
      } catch (error) {
        res.status(500).send({ success: false, message: 'Error deleting event', error: error.message });
      }
    });

    console.log('MongoDB connection established successfully!');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1); // Exit process if unable to connect
  }
}
run().catch(console.dir);

// Root Route
app.get('/', (req, res) => {
  res.send('Welcome to LinkUp Server');
});

// Start Server
app.listen(port, () => {
  console.log(`The server is listening on port ${port}`);
});
