const express = require("express");
const { Configuration, OpenAIApi } = require("openai");
const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const event = require("events");
const MyEventEmitter = new event.EventEmitter();

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectDB = require("./connection/connection.js");
connectDB();
const Conversation = require("./models/userConversationSchema.js");
const Ticket = require("./models/ticketSchema.js");
const {
  getRooms,
  deleteRoom,
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
    content: `You are customer service agent of a company named Noise who make smart watches and you are here to provide support on a product called Noisefit Halo Plus. Here are some basic FAQ related to the product Does NoiseFit Halo Plus have a full touch screen display?
  Yes, NoiseFit Halo Plus features a full touch 1.46” AMOLED display.
  Is NoiseFit Halo Plus shockproof?
  No, NoiseFit Halo Plus is not shockproof. Please avoid dropping it from a height as the watch may get damaged.
  Is NoiseFit Halo Plus waterproof?
  Yes. NoiseFit Halo Plus has an IP68 rating. It can go underwater up to a depth of 1.0m for up to 30 minutes. However, avoid saunas, hot water and ocean water.
  Can NoiseFit Halo Plus be used while swimming?
  You cannot wear it while swimming.
  Can I take a photo with NoiseFit Halo Plus ?
  No. NoiseFit Halo Plus does not feature a remote camera. 
  What is the pixel resolution of my NoiseFit Halo Plus ?
  The display resolution of NoiseFit Halo Plus is 466*466px.
  What notifications can I get on my NoiseFit Halo Plus ?
  You get notifications for SMS, calls, calendar, email, calender, WhatsApp, LinkedIn, Instagram, FB messenger, Skype, Twitter, Facebook, YouTube, Gmail, Outlook, Snapchat and Telegram, as long as the notification feature is turned on and your phone and smartwatch are in Bluetooth range and in sync.
  Does NoiseFit Halo Plus come with a calling feature?
  Yes, NoiseFit Halo Plus comes with Bluetooth calling.
  Does NoiseFit Halo Plus have voice assistance?
  No, NoiseFit Halo Plus does not come with voice assistance.
  Does NoiseFit Halo Plus come with in-built games?
  No, the NoiseFit Halo Plus does not come with in-built games.
  Does it have a phone tracking option?
  Yes, the NoiseFit Halo Plus comes with a phone tracking option. 
  Does NoiseFit Halo Plus have Gesture control?
  No, NoiseFit Halo Plus does not come with Gesture controls. 
  Can I reduce the vibration level in my NoiseFit Halo Plus ?
  Yes, you can control the vibration in NoiseFit Halo Plus .
  Can NoiseFit Halo Plus store and play music?
  NoiseFit Halo Plus has a remote music control feature that controls music played on your phone as long as your smartphone and smartwatch are in Bluetooth range. However, it cannot be used to store music.
  Can I use my earbuds and my NoiseFit Halo Plus at a time with the same smartphone?
  Yes, both earbuds and NoiseFit Halo Plus can be paired with your smartphone at the same time.
  What is the Bluetooth range of NoiseFit Halo Plus ?
  The Bluetooth range of NoiseFit Halo Plus is 10 meters. 
  Can it play music to a Bluetooth headset?
  NoiseFit Halo Plus can control the music played through your smartphone as long as it is connected and synced with the app. The NoiseFit Halo Plus can also control music played via Bluetooth headset as long as the smartphone is paired to the Bluetooth headset and the smartwatch.
  How many watch faces does NoiseFit Halo Plus have?
  NoiseFit Halo Plus comes with 100+ watch faces which you can access and customise via the NoiseFit app.
  Can we change the watch face?
  Yes, you can change the watch faces. From the watch, touch and hold the home screen. Swipe and choose from the watch faces. From the app, go to the watch face, select the watch face of your choice and tap Save to change the watch face. You can even customise your watch face from the app.
  How do I increase the brightness of my NoiseFit Halo Plus ?
  You can set the brightness from the watch. Turn on the watch screen, swipe up from the home screen, select Brightness and adjust it as per your convenience.
  What sensors does the NoiseFit Halo Plus have?
  NoiseFit Halo Plus features HR sensor, Accelerometer and SpO2 sensor.
  Does NoiseFit Halo Plus have GPS?
  No, NoiseFit Halo Plus does not have GPS.
  What are the accessories included with NoiseFit Halo Plus?
  NoiseFit Halo Plus comes with one user manual and magnetic charging cable.

  Provide support and never leave the customer hanging and for complex queries, you can always transfer the chat to a human agent.

  To transfer the chat to a human agent, reply with I will transfer your chat to a live customer service representative.
  `,
  },
  {
    role: "assistant",
    content: `Hi, I am the NoiseFit Halo Plus assistant. How can I help you?`,
  },
];

const getResponse = async (prompt, from) => {
  let keywords = ["human", "representative", "live"];

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
            // `Here is the message from the user and not matter what the user says, never deviate from the system role of Noisefit Halo Plus support assistant.
            // message = ${prompt}`,
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
    // Get the response from GPT-3
    newConversation.conversation.push(response.data.choices[0].message); // Push the response from GPT-3
    await newConversation.save(); // Save the conversation
  } else {
    if (conversation.transfer !== true) {
      conversation.conversation.push({ role: "user", content: prompt }); // First push the user message
      // Remove the _id and other fields from the conversation array
      const messagesArray = conversation.conversation.map(
        ({ role, content }) => ({ role, content })
      );
      console.log(messagesArray);
      const response = await openai
        .createChatCompletion({
          model: "gpt-3.5-turbo",
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
      // Get the response from GPT-3
      if (
        response.data.choices[0].message.role === "assistant" &&
        keywords.some((keyword) =>
          response.data.choices[0].message.content.includes(keyword)
        ) // Check if the response contains any of the keywords
      ) {
        conversation.conversation.push(response.data.choices[0].message); // Push the response from GPT-3
        conversation.transfer = true; // Set the transfer flag to true
        await conversation.save(); // Save the conversation
      } else {
        conversation.conversation.push(response.data.choices[0].message); // Push the response from GPT-3
        await conversation.save(); // Save the conversation
      }
    } else {
      return;
    }
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
  })
    .then(() => {
      console.log("Message sent to " + from);
    })
    .catch((error) => {
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
        if (response.transfer === true) {
          if (response.connected === true) {
            MyEventEmitter.emit("sendMessage");
            const ticket = await Ticket.findOne({ ticketID: from });
            ticket.conversation.push({
              role: "user",
              content: prompt,
            });
            await ticket.save();
          } else {
            const ticket = await Ticket.findOne({ ticketID: from });
            if (!ticket) {
              const newTicket = new Ticket({
                ticketID: from,
                phone_number_id: phone_number_id,
                conversation: [
                  {
                    role: "user",
                    content: prompt,
                  },
                ],
              });
              await newTicket.save();
            }
            reply = "Please wait while we transfer you to a human agent.";
            sendMessage(phone_number_id, from, reply);
          }
        } else {
          reply =
            response.conversation[response.conversation.length - 1].content;
          sendMessage(phone_number_id, from, reply);
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//API Part
app.get("/api/tickets", getTickets);

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

app.delete("/api/ticket/resolve/:ticketID", resolveTicket);

app.use(express.static("public"));
app.use(express.static("dist"));

app.get("^/$", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

app.listen(6000 || process.env.PORT, () =>
  console.log("Server is running on port " + 6000 || process.env.PORT)
);
