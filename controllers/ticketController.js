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

    const conversation = await Conversation.findOne({
      phonenumber: ticketID,
    });

    const newConversationList = conversation.conversation.splice(2);
    console.log(newConversationList);

    const updatedCOnversation = await conversation.updateOne({
      $set: {
        transfer: false,
        connected: false      },
    });

    const updatedConversationList = await conversation.replaceOne({
      $set: {
        conversation: newConversationList,
      },
    });

    console.log(updatedCOnversation);
    console.log(updatedConversationList);

    await Ticket.findOneAndDelete({
      ticketID: ticketID,
    });

    res.status(200).json({
      message: "Ticket resolved",
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

module.exports = { getTickets, resolveTicket };
