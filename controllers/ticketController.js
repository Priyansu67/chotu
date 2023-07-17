const Ticket = require("../models/ticketSchema");
const Conversation = require("../models/userConversationSchema");

const getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find();
    res.status(200).json(tickets);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

const resolveTicket = async (req, res) => {
  try {
    const ticketID = req.params.ticketID;
    await Ticket.findOneAndDelete({
      ticketID: ticketID,
    });
    const update = {
      $set: { transfer: false, connected: false },
      $set: { conversation: { $slice: ["$conversation", 2] } },
    };

    await Conversation.findOneAndUpdate(
      {
        phonenumber: ticketID,
      },
      update
    );

    res.status(200).json({
      message: "Ticket resolved",
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

module.exports = { getTickets, resolveTicket };
