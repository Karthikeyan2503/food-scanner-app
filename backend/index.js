const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const http = require("http");  // Import http module
const { Server } = require("socket.io");
const Order = require("./model/order");

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow frontend
    methods: ["GET", "POST"],
  },
});

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/Food_Management")
.then(() => {
    console.log("DB connected successfully..")
}).catch(err => console.error("MongoDB connection error:", err));

// Place Order - Save order to MongoDB
app.post("/order", async (req, res) => {
    try {
      const newOrder = new Order(req.body);
      await newOrder.save();
      res.status(201).json({ message: "Order placed successfully!", orderId: newOrder._id });
    } catch (error) {
      console.error("Error placing order:", error);
      res.status(500).json({ message: "Error placing order" });
    }
});

// Get all orders (Admin View)
app.get("/orders", async (req, res) => {
    try {
      const orders = await Order.find();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Error fetching orders" });
    }
});

// Admin updates order status
// app.put("/order/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });

//     if (status === "Accepted") {
//       io.emit("orderAccepted", updatedOrder); // Notify client
//     }

//     res.json({ message: `Order ${status} successfully!`, order: updatedOrder });
//   } catch (error) {
//     console.error("Error updating order:", error);
//     res.status(500).json({ message: "Error updating order" });
//   }
// });
app.put("/order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (status === "Accepted") {
      io.emit("orderAccepted", updatedOrder); // Notify client
    } else if (status === "Completed") {
      io.emit("orderCompleted", updatedOrder); // Notify client to generate bill
    }

    res.json({ message: `Order ${status} successfully!`, order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Error updating order" });
  }
});


// WebSocket connection
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("checkOrderStatus", async (orderId) => {
    try {
      const order = await Order.findById(orderId);
      if (order && order.status === "Accepted") {
        socket.emit("orderAccepted", order);
      }
    } catch (error) {
      console.error("Error checking order status:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Set the port
const PORT = 3001;

// Start the server
server.listen(PORT, () => {  // Use 'server.listen' instead of 'app.listen'
    console.log(`Server is running at http://localhost:${PORT}`);
});
