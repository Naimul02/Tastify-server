const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://assignment-11-client-de6fb.web.app",
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.avssyq6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log("uri", uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const cookieOption = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodsCollection = client.db("assignment-11").collection("foods");
    const allFoodsCollection = client
      .db("assignment-11")
      .collection("allFoods");
    const purchaseFoodsCollection = client
      .db("assignment-11")
      .collection("purchase");
    const usersCollection = client.db("assignment-11").collection("users");
    const addFoodCollection = client.db("assignment-11").collection("addFood");
    const galleryCollection = client.db("assignment-11").collection("gallery");

    // app.get("/foods", async (req, res) => {
    //   const foods = foodsCollection.find();
    //   const result = await foods.toArray();
    //   res.send(result);
    // });

    app.get("/foodsAll", async (req, res) => {
      const foodsAll = allFoodsCollection.find();
      const result = await foodsAll.toArray();
      res.send(result);
    });
    app.get("/gallery", verifyToken, async (req, res) => {
      if (req.query.email !== req.user.email) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const gallery = await galleryCollection.find().toArray();
      res.send(gallery);
    });
    app.post("/gallery", async (req, res) => {
      const cursor = req.body;
      const gallery = await galleryCollection.insertOne(cursor);
      res.send(gallery);
    });
    // logout
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log(user);
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });
    app.get("/singleFood/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);

      const query = { _id: new ObjectId(id) };
      const result = await allFoodsCollection.findOne(query);
      res.send(result);
    });
    app.get("/specificFood/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);

      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });
    app.get("/myAddedFood", verifyToken, async (req, res) => {
      if (req.query.email !== req.user.email) {
        return res.status(401).send({ message: "forbidden access" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      // console.log(query);
      const result = await addFoodCollection.find(query).toArray();

      // console.log(result)
      res.send(result);
    });
    app.delete("/myAddedFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addFoodCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/purchaseOrderFood", verifyToken, async (req, res) => {
      if (req.query.email !== req.user.email) {
        return res.status(401).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { buyerEmail: req.query.email };
      }
      console.log(query);
      const result = await purchaseFoodsCollection.find(query).toArray();

      res.send(result);
    });
    app.delete("/purchaseOrderFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await purchaseFoodsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/update/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const result = await addFoodCollection.findOne(filter);
      res.send(result);
    });
    app.post("/purchase", async (req, res) => {
      const purchaseFood = req.body;
      const result = await purchaseFoodsCollection.insertOne(purchaseFood);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.post("/addFood", verifyToken, async (req, res) => {
      if (req.query.email !== req.user.email) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const food = req.body;
      const result = await addFoodCollection.insertOne(food);
      res.send(result);
    });

    //jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1hr",
      });
      res.cookie("token", token, cookieOption).send({ success: true });
    });

    app.patch("/updateQuantity", async (req, res) => {
      const food = req.body;
      console.log(food);
      const id = food[0]._id;
      const filter = { _id: new ObjectId(id) };

      const foodData = await allFoodsCollection.findOne(filter);
      console.log("foodData", foodData);
      const availableQuantity = parseInt(foodData.quantity);
      const count = parseInt(foodData.count);
      const currentQuantity = parseInt(food[1]);
      const updateCount = count + 1;
      

      const quantityUpdate = availableQuantity - currentQuantity;
      const quantityUpdateStr = quantityUpdate.toString();
     

      const updateDoc = {
        $set: {
          quantity: quantityUpdateStr,
          count: updateCount,
        },
      };
      const result = await allFoodsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.put("/myAddedPut/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const updatedFood = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          food_name: updatedFood.food_name,
          description: updatedFood.description,
          email: updatedFood.email,
          food_category: updatedFood.food_category,
          food_origin: updatedFood.food_origin,
          price: updatedFood.price,
          quantity: updatedFood.quantity,
          userName: updatedFood.userName,
        },
      };
      const result = await addFoodCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("The server is running");
});
app.listen(port, () => {
  console.log(`the server is running on ${port}`);
});
