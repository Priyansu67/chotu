const express = require("express");
const { Configuration, OpenAIApi } = require("openai");
const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const app = express();
app.use(cors());
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", () => {
  console.log("New client connected");
});

dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectDB = require("./connection/connection.js");
connectDB();
const Conversation = require("./models/userConversationSchema.js");
const Ticket = require("./models/ticketSchema.js");
const {
  getTickets,
  resolveTicket,
} = require("./controllers/ticketController.js");

const access_token = process.env.ACCESS_TOKEN;
const myToken = process.env.MY_TOKEN;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const initialMessage = [
  {
    role: "system",
    content: `You are a funny chatbot who always give witty replies.`,
  },
];

const getResponse = async (prompt, from) => {
  //let keywords = ["human", "representative", "live"];

  const conversation = await Conversation.findOne({ phonenumber: from });
  if (!conversation) {
    const newConversation = new Conversation({
      phonenumber: from,
      conversation: [
        ...initialMessage,
        {
          role: "user",
          content: prompt,
        },
      ],
    }); // Create a new conversation
    const response = await openai
      .createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          ...initialMessage,
          {
            role: "user",
            content: prompt,
          },
        ],
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response.status);
          console.log(error.response?.data);
        } else {
          console.log(error.message);
        }
      });
    console.log(response.data.usage["total_tokens"]);
    // Get the response from GPT-3
    newConversation.conversation.push(response.data.choices[0].message); // Push the response from GPT-3
    await newConversation.save(); // Save the conversation
  } else {
    // if (conversation.transfer !== true) {
    conversation.conversation.push({ role: "user", content: prompt }); // First push the user message
    // Remove the _id and other fields from the conversation array
    const messagesArray = conversation.conversation.map(
      ({ role, content }) => ({ role, content })
    );
    const response = await openai
      .createChatCompletion({
        model: "gpt-4",
        messages: messagesArray,
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response.status);
          console.log(error.response?.data);
        } else {
          console.log(error.message);
        }
      });
    console.log(response.data.usage["total_tokens"]);
    // Get the response from GPT-3
    // if (
    //   response.data.choices[0].message.role === "assistant" &&
    //   keywords.some((keyword) =>
    //     response.data.choices[0].message.content.includes(keyword)
    //   ) // Check if the response contains any of the keywords
    // ) {
    //   conversation.conversation.push(response.data.choices[0].message); // Push the response from GPT-3
    //   conversation.transfer = true; // Set the transfer flag to true
    //   await conversation.save(); // Save the conversation
    // } else {
    conversation.conversation.push(response.data.choices[0].message); // Push the response from GPT-3
    await conversation.save(); // Save the conversation
    // }
    // } else {
    //   return;
    // }
  }
};
//Whatsapp Part

app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];
  if (mode && token) {
    if (mode === "subscribe" && token === myToken) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
      console.log("Invalid webhook subscription");
    }
  } else {
    console.log("Missing webhook parameters");
  }
});

const sendMessage = async (phone_number_id, from, reply) => {
  await axios({
    method: "POST",
    url:
      "https://graph.facebook.com/v15.0/" +
      phone_number_id +
      "/messages?access_token=" +
      access_token,
    data: {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply },
    },
    headers: { "Content-Type": "application/json" },
  }).catch((error) => {
    console.log(error);
  });
};

app.post("/webhook", async (req, res) => {
  try {
    let reply = "";
    if (req.body.entry[0].changes[0].value.messages) {
      let { value } = req.body.entry[0].changes[0];
      let { phone_number_id } = value.metadata;
      let { from } = value.messages[0];
      let message = value.messages[0];
      if (message.text) {
        let prompt = message.text.body;
        await getResponse(prompt, from);
        const response = await Conversation.findOne({ phonenumber: from });
        // if (response.transfer === true) {
        //   if (response.connected === true) {
        //     io.emit("messageSent", {
        //       message: prompt,
        //       role: "user",
        //       ticketID: from,
        //     });

        //     const ticket = await Ticket.findOne({ ticketID: from });
        //     ticket.conversation.push({
        //       role: "user",
        //       content: prompt,
        //     });
        //     await ticket.save();
        //   } else {
        //     const ticket = await Ticket.findOne({ ticketID: from });
        //     if (!ticket) {
        //       const newTicket = new Ticket({
        //         ticketID: from,
        //         phone_number_id: phone_number_id,
        //         conversation: [
        //           {
        //             role: "user",
        //             content: prompt,
        //           },
        //         ],
        //       });
        //       await newTicket.save();
        //     }
        //     reply = "Please wait while we transfer you to a human agent.";
        //     sendMessage(phone_number_id, from, reply);
        //   }
        // } else {
        reply = response.conversation[response.conversation.length - 1].content;
        sendMessage(phone_number_id, from, reply);
        // }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//API Part

app.post("/api/sendMessage/:ticketID", async (req, res) => {
  try {
    const { ticketID } = req.params;
    const { content } = req.body;
    const ticket = await Ticket.findOne({ ticketID: ticketID });
    await Conversation.findOneAndUpdate(
      { phonenumber: ticketID },
      { connected: true }
    );
    const phone_number_id = ticket.phone_number_id;
    ticket.conversation.push({
      role: "support",
      content: content,
    });
    await ticket.save();
    sendMessage(phone_number_id, ticketID, content);
    res.status(200).send("Message sent");
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.get("/api/tickets", getTickets);
app.delete("/api/ticket/resolve/:ticketID", resolveTicket);

app.use(express.static("public"));
app.use(express.static("dist"));

app.get("^/$", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

server.listen(6000 || process.env.PORT, () =>
  console.log("Server is running on port " + 6000 || process.env.PORT)
);
